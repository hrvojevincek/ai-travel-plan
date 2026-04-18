import type { LanguageModelV3CallOptions, LanguageModelV3GenerateResult } from "@ai-sdk/provider";
import { MockLanguageModelV3 } from "ai/test";

/**
 * Test fixture for `generateObject` calls. Returns a mock language model that
 * emits `value` serialized as JSON. Swap your real model with this in tests.
 */
export function mockObjectModel<T>(value: T): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doGenerate: async (_options: LanguageModelV3CallOptions): Promise<LanguageModelV3GenerateResult> => ({
      content: [{ type: "text", text: JSON.stringify(value) }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 1, text: 1, reasoning: undefined },
      },
      warnings: [],
    }),
  });
}
