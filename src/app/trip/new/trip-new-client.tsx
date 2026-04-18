"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { RotateCw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
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
        canSave={!isLoading && !!trip?.days?.length}
        saveLabel="Save trip"
        onSave={() => toast.info("Save coming in the next step.")}
      />
      {isLoading && !mock && (
        <div className="fixed bottom-4 right-4 z-30">
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
