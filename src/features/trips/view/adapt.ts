import type { TripWithDays } from "../data";
import type { GeneratedActivityTypeT } from "../generate";
import type { PartialTrip } from "./trip-view";

const ACTIVITIES_PER_DAY = 7;

/**
 * Maps a persisted Trip (with its days + activities) into the partial-trip
 * shape that TripView consumes. The generator guarantees a fixed slot order
 * (0=breakfast, 3=lunch, 6=dinner, else activity), so we use orderIndex to
 * infer the UI category — the DB enum only stores `food`/`other`.
 */
export function tripRowToPartial(row: TripWithDays): PartialTrip {
  return {
    destination: row.destination,
    summary: row.summary ?? undefined,
    totalEstimatedCost:
      row.totalEstimatedCost != null
        ? Number(row.totalEstimatedCost)
        : undefined,
    days: row.days.map((d) => ({
      dayNumber: d.dayNumber,
      activities: d.activities.map((a) => ({
        name: a.name,
        description: a.description ?? undefined,
        type: mealTypeForIndex(a.orderIndex),
        durationMinutes: a.durationMinutes ?? undefined,
        address: a.address ?? undefined,
        estimatedCost:
          a.estimatedCost != null ? Number(a.estimatedCost) : undefined,
        latitude: a.latitude != null ? Number(a.latitude) : null,
        longitude: a.longitude != null ? Number(a.longitude) : null,
        placeId: a.placeId ?? null,
        photoReference: a.photoReference ?? null,
      })),
    })),
  };
}

function mealTypeForIndex(i: number): GeneratedActivityTypeT {
  const slot = i % ACTIVITIES_PER_DAY;
  if (slot === 0) return "breakfast";
  if (slot === 3) return "lunch";
  if (slot === 6) return "dinner";
  return "activity";
}
