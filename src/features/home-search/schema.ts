import { z } from "zod";

export const MAX_DURATION_DAYS = 30;
export const MAX_PREFERENCES_LENGTH = 500;

export const SearchFormSchema = z.object({
  destination: z
    .string()
    .trim()
    .min(1, "Where are you going?")
    .max(100, "Destination is too long"),
  duration: z.coerce
    .number({ error: "Duration is required" })
    .int("Duration must be a whole number")
    .min(1, "At least 1 day")
    .max(MAX_DURATION_DAYS, `Max ${MAX_DURATION_DAYS} days`),
  preferences: z
    .string()
    .trim()
    .max(MAX_PREFERENCES_LENGTH, "Preferences are too long")
    .optional()
    .default(""),
  // Populated by Places Autocomplete when the user picks a suggestion.
  // Absent when the user typed freely and submitted without picking.
  placeId: z.string().optional(),
  destinationLat: z.number().min(-90).max(90).optional(),
  destinationLng: z.number().min(-180).max(180).optional(),
});

export type SearchFormValues = z.infer<typeof SearchFormSchema>;

export function buildTripNewHref(values: SearchFormValues): string {
  const params = new URLSearchParams();
  params.set("destination", values.destination);
  params.set("duration", String(values.duration));
  if (values.preferences && values.preferences.length > 0) {
    params.set("preferences", values.preferences);
  }
  if (values.placeId) params.set("placeId", values.placeId);
  if (values.destinationLat != null)
    params.set("lat", String(values.destinationLat));
  if (values.destinationLng != null)
    params.set("lng", String(values.destinationLng));
  return `/trip/new?${params.toString()}`;
}
