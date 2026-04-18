import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { AppDb } from "@/db/client";
import { activity, day, trip } from "@/db/schema";
import type { CreateTripInputT, UpdateActivityInputT } from "./schemas";

type TripRow = typeof trip.$inferSelect;
type DayRow = typeof day.$inferSelect;
type ActivityRow = typeof activity.$inferSelect;

export type TripWithDays = TripRow & {
  days: (DayRow & { activities: ActivityRow[] })[];
};

export async function createTrip(
  db: AppDb,
  input: CreateTripInputT,
  userId: string
): Promise<{ id: string }> {
  const tripId = randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(trip).values({
      id: tripId,
      userId,
      destination: input.destination,
      summary: input.summary ?? null,
      totalEstimatedCost:
        input.totalEstimatedCost != null
          ? input.totalEstimatedCost.toFixed(2)
          : null,
      imageUrl: input.imageUrl ?? null,
      imageAttribution: input.imageAttribution ?? null,
      destinationLat:
        input.destinationLat != null ? input.destinationLat.toFixed(6) : null,
      destinationLng:
        input.destinationLng != null ? input.destinationLng.toFixed(6) : null,
      destinationPlaceId: input.destinationPlaceId ?? null,
    });

    for (const d of input.days) {
      const dayId = randomUUID();
      await tx.insert(day).values({
        id: dayId,
        tripId,
        dayNumber: d.dayNumber,
      });

      if (d.activities.length === 0) continue;
      await tx.insert(activity).values(
        d.activities.map((a) => ({
          id: randomUUID(),
          dayId,
          name: a.name,
          description: a.description ?? null,
          type: a.type,
          durationMinutes: a.durationMinutes ?? null,
          address: a.address ?? null,
          estimatedCost:
            a.estimatedCost != null ? a.estimatedCost.toFixed(2) : null,
          latitude: a.latitude != null ? a.latitude.toFixed(6) : null,
          longitude: a.longitude != null ? a.longitude.toFixed(6) : null,
          orderIndex: a.orderIndex,
        }))
      );
    }
  });

  return { id: tripId };
}

export async function getTrip(
  db: AppDb,
  id: string
): Promise<TripWithDays | null> {
  const result = await db.query.trip.findFirst({
    where: eq(trip.id, id),
    with: {
      days: {
        orderBy: (d, { asc }) => [asc(d.dayNumber)],
        with: {
          activities: {
            orderBy: (a, { asc }) => [asc(a.orderIndex)],
          },
        },
      },
    },
  });

  return result ?? null;
}

export async function getUserTrips(
  db: AppDb,
  userId: string
): Promise<TripRow[]> {
  return db.query.trip.findMany({
    where: eq(trip.userId, userId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
}

export type UserTripSummary = TripRow & { dayCount: number };

export async function getUserTripSummaries(
  db: AppDb,
  userId: string
): Promise<UserTripSummary[]> {
  const rows = await db.query.trip.findMany({
    where: eq(trip.userId, userId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    with: { days: { columns: { id: true } } },
  });
  return rows.map(({ days, ...t }) => ({ ...t, dayCount: days.length }));
}

export async function updateActivity(
  db: AppDb,
  activityId: string,
  patch: UpdateActivityInputT
): Promise<void> {
  const update: Partial<typeof activity.$inferInsert> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.description !== undefined)
    update.description = patch.description ?? null;
  if (patch.type !== undefined) update.type = patch.type;
  if (patch.durationMinutes !== undefined)
    update.durationMinutes = patch.durationMinutes ?? null;
  if (patch.address !== undefined) update.address = patch.address ?? null;
  if (patch.estimatedCost !== undefined)
    update.estimatedCost =
      patch.estimatedCost != null ? patch.estimatedCost.toFixed(2) : null;
  if (patch.latitude !== undefined)
    update.latitude = patch.latitude != null ? patch.latitude.toFixed(6) : null;
  if (patch.longitude !== undefined)
    update.longitude =
      patch.longitude != null ? patch.longitude.toFixed(6) : null;
  if (patch.orderIndex !== undefined) update.orderIndex = patch.orderIndex;

  if (Object.keys(update).length === 0) return;

  await db.update(activity).set(update).where(eq(activity.id, activityId));
}

export async function deleteTrip(db: AppDb, id: string): Promise<void> {
  await db.delete(trip).where(eq(trip.id, id));
}

export async function deleteTripForUser(
  db: AppDb,
  id: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .delete(trip)
    .where(and(eq(trip.id, id), eq(trip.userId, userId)))
    .returning({ id: trip.id });
  return result.length > 0;
}
