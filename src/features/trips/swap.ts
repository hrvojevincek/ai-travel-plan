import "server-only";

import type { LanguageModel } from "ai";
import { z } from "zod";
import type { AppDb } from "@/db/client";
import { generateObjectResilient } from "@/lib/llm";
import {
  type ActivityPlaceLookup,
  lookupActivityPlaces,
} from "./activity-places";
import { getTrip } from "./data";
import { type FindPlaceResult, findPlaceMany } from "./find-place";
import { ActivityTypeEnum } from "./schemas";

export const SwapActivityOutput = z.object({
  name: z.string().min(1).describe("Replacement venue or activity name"),
  description: z
    .string()
    .min(1)
    .describe("One short sentence describing the stop"),
  type: ActivityTypeEnum.describe("Must match the slot being replaced"),
  durationMinutes: z
    .number()
    .int()
    .positive()
    .describe("How long to spend here, in minutes"),
  address: z
    .string()
    .min(1)
    .describe("Real street address searchable in Google Maps"),
  estimatedCost: z
    .number()
    .nonnegative()
    .describe("Estimated cost in local currency"),
});
export type SwapActivityOutputT = z.infer<typeof SwapActivityOutput>;

export type SwapActivityReplacement = SwapActivityOutputT & {
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  photoReference: string | null;
};

export interface SwapActivityOpts {
  model?: LanguageModel;
  abortSignal?: AbortSignal;
  lookupPlaces?: ActivityPlaceLookup;
}

export const SWAP_SYSTEM_PROMPT = [
  "You are an expert travel planner replacing a single itinerary stop.",
  "Rules:",
  "- Suggest only real, searchable venues — no fictional places.",
  "- Keep the replacement geographically compatible with the day's other stops.",
  "- Preserve the activity type/slot exactly.",
  "- Addresses must be complete enough to find on Google Maps.",
].join("\n");

export async function swapActivity(
  db: AppDb,
  tripId: string,
  activityId: string,
  opts: SwapActivityOpts = {}
): Promise<SwapActivityReplacement> {
  const trip = await getTrip(db, tripId);
  if (!trip) throw new Error(`trip ${tripId} not found`);

  const day = trip.days.find((d) =>
    d.activities.some((a) => a.id === activityId)
  );
  if (!day)
    throw new Error(`activity ${activityId} not found in trip ${tripId}`);

  const target = day.activities.find((a) => a.id === activityId);
  if (!target)
    throw new Error(`activity ${activityId} not found in trip ${tripId}`);

  const siblings = day.activities.filter((a) => a.id !== activityId);
  // Snapshot after the throws so the nested proposer keeps narrowed types.
  const promptBase = { trip, day, target, siblings };

  const schema = SwapActivityOutput.extend({ type: z.literal(target.type) });
  const forbiddenNames = new Set<string>(
    [target.name, ...siblings.map((s) => s.name)].map(normalizeName)
  );

  async function proposeUnique(
    unfindableName: string | null
  ): Promise<SwapActivityOutputT> {
    let duplicate: SwapActivityOutputT | null = null;
    for (let attempt = 1; attempt <= MAX_SWAP_ATTEMPTS; attempt++) {
      const prompt = buildPrompt({
        ...promptBase,
        previousDuplicateName: duplicate?.name ?? null,
        unfindableName,
      });
      const { object } = await generateObjectResilient({
        schema,
        system: SWAP_SYSTEM_PROMPT,
        prompt,
        model: opts.model,
        abortSignal: opts.abortSignal,
        context: "swapActivity",
      });
      if (!forbiddenNames.has(normalizeName(object.name))) return object;
      duplicate = object;
    }

    throw new Error(
      `swapActivity: model returned duplicate activity "${duplicate?.name}" after ${MAX_SWAP_ATTEMPTS} attempts`
    );
  }

  let suggestion = await proposeUnique(null);

  if (!placesKeyConfigured() && !opts.lookupPlaces) {
    return attachPlace(suggestion, null);
  }

  const lookup = opts.lookupPlaces ?? findPlaceMany;
  const place = await lookupOne(suggestion, trip.destination, lookup);
  if (place) return attachPlace(suggestion, place);

  forbiddenNames.add(normalizeName(suggestion.name));
  suggestion = await proposeUnique(suggestion.name);
  const repaired = await lookupOne(suggestion, trip.destination, lookup);
  return attachPlace(suggestion, repaired);
}

const MAX_SWAP_ATTEMPTS = 2;

function placesKeyConfigured(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_SERVER_KEY?.trim());
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function attachPlace(
  suggestion: SwapActivityOutputT,
  place: FindPlaceResult | null
): SwapActivityReplacement {
  return {
    ...suggestion,
    latitude: place?.latitude ?? null,
    longitude: place?.longitude ?? null,
    placeId: place?.placeId ?? null,
    photoReference: place?.photoReference ?? null,
  };
}

async function lookupOne(
  suggestion: SwapActivityOutputT,
  destination: string,
  lookup: ActivityPlaceLookup
): Promise<FindPlaceResult | null> {
  const [place] = await lookupActivityPlaces(
    [{ name: suggestion.name, address: suggestion.address }],
    destination,
    lookup
  );
  return place ?? null;
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
  previousDuplicateName: string | null;
  unfindableName: string | null;
}

function buildPrompt({
  trip,
  day,
  target,
  siblings,
  previousDuplicateName,
  unfindableName,
}: PromptArgs): string {
  const siblingList = siblings.length
    ? siblings
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((s) => `- ${s.name} (${s.type})`)
        .join("\n")
    : "(none)";

  const retryNote = previousDuplicateName
    ? `Your previous suggestion "${previousDuplicateName}" duplicates an existing activity. Pick a completely different one.`
    : "";

  const unfindableNote = unfindableName
    ? `Your previous suggestion "${unfindableName}" could not be found on Google Maps. Pick a completely different real, searchable venue.`
    : "";

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
    retryNote,
    unfindableNote,
    "Output requirements:",
    `- type MUST be "${target.type}" (preserve the slot).`,
    "- Name, description, address, durationMinutes, estimatedCost for the new activity.",
    "- Must be DIFFERENT from the activity being replaced.",
    "- Must NOT duplicate any of the existing activities listed above.",
    `- Should fit the vibe of day ${day.dayNumber} in ${trip.destination}.`,
    "- Address should be a real, searchable location.",
  ]
    .filter(Boolean)
    .join("\n");
}
