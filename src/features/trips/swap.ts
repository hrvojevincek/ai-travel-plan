import { openai } from "@ai-sdk/openai";
import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import type { AppDb } from "@/db/client";
import { getTrip } from "./data";
import { ActivityTypeEnum } from "./schemas";

export const SwapActivityOutput = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  type: ActivityTypeEnum,
  durationMinutes: z.number().int().positive(),
  address: z.string().min(1),
  estimatedCost: z.number().nonnegative(),
});
export type SwapActivityOutputT = z.infer<typeof SwapActivityOutput>;

export interface SwapActivityOpts {
  model?: LanguageModel;
}

export async function swapActivity(
  db: AppDb,
  tripId: string,
  activityId: string,
  opts: SwapActivityOpts = {},
): Promise<SwapActivityOutputT> {
  const trip = await getTrip(db, tripId);
  if (!trip) throw new Error(`trip ${tripId} not found`);

  const day = trip.days.find((d) => d.activities.some((a) => a.id === activityId));
  if (!day) throw new Error(`activity ${activityId} not found in trip ${tripId}`);

  const target = day.activities.find((a) => a.id === activityId);
  if (!target) throw new Error(`activity ${activityId} not found in trip ${tripId}`);

  const siblings = day.activities.filter((a) => a.id !== activityId);

  const schema = SwapActivityOutput.extend({ type: z.literal(target.type) });
  const prompt = buildPrompt({ trip, day, target, siblings });

  const model = opts.model ?? openai("gpt-4o-mini");
  const { object } = await generateObject({ model, schema, prompt });
  return object;
}

interface PromptArgs {
  trip: { destination: string; summary: string | null };
  day: { dayNumber: number };
  target: {
    name: string;
    description: string | null;
    type: string;
    orderIndex: number;
  };
  siblings: Array<{ name: string; type: string; orderIndex: number }>;
}

function buildPrompt({ trip, day, target, siblings }: PromptArgs): string {
  const siblingList = siblings.length
    ? siblings
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((s) => `- ${s.name} (${s.type})`)
        .join("\n")
    : "(none)";

  return [
    `The user is replacing a single activity in their ${trip.destination} itinerary.`,
    trip.summary ? `Trip summary: ${trip.summary}` : "",
    `Day ${day.dayNumber} — existing activities the traveler will still do:`,
    siblingList,
    "",
    `The activity to replace is:`,
    `- Name: ${target.name}`,
    target.description ? `- Description: ${target.description}` : "",
    `- Type: ${target.type}`,
    "",
    "Output requirements:",
    `- type MUST be "${target.type}" (preserve the slot).`,
    "- Name, description, address, duration, estimatedCost for the new activity.",
    "- Must be DIFFERENT from the activity being replaced.",
    "- Must NOT duplicate any of the existing activities listed above.",
    `- Should fit the vibe of day ${day.dayNumber} in ${trip.destination}.`,
    "- Address should be a real, searchable location.",
  ]
    .filter(Boolean)
    .join("\n");
}
