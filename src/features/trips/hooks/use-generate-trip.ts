"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { buildTripNewHref } from "@/features/home-search/schema";
import { tripKeys } from "@/lib/query/keys";
import { fetchGeneratedTrip, type GenerateTripInput } from "../api/generate";
import type { GeneratedTripResponseT } from "../generate";

export type GenerateTripMutationInput = GenerateTripInput & {
  placeId?: string;
  destinationLat?: number;
  destinationLng?: number;
};

export function useGenerateTripMutation() {
  const qc = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: GenerateTripMutationInput) => {
      const {
        placeId: _p,
        destinationLat: _lat,
        destinationLng: _lng,
        ...params
      } = input;
      return fetchGeneratedTrip(params);
    },
    onSuccess: (trip, vars) => {
      const { placeId, destinationLat, destinationLng, ...params } = vars;
      qc.setQueryData(tripKeys.generate(params), trip);
      router.push(
        buildTripNewHref({
          destination: vars.destination,
          duration: vars.duration,
          preferences: vars.preferences ?? "",
          placeId,
          destinationLat,
          destinationLng,
        })
      );
    },
    onError: (e) => {
      const message =
        e instanceof Error ? e.message : "Couldn't generate your trip.";
      toast.error(message);
    },
  });
}

export function useGeneratedTripQuery(
  input: GenerateTripInput & { enabled?: boolean }
) {
  const { enabled = true, ...params } = input;

  return useQuery<GeneratedTripResponseT>({
    queryKey: tripKeys.generate(params),
    queryFn: () => fetchGeneratedTrip(params),
    enabled: enabled && Boolean(params.destination),
    staleTime: Number.POSITIVE_INFINITY,
  });
}
