import { openai } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { z } from "zod";
import { GeneratedTrip } from "@/features/trips/generate";
import { checkTripGenerateLimit, clientIp } from "@/lib/rate-limit";

// Edge runtime: cheaper cold-starts and better streaming tolerance on Hobby
// plans (Node serverless capped at 60s total; Edge keeps long streams alive).
export const runtime = "edge";
export const maxDuration = 60;

const Body = z.object({
  destination: z.string().min(1).max(100),
  duration: z.coerce.number().int().min(1).max(30),
  preferences: z.string().max(500).optional(),
});

const ACTIVITIES_PER_DAY = 7;

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

  const { destination, duration, preferences } = parsed.data;
  const prefLine = preferences?.trim()
    ? `Traveler preferences (treat as hard constraints when possible): ${preferences}`
    : "No special preferences — default to broadly appealing choices.";

  const prompt = [
    `You are an expert travel planner. Plan a ${duration}-day trip to ${destination}.`,
    "",
    "Output requirements:",
    `- Exactly ${duration} days, numbered 1..${duration}.`,
    `- Each day contains exactly ${ACTIVITIES_PER_DAY} activities in this order:`,
    "  1. breakfast  2. activity  3. activity  4. lunch  5. activity  6. activity  7. dinner",
    "- Meals (breakfast/lunch/dinner) must have the corresponding `type` value.",
    "- Non-meal items must have `type: activity`.",
    "- Durations in minutes. Estimated costs in EUR as numbers.",
    "- Addresses should be real, searchable locations in or near the destination.",
    "- `summary` is a 1-2 sentence pitch.",
    "- `totalEstimatedCost` sums per-activity costs across all days.",
    "",
    prefLine,
  ].join("\n");

  try {
    const result = streamObject({
      model: openai("gpt-4o-mini"),
      schema: GeneratedTrip,
      prompt,
      onError: ({ error }) => {
        console.error("[trips/generate] stream error:", error);
        throw new Error(friendlyMessage(error));
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("[trips/generate] sync error:", error);
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
