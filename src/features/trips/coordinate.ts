import "server-only";

import type { AppDb } from "@/db/client";
import { isAbortError } from "@/lib/abort";
import { checkTripGenerateLimit, type RateLimitResult } from "@/lib/rate-limit";
import { buildCacheKey, readCache, writeCache } from "./cache";
import type { GenerateRequest } from "./generate-request";
import type { GeneratedTripResponseT } from "./generate-schema";
import { generateTripWithGrounding } from "./ground";

export type GenerateFn = (
  request: GenerateRequest,
  abortSignal?: AbortSignal
) => Promise<GeneratedTripResponseT>;

export type CheckLimitFn = (clientId: string) => Promise<RateLimitResult>;

export type CoordinateResult =
  | { outcome: "trip"; trip: GeneratedTripResponseT }
  | {
      outcome: "rate_limited";
      scope: "minute" | "day";
      message: string;
      retryAfterSeconds: number;
      limit: number;
      remaining: number;
      reset: number;
    }
  | { outcome: "aborted" }
  | { outcome: "failed"; message: string };

export function createCoordinator(deps: {
  db: AppDb;
  generate?: GenerateFn;
  checkLimit?: CheckLimitFn;
}): {
  coordinate: (opts: {
    request: GenerateRequest;
    clientId: string;
    abortSignal?: AbortSignal;
  }) => Promise<CoordinateResult>;
} {
  const inflight = new Map<string, Promise<GeneratedTripResponseT>>();
  const generate: GenerateFn =
    deps.generate ??
    ((request, abortSignal) =>
      generateTripWithGrounding({
        destination: request.destination,
        duration: request.duration,
        preferences: request.preferences,
        abortSignal,
      }));
  const checkLimit = deps.checkLimit ?? checkTripGenerateLimit;
  const db = deps.db;

  async function coordinate(opts: {
    request: GenerateRequest;
    clientId: string;
    abortSignal?: AbortSignal;
  }): Promise<CoordinateResult> {
    const rl = await checkLimit(opts.clientId);
    if (!rl.success) {
      const scope = rl.scope === "day" ? "day" : "minute";
      return {
        outcome: "rate_limited",
        scope,
        message:
          scope === "day"
            ? "You've reached the daily limit. Try again tomorrow."
            : "Too many requests. Please wait a moment and try again.",
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((rl.reset - Date.now()) / 1000)
        ),
        limit: rl.limit,
        remaining: rl.remaining,
        reset: rl.reset,
      };
    }

    let cached: GeneratedTripResponseT | null = null;
    try {
      cached = await readCache(db, opts.request);
    } catch (e) {
      console.warn("[trips/generate] cache read failed, passing through:", e);
    }
    if (cached) {
      return { outcome: "trip", trip: cached };
    }

    const { id: inflightKey } = buildCacheKey(opts.request);
    const existing = inflight.get(inflightKey);
    const generation = existing ?? generate(opts.request, opts.abortSignal);
    if (!existing) inflight.set(inflightKey, generation);

    let trip: GeneratedTripResponseT;
    try {
      trip = await generation;
    } catch (error) {
      if (!existing) inflight.delete(inflightKey);
      if (isAbortError(error) || opts.abortSignal?.aborted) {
        return { outcome: "aborted" };
      }
      console.error("[trips/generate] failed:", error);
      return { outcome: "failed", message: friendlyMessage(error) };
    }

    try {
      await writeCache(db, opts.request, trip);
    } catch (e) {
      console.warn("[trips/generate] cache write failed:", e);
    } finally {
      if (!existing) inflight.delete(inflightKey);
    }

    if (opts.abortSignal?.aborted) {
      return { outcome: "aborted" };
    }

    return { outcome: "trip", trip };
  }

  return { coordinate };
}

function friendlyMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  if (/insufficient_quota|quota|billing/i.test(raw)) {
    return "The AI service is out of credits. Please contact the site owner.";
  }
  if (/rate[_\s-]?limit|429/i.test(raw)) {
    return "Too many requests right now. Wait a minute and try again.";
  }
  if (/invalid_api_key|unauthorized|401/i.test(raw)) {
    return "The AI service isn't configured correctly.";
  }
  return "Couldn't generate your trip. Please try again.";
}
