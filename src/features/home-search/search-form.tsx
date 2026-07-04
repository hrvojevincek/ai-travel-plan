"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { SearchFormSchema, type SearchFormValues } from "./schema";

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
  const loadingSteps = useMemo(
    () => [
      "Finding the best places",
      "Crafting your day-by-day itinerary",
      "Building your map pins",
      "Finalizing the trip view",
    ],
    []
  );

  useEffect(() => {
    if (!generateMutation.isPending) {
      setLoadingStep(0);
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingStep((current) =>
        Math.min(current + 1, loadingSteps.length - 1)
      );
    }, 1200);

    return () => window.clearInterval(timer);
  }, [generateMutation.isPending, loadingSteps.length]);

  const submit = form.handleSubmit((values) => {
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
    "h-11 border-white/30 bg-white/95 text-foreground placeholder:text-muted-foreground shadow-sm focus-visible:border-primary focus-visible:ring-primary/30";
  const labelClass = "text-white/90 font-medium";

  return (
    <Form {...form}>
      <form onSubmit={submit} className="flex w-full flex-col gap-5">
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
                    onPick={(pick) => {
                      form.setValue("destination", pick.description);
                      form.setValue("placeId", pick.placeId);
                      form.setValue("destinationLat", pick.lat);
                      form.setValue("destinationLng", pick.lng);
                    }}
                    onClearPick={() => {
                      form.setValue("placeId", undefined);
                      form.setValue("destinationLat", undefined);
                      form.setValue("destinationLng", undefined);
                    }}
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
                  min={1}
                  max={30}
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
                    className="resize-none border-white/30 bg-white/95 text-foreground placeholder:text-muted-foreground shadow-sm focus-visible:border-primary focus-visible:ring-primary/30"
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
          size="lg"
          className="h-12 w-full text-base font-semibold shadow-lg transition-transform hover:-translate-y-0.5"
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
            steps={loadingSteps}
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
  steps: string[];
  currentStep: number;
  destination: string;
}) {
  const total = steps.length;
  const completed = currentStep + 1;
  const progress = Math.round((completed / total) * 100);

  return (
    <div className="rounded-xl border border-white/25 bg-black/20 p-4 text-white shadow-lg backdrop-blur-sm">
      <p className="text-sm font-medium text-white/90">
        Building your {destination || "next"} adventure...
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-white transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-3 space-y-2">
        {steps.map((step, index) => {
          const isDone = index < currentStep;
          const isActive = index === currentStep;
          return (
            <div
              key={step}
              className="flex items-center gap-2 text-xs text-white/80"
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
