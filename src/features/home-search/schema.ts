import { z } from "zod";
import {
  GENERATE_REQUEST_LIMITS,
  GenerateRequestSchema,
  parse,
  toSearchParams,
} from "@/features/trips/generate-request";

export { GENERATE_REQUEST_LIMITS };

const preferencesField = GenerateRequestSchema.shape.preferences;

export const SearchFormSchema = GenerateRequestSchema.extend({
  preferences: preferencesField.default(""),
  placeId: z.string().optional(),
  destinationLat: z.number().min(-90).max(90).optional(),
  destinationLng: z.number().min(-180).max(180).optional(),
});

export type SearchFormValues = z.infer<typeof SearchFormSchema>;

export function buildTripNewHref(values: SearchFormValues): string {
  const parsed = parse(values);
  if (!parsed.ok) {
    throw new Error("buildTripNewHref: invalid generate request");
  }
  const params = toSearchParams(parsed.request);
  if (values.placeId) params.set("placeId", values.placeId);
  if (values.destinationLat != null) {
    params.set("lat", String(values.destinationLat));
  }
  if (values.destinationLng != null) {
    params.set("lng", String(values.destinationLng));
  }
  return `/trip/new?${params.toString()}`;
}
