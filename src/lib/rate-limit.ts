import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  success: boolean;
  /** Which window fired (when !success). Useful for Retry-After math. */
  scope: "minute" | "day" | null;
  /** Unix ms when the breached window next allows a request. */
  reset: number;
  /** Remaining requests in the tightest window still in play. */
  remaining: number;
  /** Total allowed in the breached/tightest window. */
  limit: number;
}

const PASS_THROUGH: RateLimitResult = {
  success: true,
  scope: null,
  reset: 0,
  remaining: Number.POSITIVE_INFINITY,
  limit: Number.POSITIVE_INFINITY,
};

type Limiters = { minute: Ratelimit; day: Ratelimit };

let cached: Limiters | null = null;
let warnedMissingCreds = false;

function getLimiters(): Limiters | null {
  if (cached) return cached;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (!warnedMissingCreds) {
      warnedMissingCreds = true;
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not set — requests are unlimited. Set both in prod."
      );
    }
    return null;
  }

  const redis = new Redis({ url, token });
  cached = {
    minute: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      prefix: "rl:generate:min",
      analytics: true,
    }),
    day: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "1 d"),
      prefix: "rl:generate:day",
      analytics: true,
    }),
  };
  return cached;
}

/**
 * Returns success=false the first time either window (minute or day) fires.
 * Checks both windows so a slow trickle over 24h still trips the daily cap.
 */
export async function checkTripGenerateLimit(
  identifier: string
): Promise<RateLimitResult> {
  const limiters = getLimiters();
  if (!limiters) return PASS_THROUGH;

  const [minute, day] = await Promise.all([
    limiters.minute.limit(identifier),
    limiters.day.limit(identifier),
  ]);

  if (!minute.success) {
    return {
      success: false,
      scope: "minute",
      reset: minute.reset,
      remaining: minute.remaining,
      limit: minute.limit,
    };
  }
  if (!day.success) {
    return {
      success: false,
      scope: "day",
      reset: day.reset,
      remaining: day.remaining,
      limit: day.limit,
    };
  }

  // Both succeeded: surface whichever has less headroom for client feedback.
  const tightest = minute.remaining <= day.remaining ? minute : day;
  return {
    success: true,
    scope: null,
    reset: tightest.reset,
    remaining: tightest.remaining,
    limit: tightest.limit,
  };
}

/**
 * Best-effort client IP from proxy headers. Falls back to a shared bucket
 * when nothing is forwarded — which is fine for dev and conservative in
 * prod (everyone gets throttled together rather than nobody).
 */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") ?? "unknown";
}
