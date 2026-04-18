import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { AppDb } from "@/db/client";
import { activity, day, trip, user } from "@/db/schema";
import { type TestDbHandle, useTestDb } from "../../test/db";
import {
  createTrip,
  deleteTrip,
  deleteTripForUser,
  getTrip,
  getUserTrips,
  updateActivity,
} from "./data";
import type { CreateTripInputT } from "./schemas";

function asAppDb(handle: TestDbHandle): AppDb {
  return handle.db as unknown as AppDb;
}

async function seedUser(db: AppDb, id: string, email: string) {
  await db.insert(user).values({ id, name: id, email });
}

function makeInput(overrides: Partial<CreateTripInputT> = {}): CreateTripInputT {
  return {
    destination: "Lisbon",
    summary: "three days of sardines",
    totalEstimatedCost: 500,
    imageUrl: "https://images.test/lisbon.jpg",
    imageAttribution: "Test/Unsplash",
    days: [
      {
        dayNumber: 1,
        activities: [
          { name: "Tram 28", type: "sightseeing", orderIndex: 0, estimatedCost: 3 },
          { name: "Pasteis de Belem", type: "food", orderIndex: 1, estimatedCost: 10 },
        ],
      },
      {
        dayNumber: 2,
        activities: [
          { name: "Sintra day trip", type: "sightseeing", orderIndex: 0 },
        ],
      },
    ],
    ...overrides,
  };
}

describe("trip data layer", () => {
  let handle: TestDbHandle;
  let db: AppDb;

  beforeEach(async () => {
    handle = await useTestDb();
    db = asAppDb(handle);
    await seedUser(db, "u1", "u1@example.com");
    await seedUser(db, "u2", "u2@example.com");
  });

  describe("createTrip", () => {
    it("writes trip + days + activities atomically", async () => {
      const { id } = await createTrip(db, makeInput(), "u1");

      const got = await getTrip(db, id);
      expect(got).not.toBeNull();
      expect(got?.destination).toBe("Lisbon");
      expect(got?.days).toHaveLength(2);
      expect(got?.days[0].dayNumber).toBe(1);
      expect(got?.days[0].activities).toHaveLength(2);
      expect(got?.days[0].activities[0].name).toBe("Tram 28");
      expect(got?.days[0].activities[0].orderIndex).toBe(0);
      expect(got?.days[1].activities).toHaveLength(1);
    });

    it("rolls back entirely if any insert fails (atomicity)", async () => {
      const bad = makeInput({
        days: [
          {
            dayNumber: 1,
            activities: [
              { name: "a", type: "food", orderIndex: 0 },
              { name: "b", type: "food", orderIndex: 0 },
            ],
          },
        ],
      });

      await expect(createTrip(db, bad, "u1")).rejects.toThrow();

      expect(await db.select().from(trip)).toHaveLength(0);
      expect(await db.select().from(day)).toHaveLength(0);
      expect(await db.select().from(activity)).toHaveLength(0);
    });

    it("rolls back if userId references a non-existent user", async () => {
      await expect(createTrip(db, makeInput(), "nope")).rejects.toThrow();
      expect(await db.select().from(trip)).toHaveLength(0);
    });
  });

  describe("getTrip", () => {
    it("returns null when the trip does not exist", async () => {
      expect(await getTrip(db, "missing")).toBeNull();
    });

    it("orders days and activities ascending", async () => {
      const { id } = await createTrip(
        db,
        makeInput({
          days: [
            {
              dayNumber: 2,
              activities: [{ name: "late", type: "food", orderIndex: 1 }],
            },
            {
              dayNumber: 1,
              activities: [
                { name: "second", type: "food", orderIndex: 1 },
                { name: "first", type: "food", orderIndex: 0 },
              ],
            },
          ],
        }),
        "u1",
      );

      const got = await getTrip(db, id);
      expect(got?.days.map((d) => d.dayNumber)).toEqual([1, 2]);
      expect(got?.days[0].activities.map((a) => a.orderIndex)).toEqual([0, 1]);
      expect(got?.days[0].activities[0].name).toBe("first");
    });
  });

  describe("getUserTrips", () => {
    it("returns only the requested user's trips", async () => {
      await createTrip(db, makeInput({ destination: "Lisbon" }), "u1");
      await createTrip(db, makeInput({ destination: "Porto" }), "u1");
      await createTrip(db, makeInput({ destination: "Madrid" }), "u2");

      const u1 = await getUserTrips(db, "u1");
      const u2 = await getUserTrips(db, "u2");

      expect(u1.map((t) => t.destination).sort()).toEqual(["Lisbon", "Porto"]);
      expect(u2.map((t) => t.destination)).toEqual(["Madrid"]);
    });
  });

  describe("updateActivity", () => {
    it("applies a partial update without touching unspecified fields", async () => {
      const { id } = await createTrip(db, makeInput(), "u1");
      const got = await getTrip(db, id);
      const target = got!.days[0].activities[0];

      await updateActivity(db, target.id, {
        name: "Tram 28 (renamed)",
        estimatedCost: 4.5,
      });

      const [after] = await db
        .select()
        .from(activity)
        .where(eq(activity.id, target.id));
      expect(after.name).toBe("Tram 28 (renamed)");
      expect(after.estimatedCost).toBe("4.50");
      expect(after.type).toBe(target.type);
      expect(after.orderIndex).toBe(target.orderIndex);
    });

    it("is a no-op when the patch is empty", async () => {
      const { id } = await createTrip(db, makeInput(), "u1");
      const got = await getTrip(db, id);
      const target = got!.days[0].activities[0];

      await updateActivity(db, target.id, {});

      const [after] = await db
        .select()
        .from(activity)
        .where(eq(activity.id, target.id));
      expect(after.name).toBe(target.name);
    });
  });

  describe("deleteTrip", () => {
    it("cascades to days and activities", async () => {
      const { id } = await createTrip(db, makeInput(), "u1");

      await deleteTrip(db, id);

      expect(await db.select().from(trip)).toHaveLength(0);
      expect(await db.select().from(day)).toHaveLength(0);
      expect(await db.select().from(activity)).toHaveLength(0);
    });
  });

  describe("deleteTripForUser", () => {
    it("deletes when the trip belongs to the user", async () => {
      const { id } = await createTrip(db, makeInput(), "u1");
      expect(await deleteTripForUser(db, id, "u1")).toBe(true);
      expect(await getTrip(db, id)).toBeNull();
    });

    it("does not delete another user's trip", async () => {
      const { id } = await createTrip(db, makeInput(), "u1");
      expect(await deleteTripForUser(db, id, "u2")).toBe(false);
      expect(await getTrip(db, id)).not.toBeNull();
    });
  });
});
