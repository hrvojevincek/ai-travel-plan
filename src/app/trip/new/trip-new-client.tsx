"use client";

import { RotateCw } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { GeneratedTripResponseT } from "@/features/trips/generate";
import { useGeneratedTripQuery } from "@/features/trips/hooks/use-generate-trip";
import { useSaveTripMutation } from "@/features/trips/hooks/use-save-trip";
import { mockTrip } from "@/features/trips/mock";
import { TripView } from "@/features/trips/view";

function parseNumericParam(
  value: string | null,
  min: number,
  max: number
): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

export function TripNewClient() {
  const params = useSearchParams();
  const router = useRouter();
  const destination = params.get("destination") ?? "";
  const duration = Math.max(
    1,
    Math.min(30, Number(params.get("duration")) || 3)
  );
  const preferences = params.get("preferences") ?? undefined;
  const mock = params.get("mock") === "1";
  const destinationLat = parseNumericParam(params.get("lat"), -90, 90);
  const destinationLng = parseNumericParam(params.get("lng"), -180, 180);
  const placeId = params.get("placeId") || undefined;

  const autoSaveFired = useRef(false);
  const saveMutation = useSaveTripMutation();

  const {
    data: generatedTrip,
    isError,
    error,
    refetch,
  } = useGeneratedTripQuery({
    destination,
    duration,
    preferences,
    enabled: !mock,
  });

  const trip: GeneratedTripResponseT | undefined = mock
    ? (mockTrip as GeneratedTripResponseT)
    : generatedTrip;

  const canSave = Boolean(trip) && !saveMutation.isPending;

  const runSave = useCallback(
    (data: GeneratedTripResponseT) => {
      const destinationPick =
        placeId && destinationLat != null && destinationLng != null
          ? { placeId, lat: destinationLat, lng: destinationLng }
          : undefined;

      saveMutation.mutate(
        { trip: data, opts: { destination: destinationPick } },
        {
          onSuccess: (res) => {
            if (res.ok) {
              router.push(`/trip/${res.id}`);
              return;
            }
            if (res.code === "UNAUTH") {
              toast.info("Sign in to save your trip.");
              const qs = new URLSearchParams({
                destination,
                duration: String(duration),
                ...(preferences ? { preferences } : {}),
                ...(placeId ? { placeId } : {}),
                ...(destinationLat != null
                  ? { lat: String(destinationLat) }
                  : {}),
                ...(destinationLng != null
                  ? { lng: String(destinationLng) }
                  : {}),
                saveOnLoad: "1",
              });
              const returnTo = `/trip/new?${qs.toString()}`;
              router.push(`/login?redirectTo=${encodeURIComponent(returnTo)}`);
              return;
            }
            toast.error(res.message ?? "Couldn't save trip. Please try again.");
          },
        }
      );
    },
    [
      destination,
      duration,
      preferences,
      placeId,
      destinationLat,
      destinationLng,
      router,
      saveMutation,
    ]
  );

  const handleSave = () => {
    if (!trip || saveMutation.isPending) return;
    runSave(trip);
  };

  const shouldAutoSave = params.get("saveOnLoad") === "1";
  useEffect(() => {
    if (!shouldAutoSave || autoSaveFired.current) return;
    if (!trip) return;
    autoSaveFired.current = true;
    runSave(trip);
  }, [shouldAutoSave, trip, runSave]);

  if (!destination) {
    return <InvalidState />;
  }

  if (isError) {
    const message =
      error instanceof Error ? error.message : "Couldn't generate your trip.";
    return (
      <ErrorState
        message={message}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  return (
    <TripView
      trip={trip}
      expectedDays={duration}
      destination={destination}
      destinationLat={destinationLat}
      destinationLng={destinationLng}
      canSave={canSave}
      saveLabel={saveMutation.isPending ? "Saving…" : "Save trip"}
      onSave={handleSave}
    />
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-2xl font-bold">Couldn&apos;t plan that trip</h2>
      <p className="text-muted-foreground">{message}</p>
      <div className="flex gap-2">
        <Button onClick={onRetry}>
          <RotateCw className="mr-1 h-4 w-4" />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back to search</Link>
        </Button>
      </div>
    </div>
  );
}

function InvalidState() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-2xl font-bold">Missing trip details</h2>
      <p className="text-muted-foreground">
        Start from the home page to plan a new trip.
      </p>
      <Button asChild>
        <Link href="/">Back to search</Link>
      </Button>
    </div>
  );
}
