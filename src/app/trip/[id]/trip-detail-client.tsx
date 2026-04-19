"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  type SwapActivityResult,
  swapActivityAction,
} from "@/features/trips/actions";
import { type PartialTrip, TripView } from "@/features/trips/view";

interface TripDetailClientProps {
  tripId: string;
  initialTrip: PartialTrip;
  expectedDays: number;
  destination: string;
  destinationLat: number | null;
  destinationLng: number | null;
}

const tripKey = (id: string) => ["trip", id] as const;

export function TripDetailClient({
  tripId,
  initialTrip,
  expectedDays,
  destination,
  destinationLat,
  destinationLng,
}: TripDetailClientProps) {
  const qc = useQueryClient();
  const [swappingId, setSwappingId] = useState<string | null>(null);

  // Seeded from server render — the query never re-fetches on mount because
  // its `queryFn` is the initial data itself. Purely a cache handle for
  // optimistic updates via `setQueryData`.
  const { data: trip } = useQuery<PartialTrip>({
    queryKey: tripKey(tripId),
    queryFn: () => initialTrip,
    initialData: initialTrip,
    staleTime: Infinity,
  });

  const mutation = useMutation<
    SwapActivityResult,
    Error,
    string,
    { previousTrip: PartialTrip | undefined }
  >({
    mutationFn: (activityId) => swapActivityAction(tripId, activityId),
    onMutate: async (activityId) => {
      setSwappingId(activityId);
      await qc.cancelQueries({ queryKey: tripKey(tripId) });
      const previousTrip = qc.getQueryData<PartialTrip>(tripKey(tripId));
      return { previousTrip };
    },
    onSuccess: (res, activityId, ctx) => {
      if (!res.ok) {
        // Revert to pre-mutate snapshot so the card returns from its
        // skeleton state to the original activity.
        if (ctx?.previousTrip) {
          qc.setQueryData(tripKey(tripId), ctx.previousTrip);
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

      qc.setQueryData<PartialTrip>(tripKey(tripId), (old) =>
        old ? replaceActivity(old, activityId, res.activity) : old
      );
      toast.success(`Swapped to "${res.activity.name}".`);
    },
    onError: (err, _activityId, ctx) => {
      if (ctx?.previousTrip) {
        qc.setQueryData(tripKey(tripId), ctx.previousTrip);
      }
      toast.error(err.message || "Couldn't swap activity. Please try again.");
    },
    onSettled: () => {
      setSwappingId(null);
    },
  });

  return (
    <TripView
      trip={trip}
      expectedDays={expectedDays}
      destination={destination}
      destinationLat={destinationLat}
      destinationLng={destinationLng}
      onSwapActivity={(activityId) => mutation.mutate(activityId)}
      swappingActivityId={swappingId}
    />
  );
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
      // PartialActivity uses `undefined` for absent fields, while the action
      // returns `null`. Coerce so PartialTrip's types stay consistent.
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
