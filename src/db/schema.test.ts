import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { activity, day, trip, user } from "@/db/schema";
import { createTestDb } from "../test/db";

describe("trip schema", () => {
  it("cascades deletes: user → trip → day → activity", async () => {
    const { db } = await createTestDb();

    await db.insert(user).values({
      id: "u1",
      name: "Ada",
      email: "ada@example.com",
    });
    await db.insert(trip).values({
      id: "t1",
      userId: "u1",
      destination: "Lisbon",
    });
    await db.insert(day).values({ id: "d1", tripId: "t1", dayNumber: 1 });
    await db.insert(activity).values({
      id: "a1",
      dayId: "d1",
      name: "Tram 28",
      type: "sightseeing",
      orderIndex: 0,
    });

    await db.delete(user).where(eq(user.id, "u1"));

    expect(await db.select().from(trip)).toHaveLength(0);
    expect(await db.select().from(day)).toHaveLength(0);
    expect(await db.select().from(activity)).toHaveLength(0);
  });

  it("enforces unique (tripId, dayNumber)", async () => {
    const { db } = await createTestDb();
    await db.insert(user).values({ id: "u1", name: "A", email: "a@b.c" });
    await db.insert(trip).values({ id: "t1", userId: "u1", destination: "X" });
    await db.insert(day).values({ id: "d1", tripId: "t1", dayNumber: 1 });

    await expect(
      db.insert(day).values({ id: "d2", tripId: "t1", dayNumber: 1 }),
    ).rejects.toThrow();
  });

  it("enforces unique (dayId, orderIndex)", async () => {
    const { db } = await createTestDb();
    await db.insert(user).values({ id: "u1", name: "A", email: "a@b.c" });
    await db.insert(trip).values({ id: "t1", userId: "u1", destination: "X" });
    await db.insert(day).values({ id: "d1", tripId: "t1", dayNumber: 1 });
    await db.insert(activity).values({
      id: "a1",
      dayId: "d1",
      name: "one",
      type: "food",
      orderIndex: 0,
    });

    await expect(
      db.insert(activity).values({
        id: "a2",
        dayId: "d1",
        name: "two",
        type: "food",
        orderIndex: 0,
      }),
    ).rejects.toThrow();
  });
});
