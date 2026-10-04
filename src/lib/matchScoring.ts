import { calculateDistance } from "@/data/mockData";

/**
 * Pure matching/ranking logic for the AI Match Assistant.
 *
 * This module is intentionally framework-free and side-effect-free so it can
 * be unit tested in isolation (see src/test/matchScoring.test.ts) without
 * needing a Supabase connection, a Deno runtime, or a mocked LLM call.
 *
 * The Supabase Edge Function (supabase/functions/ai-match-assistant/matching.ts)
 * contains a Deno-compatible copy of this same scoring logic, since Edge
 * Functions deploy independently of the Vite/React bundle and cannot import
 * directly from `src/`. Keep the two files in sync if the scoring rules change.
 */

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

/**
 * Scores a single listing against the requester's criteria.
 * Score is a 0-1 composite of: crop match, quantity sufficiency,
 * quality grade, and proximity (closer is better, capped at maxDistanceKm).
 * Returns null if the listing is disqualified (wrong crop, unavailable,
 * or outside the distance cap).
 */
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

  const score =
    gradeScore * 0.4 + quantityScore * 0.35 + proximityScore * 0.25;

  const reasonParts: string[] = [];
  reasonParts.push(`${listing.quantity}t of ${listing.crop_type}`);
  if (listing.quality_grade) {
    reasonParts.push(`grade ${listing.quality_grade} quality`);
  }
  if (distanceKm !== null) {
    reasonParts.push(`${distanceKm}km away`);
  }
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

/**
 * Scores and ranks a list of listings, best match first.
 */
export function rankListings(
  listings: ResidueListingLike[],
  criteria: MatchCriteria,
  limit = 5,
): ScoredMatch[] {
  return listings
    .map((listing) => scoreListing(listing, criteria))
    .filter((match): match is ScoredMatch => match !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
