import type { z } from "zod";

/**
 * LangChain-style structured parser: pull a JSON object out of raw LLM text
 * (plain JSON, markdown fences, or JSON buried in prose) and validate it
 * against a Zod schema.
 */
export function parseLlmObject<T extends z.ZodType>(
  schema: T,
  text: string
): z.infer<T> {
  const jsonText = extractJsonText(text);
  let value: unknown;
  try {
    value = JSON.parse(jsonText);
  } catch (e) {
    throw new Error("Could not parse JSON from LLM response", { cause: e });
  }

  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(
      `LLM response did not match schema: ${result.error.message}`,
      {
        cause: result.error,
      }
    );
  }
  return result.data;
}

function extractJsonText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Could not parse JSON from LLM response");
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return trimmed;
  }

  const brace = trimmed.indexOf("{");
  const bracket = trimmed.indexOf("[");
  const start =
    brace === -1 ? bracket : bracket === -1 ? brace : Math.min(brace, bracket);
  if (start === -1) {
    throw new Error("Could not parse JSON from LLM response");
  }

  const close = trimmed[start] === "{" ? "}" : "]";
  const end = trimmed.lastIndexOf(close);
  if (end <= start) {
    throw new Error("Could not parse JSON from LLM response");
  }
  return trimmed.slice(start, end + 1);
}
