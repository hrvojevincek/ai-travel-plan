import { z } from "zod";
import { db } from "@/db/client";
import { buildCacheKey, readCache, writeCache } from "@/features/trips/cache";
import { findPlaceMany } from "@/features/trips/find-place";
import {
  type GeneratedTripResponseT,
  generateTrip,
} from "@/features/trips/generate";
import { checkTripGenerateLimit, clientIp } from "@/lib/rate-limit";

// Node serverless runtime. Without streaming we don't need Edge's long-lived
// streams; Node gives us access to the same 60s maxDuration on Hobby and is
// easier to debug.
export const maxDuration = 60;

const Body = z.object({
  destination: z.string().min(1).max(100),
  duration: z.coerce.number().int().min(1).max(30),
  preferences: z.string().max(500).optional(),
});

// Module-scoped in-flight map dedupes concurrent cache misses for the same
// key so two identical cold requests share one generateTrip+geocode run.
// Only effective within a single serverless instance — acceptable because
// Vercel serves most concurrent hits from one warm instance, and worst case
// two instances duplicate work (rate-limit + cache still bound total cost).
const inflight = new Map<string, Promise<GeneratedTripResponseT>>();

// Endpoint is intentionally unauthenticated per KRE-16/KRE-17 (unauth users can
// generate; auth is prompted at save time). Rate-limited per-IP via Upstash
// to cap OpenAI spend — see `lib/rate-limit`. AI+Geocoding results are cached
// by normalized (destination, duration, preferences) so duplicate inputs are
// served from the DB — see `features/trips/cache` (KRE-32).
export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const rl = await checkTripGenerateLimit(ip);
  if (!rl.success) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((rl.reset - Date.now()) / 1000)
    );
    console.warn(
      `[trips/generate] rate-limited scope=${rl.scope} retryAfter=${retryAfterSeconds}s`
    );
    const message =
      rl.scope === "day"
        ? "You've reached the daily limit. Try again tomorrow."
        : "Too many requests. Please wait a moment and try again.";
    return new Response(JSON.stringify({ error: message }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(rl.limit),
        "X-RateLimit-Remaining": String(rl.remaining),
        "X-RateLimit-Reset": String(rl.reset),
      },
    });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const cached = await readCache(db, parsed.data).catch((e) => {
      console.warn("[trips/generate] cache read failed, passing through:", e);
      return null;
    });
    if (cached) {
      return Response.json(cached);
    }

    const { id: inflightKey } = buildCacheKey(parsed.data);
    const existing = inflight.get(inflightKey);
    const generation =
      existing ??
      (async () => {
        const trip = await generateTrip(parsed.data);
        return attachCoords(trip);
      })();
    if (!existing) inflight.set(inflightKey, generation);

    let response: GeneratedTripResponseT;
    try {
      response = await generation;
    } finally {
      if (!existing) inflight.delete(inflightKey);
    }

    // Await the write so the cache is persisted before the handler returns —
    // otherwise a serverless instance can freeze mid-write and lose the entry.
    await writeCache(db, parsed.data, response).catch((e) => {
      console.warn("[trips/generate] cache write failed:", e);
    });

    return Response.json(response);
  } catch (error) {
    console.error("[trips/generate] failed:", error);
    return Response.json({ error: friendlyMessage(error) }, { status: 502 });
  }
}

// Looks every activity up in Google Places Find Place — one call yields
// coords + place_id + first photo reference. Failures degrade gracefully:
// we still return the trip with null fields so pins/photos just don't render.
async function attachCoords(
  trip: Awaited<ReturnType<typeof generateTrip>>
): Promise<GeneratedTripResponseT> {
  const requests = trip.days.flatMap((d) =>
    d.activities.map((a) => ({
      name: a.name,
      query: `${a.name}, ${trip.destination}`,
    }))
  );
  let places: Awaited<ReturnType<typeof findPlaceMany>>;
  try {
    places = await findPlaceMany(requests);
  } catch (e) {
    console.warn(
      "[trips/generate] findPlaceMany threw; returning trip without place data:",
      e instanceof Error ? e.message : e
    );
    places = requests.map(() => null);
  }
  let i = 0;
  return {
    ...trip,
    days: trip.days.map((d) => ({
      dayNumber: d.dayNumber,
      activities: d.activities.map((a) => {
        const p = places[i++];
        return {
          ...a,
          latitude: p?.latitude ?? null,
          longitude: p?.longitude ?? null,
          placeId: p?.placeId ?? null,
          photoReference: p?.photoReference ?? null,
        };
      }),
    })),
  };
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
