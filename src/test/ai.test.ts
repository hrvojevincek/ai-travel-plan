import { describe, expect, it } from "vitest";
import { generateObject } from "ai";
import { z } from "zod";
import { mockObjectModel } from "./ai";

const TripSchema = z.object({
  destination: z.string(),
  days: z.number().int().positive(),
});

describe("mockObjectModel", () => {
  it("drives generateObject to return the fixture value", async () => {
    const fixture = { destination: "Lisbon", days: 5 };
    const result = await generateObject({
      model: mockObjectModel(fixture),
      schema: TripSchema,
      prompt: "ignored — model is mocked",
    });

    expect(result.object).toEqual(fixture);
  });

  it("rejects when the fixture violates the Zod schema", async () => {
    const bad = { destination: "Lisbon", days: -1 };
    await expect(
      generateObject({
        model: mockObjectModel(bad),
        schema: TripSchema,
        prompt: "ignored",
      }),
    ).rejects.toThrow();
  });
});
