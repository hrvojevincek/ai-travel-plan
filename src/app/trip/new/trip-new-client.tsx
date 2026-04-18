"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { RotateCw } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveTrip } from "@/features/trips/actions";
import { GeneratedTrip } from "@/features/trips/generate";
import { mockTrip } from "@/features/trips/mock";
import { TripView } from "@/features/trips/view";

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

  const { object, submit, isLoading, error, stop } = useObject({
    api: "/api/trips/generate",
    schema: GeneratedTrip,
  });

  const didSubmit = useRef(false);
  useEffect(() => {
    if (mock || didSubmit.current || !destination) return;
    didSubmit.current = true;
    submit({ destination, duration, preferences });
  }, [mock, destination, duration, preferences, submit]);

  const trip = mock ? mockTrip : object;
  const canSave = !isLoading && !isSaving && !!trip?.days?.length;

  const runSave = useCallback(
    (data: unknown) => {
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
    if (!trip || isLoading || isSaving) return;
    const parsed = GeneratedTrip.safeParse(trip);
    if (!parsed.success) {
      toast.error("Trip isn't ready yet. Wait for generation to finish.");
      return;
    }
    runSave(parsed.data);
  };

  // After returning from login, auto-retry save once generation is ready.
  const shouldAutoSave = params.get("saveOnLoad") === "1";
  useEffect(() => {
    if (!shouldAutoSave || autoSaveFired.current || !canSave) return;
    const parsed = GeneratedTrip.safeParse(trip);
    if (!parsed.success) return;
    autoSaveFired.current = true;
    runSave(parsed.data);
  }, [shouldAutoSave, canSave, trip, runSave]);

  if (!destination) {
    return <InvalidState />;
  }

  if (error) {
    return (
      <ErrorState
        message={error.message}
        onRetry={() => {
          didSubmit.current = true;
          submit({ destination, duration, preferences });
        }}
      />
    );
  }

  return (
    <>
      <TripView
        trip={trip}
        expectedDays={duration}
        destination={destination}
        isStreaming={isLoading && !mock}
        canSave={canSave}
        saveLabel={isSaving ? "Saving…" : "Save trip"}
        onSave={handleSave}
      />
      {isLoading && !mock && (
        <div className="fixed right-4 bottom-4 z-30">
          <Button variant="outline" size="sm" onClick={stop}>
            Stop generating
          </Button>
        </div>
      )}
    </>
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
