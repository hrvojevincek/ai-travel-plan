import { openai } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { z } from "zod";
import { GeneratedTrip } from "@/features/trips/generate";

export const maxDuration = 60;

const Body = z.object({
  destination: z.string().min(1).max(100),
  duration: z.coerce.number().int().min(1).max(30),
  preferences: z.string().max(500).optional(),
});

const ACTIVITIES_PER_DAY = 7;

export async function POST(req: Request) {
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

  const result = streamObject({
    model: openai("gpt-4o-mini"),
    schema: GeneratedTrip,
    prompt,
  });

  return result.toTextStreamResponse();
}
