import { describe, expect, it, vi } from "vitest";
import { lookupActivityPlaces } from "../activity-places";
import type { FindPlaceResult } from "../find-place";

function place(overrides: Partial<FindPlaceResult> = {}): FindPlaceResult {
  return {
    latitude: 38.7,
    longitude: -9.1,
    placeId: "ChIJtest",
    photoReference: "photo-ref",
    ...overrides,
  };
}

describe("lookupActivityPlaces", () => {
  it("returns an empty list without calling lookup", async () => {
    const lookup = vi.fn(async () => []);
    await expect(lookupActivityPlaces([], "Lisbon", lookup)).resolves.toEqual(
      []
    );
    expect(lookup).not.toHaveBeenCalled();
  });

  it("uses the address alone when it already contains the destination", async () => {
    const lookup = vi.fn(async (reqs: { query: string }[]) =>
      reqs.map(() => place())
    );
    await lookupActivityPlaces(
      [{ name: "Cafe", address: "Rua A 1, Lisbon" }],
      "Lisbon",
      lookup
    );
    expect(lookup.mock.calls[0][0][0].query).toBe("Rua A 1, Lisbon");
  });

  it("combines name, address, and destination otherwise", async () => {
    const lookup = vi.fn(async (reqs: { query: string }[]) =>
      reqs.map(() => place())
    );
    await lookupActivityPlaces(
      [{ name: "Cafe", address: "Rua A 1" }],
      "Lisbon",
      lookup
    );
    expect(lookup.mock.calls[0][0][0].query).toBe("Cafe, Rua A 1, Lisbon");
  });

  it("falls back to name + destination when address is empty", async () => {
    const lookup = vi.fn(async (reqs: { query: string }[]) =>
      reqs.map(() => place())
    );
    await lookupActivityPlaces(
      [{ name: "Cafe", address: "  " }],
      "Lisbon",
      lookup
    );
    expect(lookup.mock.calls[0][0][0].query).toBe("Cafe, Lisbon");
  });

  it("returns aligned nulls when lookup throws", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const lookup = vi.fn(async () => {
      throw new Error("places_down");
    });
    const result = await lookupActivityPlaces(
      [
        { name: "A", address: "1" },
        { name: "B", address: "2" },
      ],
      "Lisbon",
      lookup
    );
    expect(result).toEqual([null, null]);
    warn.mockRestore();
  });
});
