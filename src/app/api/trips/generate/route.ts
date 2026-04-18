import { z } from "zod";
import { generateTrip } from "@/features/trips/generate";
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

// Endpoint is intentionally unauthenticated per KRE-16/KRE-17 (unauth users can
// generate; auth is prompted at save time). Rate-limited per-IP via Upstash
// to cap OpenAI spend — see `lib/rate-limit`.
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
    const trip = await generateTrip(parsed.data);
    return Response.json(trip);
  } catch (error) {
    console.error("[trips/generate] failed:", error);
    return Response.json({ error: friendlyMessage(error) }, { status: 502 });
  }
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
