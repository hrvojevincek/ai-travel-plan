"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { ArrowLeft, RotateCw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { GeneratedTrip } from "@/features/trips/generate";
import { mockTrip } from "@/features/trips/mock";
import { TripView } from "@/features/trips/view";

export function TripNewClient() {
  const params = useSearchParams();
  const destination = params.get("destination") ?? "";
  const duration = Math.max(
    1,
    Math.min(30, Number(params.get("duration")) || 3)
  );
  const preferences = params.get("preferences") ?? undefined;
  const mock = params.get("mock") === "1";

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

  if (!destination) {
    return <InvalidState />;
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar
        showStop={isLoading}
        onStop={stop}
        onRetry={() => {
          didSubmit.current = true;
          submit({ destination, duration, preferences });
        }}
        canRetry={!!error && !isLoading}
      />

      {error ? (
        <ErrorState
          message={error.message}
          onRetry={() => {
            didSubmit.current = true;
            submit({ destination, duration, preferences });
          }}
        />
      ) : (
        <TripView
          trip={trip}
          expectedDays={duration}
          destination={destination}
          isStreaming={isLoading && !mock}
        />
      )}
    </div>
  );
}

function TopBar({
  showStop,
  onStop,
  onRetry,
  canRetry,
}: {
  showStop: boolean;
  onStop: () => void;
  onRetry: () => void;
  canRetry: boolean;
}) {
  return (
    <div className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <ArrowLeft className="mr-1 h-4 w-4" />
            New search
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {showStop && (
            <Button variant="outline" size="sm" onClick={onStop}>
              Stop
            </Button>
          )}
          {canRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RotateCw className="mr-1 h-4 w-4" />
              Retry
            </Button>
          )}
          <Button size="sm" disabled>
            Save trip
          </Button>
        </div>
      </div>
    </div>
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
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
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
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
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
