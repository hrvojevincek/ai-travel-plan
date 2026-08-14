"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { buildTripNewHref } from "@/features/home-search/schema";
import { isAbortError } from "@/lib/abort";
import { tripKeys } from "@/lib/query/keys";
import { fetchGeneratedTrip, type GenerateTripInput } from "../api/generate";
import type { GeneratedTripResponseT } from "../generate-schema";

export type GenerateTripMutationInput = GenerateTripInput & {
  placeId?: string;
  destinationLat?: number;
  destinationLng?: number;
};

export function useGenerateTripMutation() {
  const qc = useQueryClient();
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return useMutation({
    mutationFn: (input: GenerateTripMutationInput) => {
      const {
        placeId: _p,
        destinationLat: _lat,
        destinationLng: _lng,
        ...params
      } = input;
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      return fetchGeneratedTrip(params, ac.signal);
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
      if (isAbortError(e)) return;
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
    queryFn: ({ signal }) => fetchGeneratedTrip(params, signal),
    enabled: enabled && Boolean(params.destination),
    staleTime: Number.POSITIVE_INFINITY,
  });
}
