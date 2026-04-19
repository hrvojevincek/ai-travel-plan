import { openai } from "@ai-sdk/openai";
import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import type { ActivityTypeValue, CreateTripInputT } from "./schemas";

export const ACTIVITIES_PER_DAY = 7;

export const GeneratedActivityType = z.enum([
  "breakfast",
  "lunch",
  "dinner",
  "activity",
]);
export type GeneratedActivityTypeT = z.infer<typeof GeneratedActivityType>;

export const GeneratedActivity = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  type: GeneratedActivityType,
  durationMinutes: z.number().int().positive(),
  address: z.string().min(1),
  estimatedCost: z.number().nonnegative(),
});
export type GeneratedActivityT = z.infer<typeof GeneratedActivity>;

export const GeneratedDay = z.object({
  dayNumber: z.number().int().min(1),
  activities: z.array(GeneratedActivity).length(ACTIVITIES_PER_DAY),
});
export type GeneratedDayT = z.infer<typeof GeneratedDay>;

export const GeneratedTrip = z.object({
  destination: z.string().min(1),
  summary: z.string().min(1),
  totalEstimatedCost: z.number().nonnegative(),
  days: z.array(GeneratedDay).min(1),
});
export type GeneratedTripT = z.infer<typeof GeneratedTrip>;

// Extends the AI-produced trip with server-geocoded coords on each activity.
// Coords are nullish because geocoding can legitimately fail per-address and
// because older callers (e.g. mock trip) don't carry them at all. Kept
// separate from GeneratedTrip so the AI prompt isn't told to produce coords.
export const GeneratedResponseActivity = GeneratedActivity.extend({
  latitude: z.number().min(-90).max(90).nullish(),
  longitude: z.number().min(-180).max(180).nullish(),
});
export type GeneratedResponseActivityT = z.infer<
  typeof GeneratedResponseActivity
>;

export const GeneratedResponseDay = z.object({
  dayNumber: z.number().int().min(1),
  activities: z.array(GeneratedResponseActivity).length(ACTIVITIES_PER_DAY),
});
export type GeneratedResponseDayT = z.infer<typeof GeneratedResponseDay>;

export const GeneratedTripResponse = z.object({
  destination: z.string().min(1),
  summary: z.string().min(1),
  totalEstimatedCost: z.number().nonnegative(),
  days: z.array(GeneratedResponseDay).min(1),
});
export type GeneratedTripResponseT = z.infer<typeof GeneratedTripResponse>;

export interface GenerateTripOpts {
  destination: string;
  duration: number;
  preferences?: string;
  model?: LanguageModel;
}

export async function generateTrip(
  opts: GenerateTripOpts
): Promise<GeneratedTripT> {
  const model = opts.model ?? openai("gpt-4o-mini");
  const { object } = await generateObject({
    model,
    schema: GeneratedTrip,
    prompt: buildPrompt(opts),
  });
  return object;
}

export function toCreateTripInput(
  g: GeneratedTripT | GeneratedTripResponseT
): CreateTripInputT {
  return {
    destination: g.destination,
    summary: g.summary,
    totalEstimatedCost: g.totalEstimatedCost,
    imageUrl: null,
    imageAttribution: null,
    days: g.days.map((d) => ({
      dayNumber: d.dayNumber,
      activities: d.activities.map((a, orderIndex) => ({
        name: a.name,
        description: a.description,
        type: mapActivityType(a.type),
        durationMinutes: a.durationMinutes,
        address: a.address,
        estimatedCost: a.estimatedCost,
        latitude: "latitude" in a ? a.latitude : null,
        longitude: "longitude" in a ? a.longitude : null,
        orderIndex,
      })),
    })),
  };
}

function mapActivityType(t: GeneratedActivityTypeT): ActivityTypeValue {
  return t === "activity" ? "other" : "food";
}

function buildPrompt({
  destination,
  duration,
  preferences,
}: GenerateTripOpts): string {
  const prefLine = preferences?.trim()
    ? `Traveler preferences (treat as hard constraints when possible): ${preferences}`
    : "No special preferences — default to broadly appealing choices.";

  return [
    `You are an expert travel planner. Plan a ${duration}-day trip to ${destination}.`,
    "",
    "Output requirements:",
    `- Exactly ${duration} days, numbered 1..${duration}.`,
    `- Each day contains exactly ${ACTIVITIES_PER_DAY} activities in this order:`,
    "  1. breakfast",
    "  2. activity",
    "  3. activity",
    "  4. lunch",
    "  5. activity",
    "  6. activity",
    "  7. dinner",
    "- Meals (breakfast/lunch/dinner) must have the corresponding `type` value.",
    "- Non-meal items must have `type: activity`.",
    "- Durations in minutes. Estimated costs in the local currency, as numbers.",
    "- Addresses should be real, searchable locations in or near the destination.",
    "- `summary` is a 1-2 sentence pitch.",
    "- `totalEstimatedCost` sums per-activity costs across all days.",
    "",
    prefLine,
  ].join("\n");
}
