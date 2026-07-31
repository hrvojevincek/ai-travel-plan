import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockObjectModel } from "@/test/helpers/ai";
import type { FindPlaceResult } from "../find-place";
import type { GeneratedTripT } from "../generate-schema";
import { ACTIVITIES_PER_DAY } from "../generate-schema";
import {
  buildPlaceQuery,
  generateTripWithGrounding,
  MAX_GROUNDING_PASSES,
} from "../ground";

function place(overrides: Partial<FindPlaceResult> = {}): FindPlaceResult {
  return {
    latitude: 38.7,
    longitude: -9.1,
    placeId: "ChIJtest",
    photoReference: "photo-ref",
    ...overrides,
  };
}

function makeFixture(days = 1): GeneratedTripT {
  return {
    destination: "Lisbon",
    summary: "A short hop through Lisbon's classics.",
    totalEstimatedCost: 100,
    days: Array.from({ length: days }, (_, i) => ({
      dayNumber: i + 1,
      activities: [
        {
          name: "Cafe A",
          description: "x",
          type: "breakfast" as const,
          durationMinutes: 30,
          address: "Rua A 1, Lisboa",
          estimatedCost: 10,
        },
        {
          name: "Sight 1",
          description: "x",
          type: "activity" as const,
          durationMinutes: 90,
          address: "Rua B 2, Lisboa",
          estimatedCost: 15,
        },
        {
          name: "Sight 2",
          description: "x",
          type: "activity" as const,
          durationMinutes: 60,
          address: "Rua C 3, Lisboa",
          estimatedCost: 0,
        },
        {
          name: "Lunch Spot",
          description: "x",
          type: "lunch" as const,
          durationMinutes: 45,
          address: "Rua D 4, Lisboa",
          estimatedCost: 20,
        },
        {
          name: "Sight 3",
          description: "x",
          type: "activity" as const,
          durationMinutes: 75,
          address: "Rua E 5, Lisboa",
          estimatedCost: 5,
        },
        {
          name: "Sight 4",
          description: "x",
          type: "activity" as const,
          durationMinutes: 60,
          address: "Rua F 6, Lisboa",
          estimatedCost: 0,
        },
        {
          name: "Dinner Spot",
          description: "x",
          type: "dinner" as const,
          durationMinutes: 60,
          address: "Rua G 7, Lisboa",
          estimatedCost: 30,
        },
      ],
    })),
  };
}

describe("buildPlaceQuery", () => {
  it("uses the address alone when it already contains the destination", () => {
    expect(buildPlaceQuery("Cafe", "Rua A 1, Lisbon", "Lisbon")).toBe(
      "Rua A 1, Lisbon"
    );
  });

  it("combines name, address, and destination otherwise", () => {
    expect(buildPlaceQuery("Cafe", "Rua A 1", "Lisbon")).toBe(
      "Cafe, Rua A 1, Lisbon"
    );
  });

  it("falls back to name + destination when address is empty", () => {
    expect(buildPlaceQuery("Cafe", "  ", "Lisbon")).toBe("Cafe, Lisbon");
  });
});

describe("generateTripWithGrounding", () => {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

  beforeEach(() => {
    warnSpy.mockClear();
    infoSpy.mockClear();
  });

  afterEach(() => {
    warnSpy.mockClear();
    infoSpy.mockClear();
  });

  it("attaches place metadata when every activity resolves", async () => {
    const fixture = makeFixture(1);
    const lookup = vi.fn(async (reqs: { query: string }[]) =>
      reqs.map((_, i) => place({ placeId: `id-${i}` }))
    );

    const result = await generateTripWithGrounding({
      destination: "Lisbon",
      duration: 1,
      model: mockObjectModel(fixture),
      lookupPlaces: lookup,
    });

    expect(lookup).toHaveBeenCalledTimes(1);
    expect(result.days[0].activities[0].placeId).toBe("id-0");
    expect(result.days[0].activities[0].latitude).toBe(38.7);
    // Query should prefer address
    expect(lookup.mock.calls[0][0][0].query).toContain("Rua A 1");
  });

  it("regenerates ungrounded slots and succeeds on the second pass", async () => {
    const first = makeFixture(1);
    const replacement = {
      ...first.days[0].activities[1],
      name: "Jerónimos Monastery",
      address: "Praça do Império, Lisboa",
    };

    // First generateTrip call returns `first`. After regenerate, generateObject
    // is called again with a replacements batch — mockObjectModel returns the
    // same JSON each time, so we need a sequenced model.
    let call = 0;
    const { MockLanguageModelV3 } = await import("ai/test");
    type CallOpts = import("@ai-sdk/provider").LanguageModelV3CallOptions;
    type CallResult = import("@ai-sdk/provider").LanguageModelV3GenerateResult;

    const model = new MockLanguageModelV3({
      doGenerate: async (_opts: CallOpts): Promise<CallResult> => {
        call++;
        const payload =
          call === 1
            ? first
            : {
                replacements: [
                  {
                    dayIdx: 0,
                    actIdx: 1,
                    activity: replacement,
                  },
                ],
              };
        return {
          content: [{ type: "text", text: JSON.stringify(payload) }],
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
        };
      },
    });

    let lookupPass = 0;
    const lookup = vi.fn(async (reqs: { query: string }[]) => {
      lookupPass++;
      return reqs.map((_r, i) => {
        // First pass: fail only activity index 1
        if (lookupPass === 1 && i === 1) return null;
        return place({ placeId: `ok-${lookupPass}-${i}` });
      });
    });

    const result = await generateTripWithGrounding({
      destination: "Lisbon",
      duration: 1,
      model,
      lookupPlaces: lookup,
    });

    expect(call).toBe(2);
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(result.days[0].activities[1].name).toBe("Jerónimos Monastery");
    expect(result.days[0].activities[1].placeId).toBe("ok-2-1");
    expect(MAX_GROUNDING_PASSES).toBe(2);
  });

  it("returns null coords after exhausting grounding passes", async () => {
    const fixture = makeFixture(1);
    const lookup = vi.fn(async (reqs: { query: string }[]) =>
      reqs.map(() => null)
    );

    // regenerate will be called once; return same activities (still ungroundable)
    let call = 0;
    const { MockLanguageModelV3 } = await import("ai/test");
    type CallOpts = import("@ai-sdk/provider").LanguageModelV3CallOptions;
    type CallResult = import("@ai-sdk/provider").LanguageModelV3GenerateResult;

    const model = new MockLanguageModelV3({
      doGenerate: async (_opts: CallOpts): Promise<CallResult> => {
        call++;
        const payload =
          call === 1
            ? fixture
            : {
                replacements: fixture.days[0].activities.map((a, actIdx) => ({
                  dayIdx: 0,
                  actIdx,
                  activity: a,
                })),
              };
        return {
          content: [{ type: "text", text: JSON.stringify(payload) }],
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
        };
      },
    });

    const result = await generateTripWithGrounding({
      destination: "Lisbon",
      duration: 1,
      model,
      lookupPlaces: lookup,
    });

    expect(lookup).toHaveBeenCalledTimes(MAX_GROUNDING_PASSES);
    expect(result.days[0].activities).toHaveLength(ACTIVITIES_PER_DAY);
    expect(result.days[0].activities.every((a) => a.placeId == null)).toBe(
      true
    );
  });
});
