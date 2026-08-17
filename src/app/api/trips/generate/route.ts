import { db } from "@/db/client";
import { createCoordinator } from "@/features/trips/coordinate";
import { parse } from "@/features/trips/generate-request";
import { clientIp } from "@/lib/rate-limit";

export const maxDuration = 60;

const coordinator = createCoordinator({ db });

// Endpoint is intentionally unauthenticated per KRE-16/KRE-17 (unauth users can
// generate; auth is prompted at save time). Rate-limited per-IP via Upstash
// to cap OpenAI spend. Identical Generate requests share one Grounding run
// per instance and are cached — see `features/trips/coordinate`.
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = parse(json);
  if (!parsed.ok) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const result = await coordinator.coordinate({
    request: parsed.request,
    clientId: clientIp(req.headers),
    abortSignal: req.signal,
  });

  switch (result.outcome) {
    case "trip":
      return Response.json(result.trip);
    case "rate_limited":
      return new Response(JSON.stringify({ error: result.message }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(result.retryAfterSeconds),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": String(result.remaining),
          "X-RateLimit-Reset": String(result.reset),
        },
      });
    case "aborted":
      return new Response(null, { status: 499 });
    case "failed":
      return Response.json({ error: result.message }, { status: 502 });
  }
}
