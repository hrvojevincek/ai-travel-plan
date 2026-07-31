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
  name: z.string().min(1).describe("Venue or activity name"),
  description: z
    .string()
    .min(1)
    .describe("One short sentence describing the stop"),
  type: GeneratedActivityType.describe(
    "Slot type: breakfast, lunch, dinner, or activity"
  ),
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
    .describe("Estimated cost in local currency, as a number"),
});
export type GeneratedActivityT = z.infer<typeof GeneratedActivity>;

export const GeneratedDay = z.object({
  dayNumber: z.number().int().min(1).describe("1-based day index"),
  activities: z
    .array(GeneratedActivity)
    .length(ACTIVITIES_PER_DAY)
    .describe(
      `Exactly ${ACTIVITIES_PER_DAY} activities: breakfast, activity, activity, lunch, activity, activity, dinner`
    ),
});
export type GeneratedDayT = z.infer<typeof GeneratedDay>;

/** Loose trip schema (days ≥ 1) — used for types and response validation. */
export const GeneratedTrip = z.object({
  destination: z.string().min(1),
  summary: z.string().min(1),
  totalEstimatedCost: z.number().nonnegative(),
  days: z.array(GeneratedDay).min(1),
});
export type GeneratedTripT = z.infer<typeof GeneratedTrip>;

/** Duration-bound schema for generation — enforces days.length === duration. */
export function makeGeneratedTripSchema(duration: number) {
  return z.object({
    destination: z.string().min(1).describe("City or region being visited"),
    summary: z.string().min(1).describe("1-2 sentence trip pitch"),
    totalEstimatedCost: z
      .number()
      .nonnegative()
      .describe("Sum of all activity estimatedCost values, local currency"),
    days: z
      .array(GeneratedDay)
      .length(duration)
      .describe(`Exactly ${duration} days, numbered 1..${duration}`),
  });
}

// Extends the AI-produced trip with server-resolved place metadata on each
// activity. All four fields are nullish because:
//  - Places lookups can legitimately fail per-address,
//  - older callers (e.g. mock trip) don't carry them at all,
//  - not every place has a photo.
// Kept separate from GeneratedTrip so the AI prompt isn't told to produce
// coords/place_ids itself.
export const GeneratedResponseActivity = GeneratedActivity.extend({
  latitude: z.number().min(-90).max(90).nullish(),
  longitude: z.number().min(-180).max(180).nullish(),
  placeId: z.string().nullish(),
  photoReference: z.string().nullish(),
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
        latitude: "latitude" in a ? (a.latitude ?? null) : null,
        longitude: "longitude" in a ? (a.longitude ?? null) : null,
        placeId: "placeId" in a ? (a.placeId ?? null) : null,
        photoReference:
          "photoReference" in a ? (a.photoReference ?? null) : null,
        orderIndex,
      })),
    })),
  };
}

function mapActivityType(t: GeneratedActivityTypeT): ActivityTypeValue {
  return t === "activity" ? "other" : "food";
}
