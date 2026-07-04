"use client";

import { useQuery } from "@tanstack/react-query";
import { mapKeys } from "@/lib/query/keys";
import { resolveActivityPhotoUrl } from "../api/photos";

export function useActivityPhotoQuery(
  placeId: string | null | undefined,
  photoReference: string | null | undefined
) {
  return useQuery({
    queryKey: mapKeys.activityPhoto(placeId, photoReference),
    queryFn: () => resolveActivityPhotoUrl(placeId, photoReference),
    enabled: Boolean(placeId || photoReference),
    staleTime: 3_600_000,
  });
}
