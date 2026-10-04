// Deno-compatible copy of src/lib/matchScoring.ts
// Supabase Edge Functions deploy independently of the Vite bundle and cannot
// import directly from `src/`, so this logic is intentionally duplicated.
// Keep in sync with src/lib/matchScoring.ts if the scoring rules change.
// (Covered by unit tests at src/test/matchScoring.test.ts, which test the
// canonical copy — the two are kept identical by convention.)

export interface ResidueListingLike {
  id: string;
  crop_type: string;
  quantity: number;
  quality_grade: "A" | "B" | "C" | null;
  adjusted_price_per_ton: number;
  lat: number | null;
  lng: number | null;
  status: string;
}

export interface MatchCriteria {
  cropType?: string;
  minQuantity?: number;
  maxDistanceKm?: number;
  industryLat?: number;
  industryLng?: number;
}

export interface ScoredMatch {
  listing: ResidueListingLike;
  distanceKm: number | null;
  score: number;
  reason: string;
}

const GRADE_WEIGHT: Record<string, number> = { A: 1, B: 0.7, C: 0.4 };

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function scoreListing(
  listing: ResidueListingLike,
  criteria: MatchCriteria,
): ScoredMatch | null {
  if (listing.status !== "available") return null;

  if (
    criteria.cropType &&
    listing.crop_type.toLowerCase() !== criteria.cropType.toLowerCase()
  ) {
    return null;
  }

  let distanceKm: number | null = null;
  if (
    criteria.industryLat !== undefined &&
    criteria.industryLng !== undefined &&
    listing.lat !== null &&
    listing.lng !== null
  ) {
    distanceKm = calculateDistance(
      criteria.industryLat,
      criteria.industryLng,
      listing.lat,
      listing.lng,
    );
    if (
      criteria.maxDistanceKm !== undefined &&
      distanceKm > criteria.maxDistanceKm
    ) {
      return null;
    }
  }

  const gradeScore = listing.quality_grade
    ? GRADE_WEIGHT[listing.quality_grade] ?? 0.5
    : 0.5;

  const quantityScore = criteria.minQuantity
    ? Math.min(1, listing.quantity / criteria.minQuantity)
    : 1;

  const maxDist = criteria.maxDistanceKm ?? 100;
  const proximityScore =
    distanceKm === null ? 0.5 : Math.max(0, 1 - distanceKm / maxDist);

  const score = gradeScore * 0.4 + quantityScore * 0.35 + proximityScore * 0.25;

  const reasonParts: string[] = [];
  reasonParts.push(`${listing.quantity}t of ${listing.crop_type}`);
  if (listing.quality_grade) reasonParts.push(`grade ${listing.quality_grade} quality`);
  if (distanceKm !== null) reasonParts.push(`${distanceKm}km away`);
  if (criteria.minQuantity && listing.quantity < criteria.minQuantity) {
    reasonParts.push(
      `below your ${criteria.minQuantity}t requirement, consider combining with another listing`,
    );
  }

  return {
    listing,
    distanceKm,
    score: Math.round(score * 100) / 100,
    reason: reasonParts.join(", "),
  };
}

export function rankListings(
  listings: ResidueListingLike[],
  criteria: MatchCriteria,
  limit = 5,
): ScoredMatch[] {
  return listings
    .map((listing) => scoreListing(listing, criteria))
    .filter((m): m is ScoredMatch => m !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
