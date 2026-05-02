"use client";

import { RotateCw } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchGeneratedTrip } from "@/features/trips/generate-client";
import { saveTrip } from "@/features/trips/actions";
import {
  type GeneratedTripResponseT,
} from "@/features/trips/generate";
import { mockTrip } from "@/features/trips/mock";
import {
  peekPrefetchedTrip,
  takePrefetchedTrip,
} from "@/features/trips/prefetch-cache";
import { TripView } from "@/features/trips/view";

type GenState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; trip: GeneratedTripResponseT }
  | { status: "error"; message: string };

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

  const [isSaving, startSaving] = useTransition();
  const autoSaveFired = useRef(false);

  const [state, setState] = useState<GenState>(() => {
    if (mock) return { status: "ready", trip: mockTrip as GeneratedTripResponseT };
    const prefetchedTrip = peekPrefetchedTrip({
      destination,
      duration,
      preferences,
    });
    return prefetchedTrip
      ? { status: "ready", trip: prefetchedTrip }
      : { status: "idle" };
  });

  const didSubmit = useRef(state.status === "ready");

  useEffect(() => {
    if (mock) return;
    const prefetchedTrip = takePrefetchedTrip({
      destination,
      duration,
      preferences,
    });
    if (!prefetchedTrip) return;
    didSubmit.current = true;
    setState((current) =>
      current.status === "idle"
        ? { status: "ready", trip: prefetchedTrip }
        : current
    );
  }, [mock, destination, duration, preferences]);

  const generate = useCallback(async () => {
    if (!destination) return;
    setState({ status: "loading" });
    try {
      const trip = await fetchGeneratedTrip({
        destination,
        duration,
        preferences,
      });
      setState({ status: "ready", trip });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Couldn't generate your trip.";
      setState({ status: "error", message });
      toast.error(message);
    }
  }, [destination, duration, preferences]);

  useEffect(() => {
    if (mock || didSubmit.current || !destination) return;
    didSubmit.current = true;
    void generate();
  }, [mock, destination, generate]);

  const trip = state.status === "ready" ? state.trip : undefined;
  const canSave = state.status === "ready" && !isSaving;

  const runSave = useCallback(
    (data: GeneratedTripResponseT) => {
      startSaving(async () => {
        const destinationPick =
          placeId && destinationLat != null && destinationLng != null
            ? { placeId, lat: destinationLat, lng: destinationLng }
            : undefined;
        const res = await saveTrip(data, { destination: destinationPick });
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
            ...(destinationLat != null ? { lat: String(destinationLat) } : {}),
            ...(destinationLng != null ? { lng: String(destinationLng) } : {}),
            saveOnLoad: "1",
          });
          const returnTo = `/trip/new?${qs.toString()}`;
          router.push(`/login?redirectTo=${encodeURIComponent(returnTo)}`);
          return;
        }
        toast.error(res.message ?? "Couldn't save trip. Please try again.");
      });
    },
    [
      destination,
      duration,
      preferences,
      placeId,
      destinationLat,
      destinationLng,
      router,
    ]
  );

  const handleSave = () => {
    if (state.status !== "ready" || isSaving) return;
    runSave(state.trip);
  };

  // After returning from login, auto-retry save once generation is ready.
  const shouldAutoSave = params.get("saveOnLoad") === "1";
  useEffect(() => {
    if (!shouldAutoSave || autoSaveFired.current) return;
    if (state.status !== "ready") return;
    autoSaveFired.current = true;
    runSave(state.trip);
  }, [shouldAutoSave, state, runSave]);

  if (!destination) {
    return <InvalidState />;
  }

  if (state.status === "error") {
    return (
      <ErrorState
        message={state.message}
        onRetry={() => {
          didSubmit.current = true;
          void generate();
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
      saveLabel={isSaving ? "Saving…" : "Save trip"}
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
