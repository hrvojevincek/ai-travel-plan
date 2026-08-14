import "server-only";

import { openai } from "@ai-sdk/openai";
import { generateText, type LanguageModel, Output } from "ai";
import type { z } from "zod";
import { abortError } from "@/lib/abort";

export const DEFAULT_LLM_TIMEOUT_MS = 45_000;
export const DEFAULT_STRUCTURED_TEMPERATURE = 0.2;

const PRIMARY_MODEL = () => openai("gpt-4o-mini");
const FALLBACK_MODEL = () => openai("gpt-4o");

export interface GenerateObjectResilientOpts<T extends z.ZodType> {
  schema: T;
  system: string;
  prompt: string;
  /** When set, only this model is tried (no fallback). Used by tests. */
  model?: LanguageModel;
  temperature?: number;
  maxRetries?: number;
  timeoutMs?: number;
  abortSignal?: AbortSignal;
  /** Log context tag, e.g. "generateTrip" | "swapActivity". */
  context: string;
}

export interface GenerateStructuredResult<T> {
  object: T;
  usage: {
    inputTokens: number | undefined;
    outputTokens: number | undefined;
  };
}

/**
 * Structured-object generation with timeout, token logging, and optional
 * fallback model. Injected `model` skips the fallback chain so tests stay
 * hermetic. Client disconnect (`abortSignal`) skips fallback.
 */
export async function generateObjectResilient<T extends z.ZodType>(
  opts: GenerateObjectResilientOpts<T>
): Promise<GenerateStructuredResult<z.infer<T>>> {
  if (opts.abortSignal?.aborted) {
    throw abortError(opts.abortSignal);
  }

  const models: LanguageModel[] = opts.model
    ? [opts.model]
    : [PRIMARY_MODEL(), FALLBACK_MODEL()];

  const temperature = opts.temperature ?? DEFAULT_STRUCTURED_TEMPERATURE;
  const maxRetries = opts.maxRetries ?? 2;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_LLM_TIMEOUT_MS;
  const started = Date.now();

  let lastError: unknown;
  for (const model of models) {
    if (opts.abortSignal?.aborted) {
      throw abortError(opts.abortSignal);
    }

    const label = modelLabel(model);
    try {
      const result = await generateText({
        model,
        output: Output.object({ schema: opts.schema }),
        system: opts.system,
        prompt: opts.prompt,
        temperature,
        maxRetries,
        timeout: timeoutMs,
        abortSignal: opts.abortSignal,
      });

      console.info(
        `[llm] ${opts.context} ok model=${label} ` +
          `latencyMs=${Date.now() - started} ` +
          `inputTokens=${result.usage.inputTokens ?? "?"} ` +
          `outputTokens=${result.usage.outputTokens ?? "?"}`
      );

      return {
        object: result.output as z.infer<T>,
        usage: result.usage,
      };
    } catch (e) {
      lastError = e;
      if (opts.abortSignal?.aborted) {
        throw abortError(opts.abortSignal);
      }
      console.warn(
        `[llm] ${opts.context} failed model=${label} ` +
          `latencyMs=${Date.now() - started}:`,
        e instanceof Error ? e.message : e
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`[llm] ${opts.context} exhausted all models`);
}

function modelLabel(model: LanguageModel): string {
  if (typeof model === "string") return model;
  return "modelId" in model && typeof model.modelId === "string"
    ? model.modelId
    : "unknown";
}
