"use client";

import { useMutation } from "@tanstack/react-query";
import { type SaveTripOpts, type SaveTripResult, saveTrip } from "../actions";
import type { GeneratedTripResponseT } from "../generate";

interface SaveTripVariables {
  trip: GeneratedTripResponseT;
  opts?: SaveTripOpts;
}

export function useSaveTripMutation() {
  return useMutation<SaveTripResult, Error, SaveTripVariables>({
    mutationFn: ({ trip, opts }) => saveTrip(trip, opts),
  });
}
