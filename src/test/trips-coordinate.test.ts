import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppDb } from "@/db/client";
import { createCoordinator } from "@/features/trips/coordinate";
import { parse } from "@/features/trips/generate-request";
import type { GeneratedTripResponseT } from "@/features/trips/generate-schema";
import { abortError } from "@/lib/abort";
import type { RateLimitResult } from "@/lib/rate-limit";
import { type TestDbHandle, useTestDb } from "@/test/helpers/db";

function asAppDb(handle: TestDbHandle): AppDb {
  return handle.db as unknown as AppDb;
}

function requestOf(
  destination = "Lisbon",
  duration = 3
): ReturnType<typeof parse> & { ok: true } {
  const parsed = parse({ destination, duration });
  if (!parsed.ok) throw new Error("fixture");
  return parsed;
}

function cannedTrip(
  overrides: Partial<GeneratedTripResponseT> = {}
): GeneratedTripResponseT {
  return {
    destination: "Lisbon",
    summary: "short trip",
    totalEstimatedCost: 100,
    days: [
      {
        dayNumber: 1,
        activities: Array.from({ length: 7 }, (_, i) => ({
          name: `act-${i}`,
          description: "d",
          type:
            i === 0
              ? ("breakfast" as const)
              : i === 3
                ? ("lunch" as const)
                : i === 6
                  ? ("dinner" as const)
                  : ("activity" as const),
          durationMinutes: 60,
          address: "x",
          estimatedCost: 10,
          latitude: 38.7,
          longitude: -9.14,
          placeId: "ChIJ",
          photoReference: null,
        })),
      },
    ],
    ...overrides,
  };
}

const allow: RateLimitResult = {
  success: true,
  scope: null,
  reset: 0,
  remaining: 4,
  limit: 5,
};

describe("createCoordinator", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("grounds on a cache miss and serves the cache on the next call", async () => {
    const db = asAppDb(await useTestDb());
    const trip = cannedTrip();
    const generate = vi.fn(async () => trip);
    const { coordinate } = createCoordinator({
      db,
      generate,
      checkLimit: async () => allow,
    });
    const { request } = requestOf();

    const first = await coordinate({ request, clientId: "203.0.113.5" });
    const second = await coordinate({ request, clientId: "203.0.113.5" });

    expect(first).toEqual({ outcome: "trip", trip });
    expect(second).toEqual({ outcome: "trip", trip });
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("does not ground when rate-limited", async () => {
    const db = asAppDb(await useTestDb());
    const generate = vi.fn(async () => cannedTrip());
    const reset = Date.now() + 60_000;
    const { coordinate } = createCoordinator({
      db,
      generate,
      checkLimit: async () => ({
        success: false,
        scope: "day",
        reset,
        remaining: 0,
        limit: 30,
      }),
    });

    const result = await coordinate({
      request: requestOf().request,
      clientId: "203.0.113.5",
    });

    expect(result.outcome).toBe("rate_limited");
    if (result.outcome !== "rate_limited") return;
    expect(result.scope).toBe("day");
    expect(result.message).toBe(
      "You've reached the daily limit. Try again tomorrow."
    );
    expect(result.limit).toBe(30);
    expect(result.remaining).toBe(0);
    expect(result.reset).toBe(reset);
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(generate).not.toHaveBeenCalled();
  });

  it("returns aborted when grounding throws AbortError", async () => {
    const db = asAppDb(await useTestDb());
    const { coordinate } = createCoordinator({
      db,
      generate: async () => {
        throw abortError();
      },
      checkLimit: async () => allow,
    });

    await expect(
      coordinate({ request: requestOf().request, clientId: "1" })
    ).resolves.toEqual({ outcome: "aborted" });
  });

  it("returns failed with friendly copy when the AI is out of credits", async () => {
    const db = asAppDb(await useTestDb());
    const { coordinate } = createCoordinator({
      db,
      generate: async () => {
        throw new Error("insufficient_quota");
      },
      checkLimit: async () => allow,
    });

    await expect(
      coordinate({ request: requestOf().request, clientId: "1" })
    ).resolves.toEqual({
      outcome: "failed",
      message:
        "The AI service is out of credits. Please contact the site owner.",
    });
  });

  it("shares one grounding run across concurrent cache misses", async () => {
    const db = asAppDb(await useTestDb());
    const trip = cannedTrip();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const generate = vi.fn(async () => {
      await gate;
      return trip;
    });
    const { coordinate } = createCoordinator({
      db,
      generate,
      checkLimit: async () => allow,
    });
    const { request } = requestOf();

    const first = coordinate({ request, clientId: "a" });
    await vi.waitFor(() => expect(generate).toHaveBeenCalledTimes(1));
    const second = coordinate({ request, clientId: "b" });
    await new Promise((r) => setTimeout(r, 50));
    release();
    const results = await Promise.all([first, second]);

    expect(generate).toHaveBeenCalledTimes(1);
    expect(results).toEqual([
      { outcome: "trip", trip },
      { outcome: "trip", trip },
    ]);
  });

  it("still grounds when the cache read throws", async () => {
    const db = asAppDb(await useTestDb());
    const trip = cannedTrip();
    const generate = vi.fn(async () => trip);
    const { coordinate } = createCoordinator({
      db,
      generate,
      checkLimit: async () => allow,
    });

    const cache = await import("@/features/trips/cache");
    vi.spyOn(cache, "readCache").mockRejectedValueOnce(new Error("down"));

    const result = await coordinate({
      request: requestOf("Porto", 2).request,
      clientId: "1",
    });

    expect(result).toEqual({ outcome: "trip", trip });
    expect(generate).toHaveBeenCalledTimes(1);
  });
});
