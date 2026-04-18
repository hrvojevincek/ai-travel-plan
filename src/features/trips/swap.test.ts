import type {
  LanguageModelV3CallOptions,
  LanguageModelV3GenerateResult,
} from "@ai-sdk/provider";
import { MockLanguageModelV3 } from "ai/test";
import { beforeEach, describe, expect, it } from "vitest";
import type { AppDb } from "@/db/client";
import { user } from "@/db/schema";
import { mockObjectModel } from "../../test/ai";
import { type TestDbHandle, useTestDb } from "../../test/db";
import { createTrip, getTrip, updateActivity } from "./data";
import type { CreateTripInputT } from "./schemas";
import { type SwapActivityOutputT, swapActivity } from "./swap";

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
          { name: "Old Cafe", type: "food", orderIndex: 0, estimatedCost: 10 },
          { name: "Jeronimos Monastery", type: "sightseeing", orderIndex: 1 },
          { name: "MAAT", type: "sightseeing", orderIndex: 2 },
          {
            name: "Cervejaria Ramiro",
            type: "food",
            orderIndex: 3,
            estimatedCost: 35,
          },
          { name: "Alfama walk", type: "sightseeing", orderIndex: 4 },
          { name: "Tram 28", type: "sightseeing", orderIndex: 5 },
          {
            name: "Tasca Dinner",
            type: "food",
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
  type: "food",
  durationMinutes: 45,
  address: "R. de Belem 84, Lisboa",
  estimatedCost: 8,
};

const REPLACEMENT_SIGHT: SwapActivityOutputT = {
  ...REPLACEMENT_FOOD,
  name: "Miradouro da Graca",
  type: "sightseeing",
};

describe("swapActivity", () => {
  let handle: TestDbHandle;
  let db: AppDb;
  let tripId: string;

  beforeEach(async () => {
    handle = await useTestDb();
    db = asAppDb(handle);
    tripId = await seed(db);
  });

  it("returns a schema-matching activity when the model emits a valid fixture", async () => {
    const trip = (await getTrip(db, tripId))!;
    const target = trip.days[0].activities[0];

    const result = await swapActivity(db, tripId, target.id, {
      model: mockObjectModel(REPLACEMENT_FOOD),
    });

    expect(result.name).toBe("Pasteis de Belem");
    expect(result.type).toBe("food");
    expect(result.durationMinutes).toBe(45);
  });

  it("rejects when the model tries to change the type (slot preservation)", async () => {
    const trip = (await getTrip(db, tripId))!;
    const target = trip.days[0].activities[0];

    await expect(
      swapActivity(db, tripId, target.id, {
        model: mockObjectModel({ ...REPLACEMENT_FOOD, type: "sightseeing" }),
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
