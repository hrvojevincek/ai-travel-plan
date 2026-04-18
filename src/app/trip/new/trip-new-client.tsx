"use client";

import { RotateCw } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveTrip } from "@/features/trips/actions";
import { GeneratedTrip, type GeneratedTripT } from "@/features/trips/generate";
import { mockTrip } from "@/features/trips/mock";
import { TripView } from "@/features/trips/view";

type GenState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; trip: GeneratedTripT }
  | { status: "error"; message: string };

async function fetchGeneratedTrip(input: {
  destination: string;
  duration: number;
  preferences?: string;
}): Promise<GeneratedTripT> {
  const res = await fetch("/api/trips/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
  } & Record<string, unknown>;
  if (!res.ok) {
    throw new Error(body.error ?? "Couldn't generate your trip.");
  }
  const parsed = GeneratedTrip.safeParse(body);
  if (!parsed.success) {
    throw new Error("Trip came back in an unexpected format.");
  }
  return parsed.data;
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

  const [isSaving, startSaving] = useTransition();
  const autoSaveFired = useRef(false);

  const [state, setState] = useState<GenState>(() =>
    mock
      ? { status: "ready", trip: mockTrip as GeneratedTripT }
      : { status: "idle" }
  );

  const didSubmit = useRef(false);
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
    (data: GeneratedTripT) => {
      startSaving(async () => {
        const res = await saveTrip(data);
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
            saveOnLoad: "1",
          });
          const returnTo = `/trip/new?${qs.toString()}`;
          router.push(`/login?redirectTo=${encodeURIComponent(returnTo)}`);
          return;
        }
        toast.error(res.message ?? "Couldn't save trip. Please try again.");
      });
    },
    [destination, duration, preferences, router]
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
