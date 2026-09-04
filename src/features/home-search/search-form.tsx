"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { hasMapsApiKey, PlacesAutocomplete } from "@/features/maps";
import { useGenerateTripMutation } from "@/features/trips/hooks/use-generate-trip";
import {
  GENERATE_REQUEST_LIMITS,
  SearchFormSchema,
  type SearchFormValues,
} from "./schema";

const LOADING_STEPS = [
  "Finding the best places",
  "Crafting your day-by-day itinerary",
  "Building your map pins",
  "Finalizing the trip view",
] as const;

interface SearchFormProps {
  /** Show the preferences textarea. Gated to signed-in users. */
  showPreferences?: boolean;
}

export function SearchForm({ showPreferences = false }: SearchFormProps = {}) {
  const generateMutation = useGenerateTripMutation();
  const form = useForm<SearchFormValues>({
    resolver: zodResolver(
      SearchFormSchema
    ) as unknown as Resolver<SearchFormValues>,
    defaultValues: {
      destination: "",
      duration: 3,
      preferences: "",
    },
  });

  const [loadingStep, setLoadingStep] = useState(0);

  const handleDestinationPick = useCallback(
    (pick: {
      description: string;
      placeId: string;
      lat: number;
      lng: number;
    }) => {
      form.setValue("destination", pick.description);
      form.setValue("placeId", pick.placeId);
      form.setValue("destinationLat", pick.lat);
      form.setValue("destinationLng", pick.lng);
    },
    [form]
  );

  const handleClearDestinationPick = useCallback(() => {
    form.setValue("placeId", undefined);
    form.setValue("destinationLat", undefined);
    form.setValue("destinationLng", undefined);
  }, [form]);

  useEffect(() => {
    if (!generateMutation.isPending) {
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingStep((current) =>
        Math.min(current + 1, LOADING_STEPS.length - 1)
      );
    }, 1200);

    return () => window.clearInterval(timer);
  }, [generateMutation.isPending]);

  const submit = form.handleSubmit((values) => {
    setLoadingStep(0);
    generateMutation.mutate({
      destination: values.destination,
      duration: values.duration,
      preferences: values.preferences || undefined,
      placeId: values.placeId,
      destinationLat: values.destinationLat,
      destinationLng: values.destinationLng,
    });
  });

  const isPending = form.formState.isSubmitting || generateMutation.isPending;
  const mapsEnabled = hasMapsApiKey();

  const inputClass =
    "h-9 text-sm border-white/30 bg-white/95 text-foreground placeholder:text-muted-foreground shadow-sm focus-visible:border-primary focus-visible:ring-primary/30";
  const labelClass = "text-sm text-white/90 font-medium";

  return (
    <Form {...form}>
      <form onSubmit={submit} className="flex w-full flex-col gap-3.5">
        <FormField
          control={form.control}
          name="destination"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Destination</FormLabel>
              <FormControl>
                {mapsEnabled ? (
                  <PlacesAutocomplete
                    value={field.value}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    onPick={handleDestinationPick}
                    onClearPick={handleClearDestinationPick}
                    placeholder="Lisbon, Portugal"
                    autoComplete="off"
                    className={inputClass}
                    disabled={isPending}
                    aria-invalid={
                      !!form.formState.errors.destination || undefined
                    }
                  />
                ) : (
                  <Input
                    {...field}
                    placeholder="Lisbon, Portugal"
                    autoComplete="off"
                    className={inputClass}
                    disabled={isPending}
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Duration (days)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  inputMode="numeric"
                  min={GENERATE_REQUEST_LIMITS.minDurationDays}
                  max={GENERATE_REQUEST_LIMITS.maxDurationDays}
                  className={inputClass}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {showPreferences && (
          <FormField
            control={form.control}
            name="preferences"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>
                  Preferences <span className="text-white/60">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Vegan, no museums, local markets..."
                    rows={3}
                    className="text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/30 resize-none border-white/30 bg-white/95 shadow-sm"
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <Button
          type="submit"
          className="h-9 w-full text-sm font-semibold shadow-lg transition-transform hover:-translate-y-0.5"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              Planning your trip...
            </>
          ) : (
            "Plan my trip"
          )}
        </Button>
        {isPending && (
          <TripGenerationProgress
            steps={LOADING_STEPS}
            currentStep={loadingStep}
            destination={form.getValues("destination")}
          />
        )}
      </form>
    </Form>
  );
}

function TripGenerationProgress({
  steps,
  currentStep,
  destination,
}: {
  steps: readonly string[];
  currentStep: number;
  destination: string;
}) {
  const total = steps.length;
  const completed = currentStep + 1;
  const progress = Math.round((completed / total) * 100);

  return (
    <div className="animate-in slide-in-from-top-2 fade-in duration-300 rounded-lg border border-white/25 bg-black/20 p-3 text-white shadow-lg backdrop-blur-sm">
      <p className="text-xs font-medium text-white/90">
        Building your {destination || "next"} adventure...
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-white transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 space-y-1.5">
        {steps.map((step, index) => {
          const isDone = index < currentStep;
          const isActive = index === currentStep;
          return (
            <div
              key={step}
              className="flex items-center gap-1.5 text-[11px] text-white/80 sm:text-xs"
              aria-live={isActive ? "polite" : undefined}
            >
              {isDone ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
              ) : (
                <LoaderCircle
                  className={`h-3.5 w-3.5 ${isActive ? "animate-spin text-white" : "text-white/40"}`}
                />
              )}
              <span className={isActive ? "font-medium text-white" : undefined}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
