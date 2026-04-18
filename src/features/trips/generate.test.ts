import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";
import { mockObjectModel } from "../../test/ai";
import {
  ACTIVITIES_PER_DAY,
  type GeneratedTripT,
  generateTrip,
  toCreateTripInput,
} from "./generate";

function makeFixture(days = 2): GeneratedTripT {
  return {
    destination: "Lisbon",
    summary: "A short hop through Lisbon's classics.",
    totalEstimatedCost: 500,
    days: Array.from({ length: days }, (_, i) => ({
      dayNumber: i + 1,
      activities: [
        { name: "bfast", description: "x", type: "breakfast", durationMinutes: 30, address: "A", estimatedCost: 10 },
        { name: "a1", description: "x", type: "activity", durationMinutes: 90, address: "A", estimatedCost: 15 },
        { name: "a2", description: "x", type: "activity", durationMinutes: 60, address: "A", estimatedCost: 0 },
        { name: "lunch", description: "x", type: "lunch", durationMinutes: 45, address: "A", estimatedCost: 20 },
        { name: "a3", description: "x", type: "activity", durationMinutes: 75, address: "A", estimatedCost: 5 },
        { name: "a4", description: "x", type: "activity", durationMinutes: 60, address: "A", estimatedCost: 0 },
        { name: "dinner", description: "x", type: "dinner", durationMinutes: 60, address: "A", estimatedCost: 30 },
      ],
    })),
  };
}

describe("generateTrip", () => {
  it("returns a schema-matching Trip when the model emits a valid fixture", async () => {
    const fixture = makeFixture(2);
    const result = await generateTrip({
      destination: "Lisbon",
      duration: 2,
      model: mockObjectModel(fixture),
    });

    expect(result.destination).toBe("Lisbon");
    expect(result.days).toHaveLength(2);
    expect(result.days[0].activities).toHaveLength(ACTIVITIES_PER_DAY);
    expect(result.days[0].activities[0].type).toBe("breakfast");
  });

  it("rejects when the model emits output that violates the schema", async () => {
    const bad = { ...makeFixture(1) } as unknown as GeneratedTripT;
    // Only 6 activities, schema requires 7
    bad.days[0].activities = bad.days[0].activities.slice(0, 6);

    await expect(
      generateTrip({
        destination: "Lisbon",
        duration: 1,
        model: mockObjectModel(bad),
      }),
    ).rejects.toThrow();
  });

  it("passes preferences into the prompt sent to the model", async () => {
    const model = mockObjectModel(makeFixture(1));
    await generateTrip({
      destination: "Lisbon",
      duration: 1,
      preferences: "strict vegan, no museums",
      model,
    });

    expect(model.doGenerateCalls).toHaveLength(1);
    const serialized = JSON.stringify(model.doGenerateCalls[0]);
    expect(serialized).toContain("strict vegan, no museums");
  });

  it("includes duration and destination in the prompt", async () => {
    const model = mockObjectModel(makeFixture(3));
    await generateTrip({ destination: "Porto", duration: 3, model });

    const serialized = JSON.stringify(model.doGenerateCalls[0]);
    expect(serialized).toContain("Porto");
    expect(serialized).toContain("3-day");
  });

  it("propagates provider errors", async () => {
    const failing = new MockLanguageModelV3({
      doGenerate: async () => {
        throw new Error("upstream_timeout");
      },
    });

    await expect(
      generateTrip({ destination: "Lisbon", duration: 1, model: failing }),
    ).rejects.toThrow(/upstream_timeout/);
  });
});

describe("toCreateTripInput", () => {
  it("maps meals to 'food' and activities to 'other'", () => {
    const mapped = toCreateTripInput(makeFixture(1));
    const types = mapped.days[0].activities.map((a) => a.type);
    expect(types).toEqual(["food", "other", "other", "food", "other", "other", "food"]);
  });

  it("derives orderIndex from array position", () => {
    const mapped = toCreateTripInput(makeFixture(1));
    expect(mapped.days[0].activities.map((a) => a.orderIndex)).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
  });

  it("carries destination, summary, and totalEstimatedCost through", () => {
    const mapped = toCreateTripInput(makeFixture(1));
    expect(mapped.destination).toBe("Lisbon");
    expect(mapped.summary).toBe("A short hop through Lisbon's classics.");
    expect(mapped.totalEstimatedCost).toBe(500);
  });

  it("produces output that satisfies the createTrip input contract (schema round-trip)", async () => {
    const { CreateTripInput } = await import("./schemas");
    const mapped = toCreateTripInput(makeFixture(3));
    expect(() => CreateTripInput.parse(mapped)).not.toThrow();
  });
});
