"use client";

import { useTripDetail } from "@/features/trips/hooks/use-trip-detail";
import { type PartialTrip, TripView } from "@/features/trips/view";

interface TripDetailClientProps {
  tripId: string;
  initialTrip: PartialTrip;
  expectedDays: number;
  destination: string;
  destinationLat: number | null;
  destinationLng: number | null;
}

export function TripDetailClient({
  tripId,
  initialTrip,
  expectedDays,
  destination,
  destinationLat,
  destinationLng,
}: TripDetailClientProps) {
  const { trip, swappingId, swapActivity } = useTripDetail({
    tripId,
    initialTrip,
  });

  return (
    <TripView
      trip={trip}
      expectedDays={expectedDays}
      destination={destination}
      destinationLat={destinationLat}
      destinationLng={destinationLng}
      onSwapActivity={swapActivity}
      swappingActivityId={swappingId}
    />
  );
}
