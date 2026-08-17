import type { TripWithDays } from "../data";
import type { PartialTrip } from "./trip-view";

/**
 * Maps a persisted Trip into the partial-trip shape that TripView consumes.
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
        id: a.id,
        name: a.name,
        description: a.description ?? undefined,
        type: a.type,
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
