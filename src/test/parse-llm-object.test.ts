import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseLlmObject } from "@/lib/parse-llm-object";

const Schema = z.object({
  destination: z.string(),
  days: z.number().int().positive(),
});

const fixture = { destination: "Lisbon", days: 5 };

describe("parseLlmObject", () => {
  it("parses a schema-matching JSON object", () => {
    expect(parseLlmObject(Schema, JSON.stringify(fixture))).toEqual(fixture);
  });

  it("parses JSON wrapped in a markdown fence", () => {
    const text = `Sure — here is the trip:\n\`\`\`json\n${JSON.stringify(fixture, null, 2)}\n\`\`\``;
    expect(parseLlmObject(Schema, text)).toEqual(fixture);
  });

  it("parses JSON buried in surrounding prose", () => {
    const text = `Result:\n${JSON.stringify(fixture)}\nHope that helps!`;
    expect(parseLlmObject(Schema, text)).toEqual(fixture);
  });

  it("rejects text that is not JSON", () => {
    expect(() => parseLlmObject(Schema, "Lisbon is lovely in May.")).toThrow(
      /Could not parse JSON from LLM response/
    );
  });

  it("rejects JSON that violates the schema", () => {
    expect(() =>
      parseLlmObject(
        Schema,
        JSON.stringify({ destination: "Lisbon", days: -1 })
      )
    ).toThrow(/did not match schema/);
  });
});
