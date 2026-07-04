export const tripKeys = {
  all: ["trips"] as const,
  detail: (id: string) => [...tripKeys.all, "detail", id] as const,
  generate: (input: {
    destination: string;
    duration: number;
    preferences?: string;
  }) => [...tripKeys.all, "generate", input] as const,
};

export const mapKeys = {
  activityPhoto: (
    placeId: string | null | undefined,
    photoRef: string | null | undefined
  ) => ["maps", "activity-photo", placeId ?? "", photoRef ?? ""] as const,
};
