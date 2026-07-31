"use client";

import { useQuery } from "@tanstack/react-query";
import { mapKeys } from "@/lib/query/keys";
import { resolveActivityPhotoUrl } from "../api/photos";

const ACTIVITY_PHOTO_STALE_TIME = 3_600_000;

export function activityPhotoQueryOptions(
  placeId: string | null | undefined,
  photoReference: string | null | undefined
) {
  return {
    queryKey: mapKeys.activityPhoto(placeId, photoReference),
    queryFn: () => resolveActivityPhotoUrl(placeId, photoReference),
    staleTime: ACTIVITY_PHOTO_STALE_TIME,
  };
}

export function useActivityPhotoQuery(
  placeId: string | null | undefined,
  photoReference: string | null | undefined
) {
  return useQuery({
    ...activityPhotoQueryOptions(placeId, photoReference),
    enabled: Boolean(placeId || photoReference),
  });
}
