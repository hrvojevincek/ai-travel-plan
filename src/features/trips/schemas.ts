import { z } from "zod";

export const ActivityTypeEnum = z.enum([
  "sightseeing",
  "food",
  "transport",
  "accommodation",
  "entertainment",
  "shopping",
  "other",
]);
export type ActivityTypeValue = z.infer<typeof ActivityTypeEnum>;

export const ActivityInput = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
  type: ActivityTypeEnum,
  durationMinutes: z.number().int().positive().nullish(),
  address: z.string().nullish(),
  estimatedCost: z.number().nonnegative().nullish(),
  orderIndex: z.number().int().min(0),
});
export type ActivityInputT = z.infer<typeof ActivityInput>;

export const DayInput = z.object({
  dayNumber: z.number().int().min(1),
  activities: z.array(ActivityInput),
});
export type DayInputT = z.infer<typeof DayInput>;

export const CreateTripInput = z.object({
  destination: z.string().min(1),
  summary: z.string().nullish(),
  totalEstimatedCost: z.number().nonnegative().nullish(),
  imageUrl: z.string().url().nullish(),
  imageAttribution: z.string().nullish(),
  days: z.array(DayInput).min(1),
});
export type CreateTripInputT = z.infer<typeof CreateTripInput>;

export const UpdateActivityInput = ActivityInput.partial();
export type UpdateActivityInputT = z.infer<typeof UpdateActivityInput>;
