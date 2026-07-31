import "server-only";

import type { LanguageModel } from "ai";
import { z } from "zod";
import { generateObjectResilient } from "@/lib/llm";
import {
  ACTIVITIES_PER_DAY,
  GeneratedActivity,
  type GeneratedActivityTypeT,
  type GeneratedTripT,
  makeGeneratedTripSchema,
} from "./generate-schema";

export type {
  GeneratedActivityT,
  GeneratedActivityTypeT,
  GeneratedDayT,
  GeneratedResponseActivityT,
  GeneratedResponseDayT,
  GeneratedTripResponseT,
  GeneratedTripT,
} from "./generate-schema";
export {
  ACTIVITIES_PER_DAY,
  GeneratedActivity,
  GeneratedActivityType,
  GeneratedDay,
  GeneratedResponseActivity,
  GeneratedResponseDay,
  GeneratedTrip,
  GeneratedTripResponse,
  makeGeneratedTripSchema,
  toCreateTripInput,
} from "./generate-schema";

export interface GenerateTripOpts {
  destination: string;
  duration: number;
  preferences?: string;
  model?: LanguageModel;
}

export const TRIP_SYSTEM_PROMPT = [
  "You are an expert travel planner.",
  "Rules (always follow):",
  "- Real, searchable venues only — no fictional places.",
  "- Keep each day's activities geographically clustered; allow 15-30 min transit between stops.",
  "- Total scheduled time per day (durations + transit) must not exceed 12 hours.",
  "- Meals must be real restaurants/cafés appropriate for that meal slot.",
  "- Addresses must be complete enough to find on Google Maps.",
].join("\n");

export async function generateTrip(
  opts: GenerateTripOpts
): Promise<GeneratedTripT> {
  const { object } = await generateObjectResilient({
    schema: makeGeneratedTripSchema(opts.duration),
    system: TRIP_SYSTEM_PROMPT,
    prompt: buildPrompt(opts),
    model: opts.model,
    context: "generateTrip",
  });
  return object;
}

/** Slots that failed Places grounding and need an LLM replacement. */
export interface UngroundedSlot {
  dayIdx: number;
  actIdx: number;
  previousName: string;
  type: GeneratedActivityTypeT;
}

const ReplacementBatch = z.object({
  replacements: z.array(
    z.object({
      dayIdx: z.number().int().min(0).describe("0-based day index in the trip"),
      actIdx: z
        .number()
        .int()
        .min(0)
        .max(ACTIVITIES_PER_DAY - 1)
        .describe("0-based activity index within the day"),
      activity: GeneratedActivity,
    })
  ),
});

/**
 * Ask the model to replace activities that could not be grounded in Google
 * Places. Preserves slot types; forbids reusing any name already on the trip.
 */
export async function regenerateUngroundedActivities(
  opts: GenerateTripOpts,
  trip: GeneratedTripT,
  failures: UngroundedSlot[]
): Promise<GeneratedTripT> {
  if (failures.length === 0) return trip;

  const forbidden = trip.days
    .flatMap((d) => d.activities.map((a) => a.name))
    .join(", ");

  const failureLines = failures
    .map(
      (f) =>
        `- dayIdx=${f.dayIdx} actIdx=${f.actIdx} type=${f.type} previous="${f.previousName}"`
    )
    .join("\n");

  const schema = ReplacementBatch.extend({
    replacements: z
      .array(ReplacementBatch.shape.replacements.element)
      .length(failures.length),
  });

  const { object } = await generateObjectResilient({
    schema,
    system: TRIP_SYSTEM_PROMPT,
    prompt: [
      `Replace ${failures.length} itinerary stop(s) in ${opts.destination} that could not be found on Google Maps.`,
      "",
      "Failed slots (return one replacement for each, same dayIdx/actIdx/type):",
      failureLines,
      "",
      `Do NOT reuse any of these existing names: ${forbidden}`,
      "Each replacement must be a real, different venue with a searchable street address.",
      opts.preferences?.trim()
        ? `Traveler preferences: ${opts.preferences}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    model: opts.model,
    context: "regenerateUngrounded",
  });

  const next: GeneratedTripT = {
    ...trip,
    days: trip.days.map((d) => ({
      ...d,
      activities: d.activities.map((a) => ({ ...a })),
    })),
  };

  for (const r of object.replacements) {
    const day = next.days[r.dayIdx];
    if (!day || !day.activities[r.actIdx]) continue;
    const expectedType = failures.find(
      (f) => f.dayIdx === r.dayIdx && f.actIdx === r.actIdx
    )?.type;
    if (expectedType && r.activity.type !== expectedType) {
      r.activity = { ...r.activity, type: expectedType };
    }
    day.activities[r.actIdx] = r.activity;
  }

  next.totalEstimatedCost = next.days.reduce(
    (sum, d) =>
      sum + d.activities.reduce((s, a) => s + (a.estimatedCost ?? 0), 0),
    0
  );

  return next;
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
    `Plan a ${duration}-day trip to ${destination}.`,
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
