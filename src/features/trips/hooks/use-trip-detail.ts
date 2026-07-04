"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { tripKeys } from "@/lib/query/keys";
import {
  deleteTripAction,
  type SwapActivityResult,
  swapActivityAction,
} from "../actions";
import type { PartialTrip } from "../view";

export function useDeleteTripMutation() {
  const router = useRouter();

  return useMutation({
    mutationFn: (tripId: string) => deleteTripAction(tripId),
    onSuccess: (res, _tripId) => {
      if (res.ok) {
        router.refresh();
        return;
      }
      toast.error(res.message ?? "Couldn't delete trip. Please try again.");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error
          ? err.message
          : "Couldn't delete trip. Please try again."
      );
    },
  });
}

interface UseTripDetailOptions {
  tripId: string;
  initialTrip: PartialTrip;
}

export function useTripDetail({ tripId, initialTrip }: UseTripDetailOptions) {
  const qc = useQueryClient();
  const [swappingId, setSwappingId] = useState<string | null>(null);

  const { data: trip } = useQuery<PartialTrip>({
    queryKey: tripKeys.detail(tripId),
    queryFn: () => initialTrip,
    initialData: initialTrip,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const swapMutation = useMutation<
    SwapActivityResult,
    Error,
    string,
    { previousTrip: PartialTrip | undefined }
  >({
    mutationFn: (activityId) => swapActivityAction(tripId, activityId),
    onMutate: async (activityId) => {
      setSwappingId(activityId);
      await qc.cancelQueries({ queryKey: tripKeys.detail(tripId) });
      const previousTrip = qc.getQueryData<PartialTrip>(
        tripKeys.detail(tripId)
      );
      return { previousTrip };
    },
    onSuccess: (res, activityId, ctx) => {
      if (!res.ok) {
        if (ctx?.previousTrip) {
          qc.setQueryData(tripKeys.detail(tripId), ctx.previousTrip);
        }
        const msg =
          res.code === "UNAUTH"
            ? "Sign in to swap activities."
            : res.code === "NOT_FOUND"
              ? "Activity no longer exists."
              : (res.message ?? "Couldn't swap activity. Please try again.");
        toast.error(msg);
        return;
      }

      qc.setQueryData<PartialTrip>(tripKeys.detail(tripId), (old) =>
        old ? replaceActivity(old, activityId, res.activity) : old
      );
      toast.success(`Swapped to "${res.activity.name}".`);
    },
    onError: (err, _activityId, ctx) => {
      if (ctx?.previousTrip) {
        qc.setQueryData(tripKeys.detail(tripId), ctx.previousTrip);
      }
      toast.error(err.message || "Couldn't swap activity. Please try again.");
    },
    onSettled: () => {
      setSwappingId(null);
    },
  });

  return {
    trip,
    swappingId,
    swapActivity: swapMutation.mutate,
  };
}

type SwappedActivity = Extract<SwapActivityResult, { ok: true }>["activity"];

function replaceActivity(
  trip: PartialTrip,
  activityId: string,
  next: SwappedActivity
): PartialTrip {
  return {
    ...trip,
    days: trip.days?.map((day) => {
      if (!day?.activities) return day;
      const idx = day.activities.findIndex((a) => a?.id === activityId);
      if (idx === -1) return day;
      const activities = day.activities.slice();
      activities[idx] = {
        ...activities[idx],
        id: next.id,
        name: next.name,
        description: next.description ?? undefined,
        type: next.type,
        durationMinutes: next.durationMinutes ?? undefined,
        address: next.address ?? undefined,
        estimatedCost: next.estimatedCost ?? undefined,
        latitude: next.latitude,
        longitude: next.longitude,
        placeId: next.placeId,
        photoReference: next.photoReference,
      };
      return { ...day, activities };
    }),
  };
}
