import type {
  LanguageModelV3CallOptions,
  LanguageModelV3GenerateResult,
} from "@ai-sdk/provider";
import { MockLanguageModelV3 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AppDb } from "@/db/client";
import { user } from "@/db/schema";
import type { ActivityPlaceLookup } from "@/features/trips/activity-places";
import { createTrip, getTrip, updateActivity } from "@/features/trips/data";
import type { FindPlaceResult } from "@/features/trips/find-place";
import type { CreateTripInputT } from "@/features/trips/schemas";
import { type SwapActivityOutputT, swapActivity } from "@/features/trips/swap";
import { mockObjectModel } from "@/test/helpers/ai";
import { type TestDbHandle, useTestDb } from "@/test/helpers/db";

function asAppDb(h: TestDbHandle): AppDb {
  return h.db as unknown as AppDb;
}

async function seed(db: AppDb): Promise<string> {
  await db.insert(user).values({ id: "u1", name: "A", email: "a@b.c" });
  const input: CreateTripInputT = {
    destination: "Lisbon",
    summary: "sardines",
    totalEstimatedCost: 200,
    imageUrl: null,
    imageAttribution: null,
    days: [
      {
        dayNumber: 1,
        activities: [
          {
            name: "Old Cafe",
            type: "breakfast",
            orderIndex: 0,
            estimatedCost: 10,
          },
          { name: "Jeronimos Monastery", type: "activity", orderIndex: 1 },
          { name: "MAAT", type: "activity", orderIndex: 2 },
          {
            name: "Cervejaria Ramiro",
            type: "lunch",
            orderIndex: 3,
            estimatedCost: 35,
          },
          { name: "Alfama walk", type: "activity", orderIndex: 4 },
          { name: "Tram 28", type: "activity", orderIndex: 5 },
          {
            name: "Tasca Dinner",
            type: "dinner",
            orderIndex: 6,
            estimatedCost: 25,
          },
        ],
      },
    ],
  };
  const { id } = await createTrip(db, input, "u1");
  return id;
}

const REPLACEMENT_FOOD: SwapActivityOutputT = {
  name: "Pasteis de Belem",
  description: "Iconic custard tart bakery.",
  type: "breakfast",
  durationMinutes: 45,
  address: "R. de Belem 84, Lisboa",
  estimatedCost: 8,
};

const REPLACEMENT_SIGHT: SwapActivityOutputT = {
  ...REPLACEMENT_FOOD,
  name: "Miradouro da Graca",
  type: "activity",
};

const REPLACEMENT_REPAIR: SwapActivityOutputT = {
  ...REPLACEMENT_FOOD,
  name: "Fabrica da Nata",
  address: "Rua das Portas de Santo Antao 15, Lisboa",
};

const PASTEIS_PLACE: FindPlaceResult = {
  latitude: 38.6976,
  longitude: -9.2034,
  placeId: "ChIJpasteis",
  photoReference: "photo-belem",
};

const NATA_PLACE: FindPlaceResult = {
  latitude: 38.7169,
  longitude: -9.139,
  placeId: "ChIJnata",
  photoReference: "photo-nata",
};

function lookupReturning(
  ...results: Array<FindPlaceResult | null>
): ActivityPlaceLookup {
  let i = 0;
  return async () => [results[Math.min(i++, results.length - 1)] ?? null];
}

function mockObjectSequence<T>(values: T[]): MockLanguageModelV3 {
  let call = 0;
  return new MockLanguageModelV3({
    doGenerate: async (
      _opts: LanguageModelV3CallOptions
    ): Promise<LanguageModelV3GenerateResult> => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(values[Math.min(call++, values.length - 1)]),
        },
      ],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: {
          total: 1,
          noCache: 1,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: { total: 1, text: 1, reasoning: undefined },
      },
      warnings: [],
    }),
  });
}

