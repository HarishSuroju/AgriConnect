import { describe, it, expect } from "vitest";
import {
  scoreListing,
  rankListings,
  type ResidueListingLike,
} from "@/lib/matchScoring";

function makeListing(
  overrides: Partial<ResidueListingLike> = {},
): ResidueListingLike {
  return {
    id: "listing-1",
    crop_type: "Paddy",
    quantity: 10,
    quality_grade: "A",
    adjusted_price_per_ton: 1800,
    lat: 28.9845,
    lng: 77.7064,
    status: "available",
    ...overrides,
  };
}

describe("scoreListing", () => {
  it("disqualifies listings that are not available", () => {
    const listing = makeListing({ status: "sold" });
    expect(scoreListing(listing, {})).toBeNull();
  });

  it("disqualifies listings with a different crop type than requested", () => {
    const listing = makeListing({ crop_type: "Wheat" });
    expect(scoreListing(listing, { cropType: "Paddy" })).toBeNull();
  });

  it("matches crop type case-insensitively", () => {
    const listing = makeListing({ crop_type: "paddy" });
    expect(scoreListing(listing, { cropType: "PADDY" })).not.toBeNull();
  });

  it("disqualifies listings outside the requested max distance", () => {
    const listing = makeListing({ lat: 28.9845, lng: 77.7064 });
    const match = scoreListing(listing, {
      industryLat: 30.9, // ~230km away
      industryLng: 75.85,
      maxDistanceKm: 50,
    });
    expect(match).toBeNull();
  });

  it("includes listings within the requested max distance", () => {
    const listing = makeListing({ lat: 28.9845, lng: 77.7064 });
    const match = scoreListing(listing, {
      industryLat: 28.95, // a few km away
      industryLng: 77.7,
      maxDistanceKm: 50,
    });
    expect(match).not.toBeNull();
    expect(match?.distanceKm).toBeGreaterThanOrEqual(0);
  });

  it("gives grade A a higher score than grade C, all else equal", () => {
    const gradeA = scoreListing(makeListing({ quality_grade: "A" }), {});
    const gradeC = scoreListing(makeListing({ quality_grade: "C" }), {});
    expect(gradeA!.score).toBeGreaterThan(gradeC!.score);
  });

  it("scores a listing below the requested quantity lower than one that meets it", () => {
    const small = scoreListing(makeListing({ quantity: 2 }), {
      minQuantity: 10,
    });
    const sufficient = scoreListing(makeListing({ quantity: 10 }), {
      minQuantity: 10,
    });
    expect(sufficient!.score).toBeGreaterThan(small!.score);
  });

  it("notes in the reason when a listing falls short of the requested quantity", () => {
    const match = scoreListing(makeListing({ quantity: 3 }), {
      minQuantity: 10,
    });
    expect(match?.reason).toMatch(/below your 10t requirement/i);
  });

  it("does not error when lat/lng are missing on the listing", () => {
    const listing = makeListing({ lat: null, lng: null });
    const match = scoreListing(listing, {
      industryLat: 28.9,
      industryLng: 77.7,
    });
    expect(match).not.toBeNull();
    expect(match?.distanceKm).toBeNull();
  });
});

describe("rankListings", () => {
  it("returns the best matches first", () => {
    const listings = [
      makeListing({ id: "low", quality_grade: "C", quantity: 2 }),
      makeListing({ id: "high", quality_grade: "A", quantity: 20 }),
      makeListing({ id: "mid", quality_grade: "B", quantity: 10 }),
    ];

    const ranked = rankListings(listings, { minQuantity: 10 });

    expect(ranked.map((m) => m.listing.id)).toEqual(["high", "mid", "low"]);
  });

  it("filters out disqualified listings entirely", () => {
    const listings = [
      makeListing({ id: "wrong-crop", crop_type: "Sugarcane" }),
      makeListing({ id: "right-crop", crop_type: "Paddy" }),
    ];

    const ranked = rankListings(listings, { cropType: "Paddy" });

    expect(ranked).toHaveLength(1);
    expect(ranked[0].listing.id).toBe("right-crop");
  });

  it("respects the limit parameter", () => {
    const listings = Array.from({ length: 10 }, (_, i) =>
      makeListing({ id: `listing-${i}` }),
    );

    const ranked = rankListings(listings, {}, 3);

    expect(ranked).toHaveLength(3);
  });

  it("returns an empty array when nothing qualifies", () => {
    const listings = [makeListing({ status: "sold" })];
    expect(rankListings(listings, {})).toEqual([]);
  });
});
