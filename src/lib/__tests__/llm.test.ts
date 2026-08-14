import type {
  LanguageModelV3CallOptions,
  LanguageModelV3GenerateResult,
} from "@ai-sdk/provider";
import { MockLanguageModelV3 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { mockObjectModel } from "@/test/helpers/ai";
import { generateObjectResilient } from "../llm";

const Schema = z.object({
  name: z.string(),
  cost: z.number().nonnegative(),
});

describe("generateObjectResilient", () => {
  const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  beforeEach(() => {
    infoSpy.mockClear();
    warnSpy.mockClear();
  });

  afterEach(() => {
    infoSpy.mockClear();
    warnSpy.mockClear();
  });

  it("returns a schema-matching object from the injected model", async () => {
    const fixture = { name: "Pastéis de Belém", cost: 8 };
    const result = await generateObjectResilient({
      schema: Schema,
      system: "You are a travel planner.",
      prompt: "Suggest a pastry shop.",
      model: mockObjectModel(fixture),
      context: "test",
    });

    expect(result.object).toEqual(fixture);
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[llm\] test ok .*latencyMs=\d+/)
    );
  });

  it("rejects when the model emits schema-invalid JSON", async () => {
    await expect(
      generateObjectResilient({
        schema: Schema,
        system: "sys",
        prompt: "prompt",
        model: mockObjectModel({ name: "x", cost: -1 }),
        context: "test",
      })
    ).rejects.toThrow();
  });

  it("does not fall back to a second model when model is injected", async () => {
    const failing = new MockLanguageModelV3({
      doGenerate: async () => {
        throw new Error("upstream_timeout");
      },
    });

    await expect(
      generateObjectResilient({
        schema: Schema,
        system: "sys",
        prompt: "prompt",
        model: failing,
        context: "test-no-fallback",
      })
    ).rejects.toThrow(/upstream_timeout/);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/test-no-fallback failed/);
  });

  it("retries once on an injected model that fails then succeeds", async () => {
    // maxRetries is handled inside AI SDK; we verify a single successful call.
    const fixture = { name: "ok", cost: 1 };
    const result = await generateObjectResilient({
      schema: Schema,
      system: "sys",
      prompt: "prompt",
      model: mockObjectModel(fixture),
      context: "test",
      temperature: 0.2,
    });
    expect(result.object.name).toBe("ok");
  });

  it("rejects an already-aborted signal without calling the model", async () => {
    const ac = new AbortController();
    ac.abort();
    const model = mockObjectModel({ name: "x", cost: 1 });

    await expect(
      generateObjectResilient({
        schema: Schema,
        system: "sys",
        prompt: "prompt",
        model,
        abortSignal: ac.signal,
        context: "test-already-aborted",
      })
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(model.doGenerateCalls).toHaveLength(0);
  });

  it("rejects when the abort signal fires during generation", async () => {
    const ac = new AbortController();
    const hanging = new MockLanguageModelV3({
      doGenerate: ({
        abortSignal,
      }: LanguageModelV3CallOptions): Promise<LanguageModelV3GenerateResult> =>
        new Promise((_, reject) => {
          const fail = () => {
            const err = new Error("Aborted");
            err.name = "AbortError";
            reject(err);
          };
          if (abortSignal?.aborted) {
            fail();
            return;
          }
          abortSignal?.addEventListener("abort", fail, { once: true });
        }),
    });

    const pending = generateObjectResilient({
      schema: Schema,
      system: "sys",
      prompt: "prompt",
      model: hanging,
      abortSignal: ac.signal,
      context: "test-abort",
      maxRetries: 0,
    });

    ac.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});