describe("swapActivity", () => {
  let handle: TestDbHandle;
  let db: AppDb;
  let tripId: string;
  let previousMapsKey: string | undefined;

  beforeEach(async () => {
    previousMapsKey = process.env.GOOGLE_MAPS_SERVER_KEY;
    delete process.env.GOOGLE_MAPS_SERVER_KEY;
    handle = await useTestDb();
    db = asAppDb(handle);
    tripId = await seed(db);
  });

  afterEach(() => {
    if (previousMapsKey === undefined) {
      delete process.env.GOOGLE_MAPS_SERVER_KEY;
    } else {
      process.env.GOOGLE_MAPS_SERVER_KEY = previousMapsKey;
    }
  });

  it("returns a schema-matching activity when the model emits a valid fixture", async () => {
    const trip = (await getTrip(db, tripId))!;
    const target = trip.days[0].activities[0];

    const result = await swapActivity(db, tripId, target.id, {
      model: mockObjectModel(REPLACEMENT_FOOD),
    });

    expect(result.name).toBe("Pasteis de Belem");
    expect(result.type).toBe("breakfast");
    expect(result.durationMinutes).toBe(45);
    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
    expect(result.placeId).toBeNull();
    expect(result.photoReference).toBeNull();
  });

  it("attaches place metadata when lookup hits", async () => {
    const trip = (await getTrip(db, tripId))!;
    const target = trip.days[0].activities[0];
    const model = mockObjectModel(REPLACEMENT_FOOD);

    const result = await swapActivity(db, tripId, target.id, {
      model,
      lookupPlaces: lookupReturning(PASTEIS_PLACE),
    });

    expect(result.name).toBe("Pasteis de Belem");
    expect(result.latitude).toBe(38.6976);
    expect(result.longitude).toBe(-9.2034);
    expect(result.placeId).toBe("ChIJpasteis");
    expect(result.photoReference).toBe("photo-belem");
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  it("replaces an unfindable suggestion and attaches the repaired pin", async () => {
    const trip = (await getTrip(db, tripId))!;
    const target = trip.days[0].activities[0];
    const model = mockObjectSequence([REPLACEMENT_FOOD, REPLACEMENT_REPAIR]);

    const result = await swapActivity(db, tripId, target.id, {
      model,
      lookupPlaces: lookupReturning(null, NATA_PLACE),
    });

    expect(result.name).toBe("Fabrica da Nata");
    expect(result.placeId).toBe("ChIJnata");
    expect(result.latitude).toBe(38.7169);
    expect(model.doGenerateCalls).toHaveLength(2);
    const repairPrompt = JSON.stringify(model.doGenerateCalls[1]);
    expect(repairPrompt).toContain("Pasteis de Belem");
    expect(repairPrompt).toContain("could not be found");
  });

  it("returns the repaired suggestion without a pin when lookup misses twice", async () => {
    const trip = (await getTrip(db, tripId))!;
    const target = trip.days[0].activities[0];
    const model = mockObjectSequence([REPLACEMENT_FOOD, REPLACEMENT_REPAIR]);

    const result = await swapActivity(db, tripId, target.id, {
      model,
      lookupPlaces: lookupReturning(null, null),
    });

    expect(result.name).toBe("Fabrica da Nata");
    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
    expect(result.placeId).toBeNull();
    expect(result.photoReference).toBeNull();
    expect(model.doGenerateCalls).toHaveLength(2);
  });

  it("rejects when the model tries to change the type (slot preservation)", async () => {
    const trip = (await getTrip(db, tripId))!;
    const target = trip.days[0].activities[0];

    await expect(
      swapActivity(db, tripId, target.id, {
        model: mockObjectModel({ ...REPLACEMENT_FOOD, type: "activity" }),
      })
    ).rejects.toThrow();
  });

  it("passes sibling names into the prompt so the AI can avoid duplicates", async () => {
    const trip = (await getTrip(db, tripId))!;
    const target = trip.days[0].activities[1];

    const model = mockObjectModel(REPLACEMENT_SIGHT);
    await swapActivity(db, tripId, target.id, { model });

    const serialized = JSON.stringify(model.doGenerateCalls[0]);
    expect(serialized).toContain("Jeronimos Monastery");
    expect(serialized).toContain("MAAT");
    expect(serialized).toContain("Tram 28");
    expect(serialized).toContain("Alfama walk");
  });

  it("throws when the trip does not exist", async () => {
    await expect(
      swapActivity(db, "missing", "also-missing", {
        model: mockObjectModel(REPLACEMENT_FOOD),
      })
    ).rejects.toThrow(/trip missing not found/);
  });

  it("throws when the activity does not belong to the trip", async () => {
    await expect(
      swapActivity(db, tripId, "no-such-activity", {
        model: mockObjectModel(REPLACEMENT_FOOD),
      })
    ).rejects.toThrow(/no-such-activity/);
  });

  it("propagates provider errors", async () => {
    const trip = (await getTrip(db, tripId))!;
    const target = trip.days[0].activities[0];

    const failing = new MockLanguageModelV3({
      doGenerate: async () => {
        throw new Error("upstream_timeout");
      },
    });

    await expect(
      swapActivity(db, tripId, target.id, { model: failing })
    ).rejects.toThrow(/upstream_timeout/);
  });

  it("throws when the model keeps returning a duplicate of the target", async () => {
    const trip = (await getTrip(db, tripId))!;
    const target = trip.days[0].activities[0];

    const dup: SwapActivityOutputT = { ...REPLACEMENT_FOOD, name: "old cafe" };
    const model = mockObjectModel(dup);

    await expect(
      swapActivity(db, tripId, target.id, { model })
    ).rejects.toThrow(/duplicate activity/);
    expect(model.doGenerateCalls.length).toBe(2);
  });

  it("throws when the model returns a sibling name", async () => {
    const trip = (await getTrip(db, tripId))!;
    const target = trip.days[0].activities[0];

    const dup: SwapActivityOutputT = {
      ...REPLACEMENT_FOOD,
      name: "Cervejaria Ramiro",
    };
    await expect(
      swapActivity(db, tripId, target.id, { model: mockObjectModel(dup) })
    ).rejects.toThrow(/duplicate activity/);
  });

  it("retries and succeeds when only the first attempt is a duplicate", async () => {
    const trip = (await getTrip(db, tripId))!;
    const target = trip.days[0].activities[0];

    const responses = [
      { ...REPLACEMENT_FOOD, name: "Old Cafe" },
      REPLACEMENT_FOOD,
    ];
    let call = 0;
    const model = new MockLanguageModelV3({
      doGenerate: async (
        _opts: LanguageModelV3CallOptions
      ): Promise<LanguageModelV3GenerateResult> => ({
        content: [{ type: "text", text: JSON.stringify(responses[call++]) }],
        finishReason: { unified: "stop", raw: undefined },
        usage: {
          inputTokens: {
            total: 1,
            noCache: 1,
            cacheRead: undefined,
            cacheWrite: undefined,
          },
          outputTokens: { total: 1, text: 1, reasoning: undefined },
        },
        warnings: [],
      }),
    });

    const result = await swapActivity(db, tripId, target.id, { model });
    expect(result.name).toBe("Pasteis de Belem");
    expect(call).toBe(2);
    const retryPrompt = JSON.stringify(model.doGenerateCalls[1]);
    expect(retryPrompt).toContain("Old Cafe");
    expect(retryPrompt).toContain("duplicates an existing activity");
  });

  it("returns output that updateActivity accepts (caller contract)", async () => {
    const trip = (await getTrip(db, tripId))!;
    const target = trip.days[0].activities[0];

    const result = await swapActivity(db, tripId, target.id, {
      model: mockObjectModel(REPLACEMENT_FOOD),
    });
    await updateActivity(db, target.id, {
      ...result,
      orderIndex: target.orderIndex,
    });

    const refreshed = (await getTrip(db, tripId))!;
    expect(refreshed.days[0].activities[0].name).toBe("Pasteis de Belem");
  });
});
