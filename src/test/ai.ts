import { MockLanguageModelV3 } from "ai/test";

/**
 * Test fixture for `generateObject` calls. Returns a mock language model that
 * emits `value` serialized as JSON. Swap your real model with this in tests.
 */
export function mockObjectModel<T>(value: T): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    // biome-ignore lint/suspicious/noExplicitAny: doGenerate result type is deeply nested
    doGenerate: (async () => ({
      content: [{ type: "text", text: JSON.stringify(value) }],
      finishReason: "stop",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      warnings: [],
      // biome-ignore lint/suspicious/noExplicitAny: see above
    })) as any,
  });
}
