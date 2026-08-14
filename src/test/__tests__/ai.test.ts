import { generateText, Output } from "ai";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { mockObjectModel } from "@/test/helpers/ai";

const TripSchema = z.object({
  destination: z.string(),
  days: z.number().int().positive(),
});

describe("mockObjectModel", () => {
  it("drives generateText + Output.object to return the fixture value", async () => {
    const fixture = { destination: "Lisbon", days: 5 };
    const result = await generateText({
      model: mockObjectModel(fixture),
      output: Output.object({ schema: TripSchema }),
      prompt: "ignored — model is mocked",
    });

    expect(result.output).toEqual(fixture);
  });

  it("rejects when the fixture violates the Zod schema", async () => {
    const bad = { destination: "Lisbon", days: -1 };
    await expect(
      generateText({
        model: mockObjectModel(bad),
        output: Output.object({ schema: TripSchema }),
        prompt: "ignored",
      })
    ).rejects.toThrow();
  });
});
