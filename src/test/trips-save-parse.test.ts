import { describe, expect, it } from "vitest";
import {
  type GeneratedTripResponseT,
  parseTripForSave,
} from "@/features/trips/generate-schema";
import { mockTrip } from "@/features/trips/mock";

function groundedTrip(
  coords: { latitude: number | null; longitude: number | null } = {
    latitude: 38.7,
    longitude: -9.14,
  }
): GeneratedTripResponseT {
  return {
    destination: "Lisbon",
    summary: "A short hop through Lisbon's classics.",
    totalEstimatedCost: 100,
    days: [
      {
        dayNumber: 1,
        activities: Array.from({ length: 7 }, (_, i) => ({
          name: `act-${i}`,
          description: "d",
          type:
            i === 0
              ? ("breakfast" as const)
              : i === 3
                ? ("lunch" as const)
                : i === 6
                  ? ("dinner" as const)
                  : ("activity" as const),
          durationMinutes: 60,
          address: "x",
          estimatedCost: 10,
          latitude: coords.latitude,
          longitude: coords.longitude,
          placeId: coords.latitude == null ? null : "ChIJ",
          photoReference: null,
        })),
      },
    ],
  };
}

describe("parseTripForSave", () => {
  it("treats a mock Trip with no coord keys as ungrounded", () => {
    const result = parseTripForSave(mockTrip);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.kind).toBe("ungrounded");
    expect("latitude" in result.trip.days[0].activities[0]).toBe(false);
  });

  it("treats pin keys as grounded, including JSON-round-tripped nulls", () => {
    const withNulls = groundedTrip({ latitude: null, longitude: null });
    expect(parseTripForSave(withNulls)).toMatchObject({
      ok: true,
      kind: "grounded",
    });
    expect(parseTripForSave(groundedTrip())).toMatchObject({
      ok: true,
      kind: "grounded",
    });
    expect(
      parseTripForSave(JSON.parse(JSON.stringify(withNulls)))
    ).toMatchObject({ ok: true, kind: "grounded" });
  });

  it("rejects a payload that is neither a Trip nor a grounded Trip", () => {
    expect(parseTripForSave({ destination: "Lisbon" }).ok).toBe(false);
  });
});
