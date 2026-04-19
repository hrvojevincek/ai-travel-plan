import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { AppDb } from "@/db/client";
import { generationCache } from "@/db/schema";
import { type TestDbHandle, useTestDb } from "../../test/db";
import { buildCacheKey, readCache, writeCache } from "./cache";
import type { GeneratedTripResponseT } from "./generate";

function asAppDb(handle: TestDbHandle): AppDb {
  return handle.db as unknown as AppDb;
}

function makeResponse(
  overrides: Partial<GeneratedTripResponseT> = {}
): GeneratedTripResponseT {
  const day = {
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
      latitude: 38.7 + i * 0.001,
      longitude: -9.14 + i * 0.001,
    })),
  };
  return {
    destination: "Lisbon",
    summary: "short trip",
    totalEstimatedCost: 100,
    days: [day],
    ...overrides,
  };
}

describe("buildCacheKey", () => {
  it("normalizes case and whitespace in destination and preferences", () => {
    const a = buildCacheKey({
      destination: "  Lisbon,  Portugal ",
      duration: 3,
      preferences: "VEGAN , no museums ",
    });
    const b = buildCacheKey({
      destination: "lisbon, portugal",
      duration: 3,
      preferences: "vegan , no museums",
    });
    expect(a.id).toBe(b.id);
    expect(a.destinationKey).toBe("lisbon, portugal");
    expect(a.preferencesKey).toBe("vegan , no museums");
  });

  it("treats missing vs empty preferences the same", () => {
    const a = buildCacheKey({ destination: "Porto", duration: 2 });
    const b = buildCacheKey({
      destination: "Porto",
      duration: 2,
      preferences: "",
    });
    expect(a.id).toBe(b.id);
    expect(a.preferencesKey).toBe("");
  });

  it("produces different ids for different durations", () => {
    const a = buildCacheKey({ destination: "Porto", duration: 2 });
    const b = buildCacheKey({ destination: "Porto", duration: 3 });
    expect(a.id).not.toBe(b.id);
  });

  it("produces different ids for different preferences", () => {
    const a = buildCacheKey({
      destination: "Porto",
      duration: 2,
      preferences: "vegan",
    });
    const b = buildCacheKey({
      destination: "Porto",
      duration: 2,
      preferences: "vegetarian",
    });
    expect(a.id).not.toBe(b.id);
  });
});

describe("readCache / writeCache", () => {
  it("returns null on miss", async () => {
    const h = await useTestDb();
    const hit = await readCache(asAppDb(h), {
      destination: "Porto",
      duration: 2,
    });
    expect(hit).toBeNull();
  });

  it("returns the stored response on hit and bumps last_used_at + hit_count", async () => {
    const h = await useTestDb();
    const db = asAppDb(h);
    const input = { destination: "Lisbon", duration: 3 };
    const stored = makeResponse();

    await writeCache(db, input, stored);
    const key = buildCacheKey(input);
    const before = await db
      .select()
      .from(generationCache)
      .where(eq(generationCache.id, key.id));
    expect(before[0].hitCount).toBe(1);
    const lastUsedBefore = before[0].lastUsedAt;

    // Ensure measurable time passes so updatedAt comparison is meaningful.
    await new Promise((r) => setTimeout(r, 5));

    const hit = await readCache(db, input);
    expect(hit).not.toBeNull();
    expect(hit?.destination).toBe("Lisbon");
    expect(hit?.days[0].activities[0].latitude).toBeCloseTo(38.7);

    const after = await db
      .select()
      .from(generationCache)
      .where(eq(generationCache.id, key.id));
    expect(after[0].hitCount).toBe(2);
    expect(after[0].lastUsedAt.getTime()).toBeGreaterThanOrEqual(
      lastUsedBefore.getTime()
    );
  });

  it("differentiates preferences variants as separate cache rows", async () => {
    const h = await useTestDb();
    const db = asAppDb(h);
    await writeCache(
      db,
      { destination: "Porto", duration: 2 },
      makeResponse({ destination: "Porto" })
    );
    await writeCache(
      db,
      { destination: "Porto", duration: 2, preferences: "vegan" },
      makeResponse({ destination: "Porto", summary: "vegan trip" })
    );

    const plain = await readCache(db, {
      destination: "Porto",
      duration: 2,
    });
    const vegan = await readCache(db, {
      destination: "Porto",
      duration: 2,
      preferences: "vegan",
    });
    expect(plain?.summary).toBe("short trip");
    expect(vegan?.summary).toBe("vegan trip");
  });

  it("writeCache is idempotent on repeated inserts of the same key", async () => {
    const h = await useTestDb();
    const db = asAppDb(h);
    const input = { destination: "Lisbon", duration: 3 };
    await writeCache(db, input, makeResponse());
    await writeCache(
      db,
      input,
      makeResponse({ summary: "different summary — should be ignored" })
    );

    const rows = await db.select().from(generationCache);
    expect(rows).toHaveLength(1);
    expect((rows[0].response as GeneratedTripResponseT).summary).toBe(
      "short trip"
    );
  });
});
