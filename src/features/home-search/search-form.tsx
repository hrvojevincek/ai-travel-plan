"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
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
import {
  buildTripNewHref,
  SearchFormSchema,
  type SearchFormValues,
} from "./schema";

interface SearchFormProps {
  /** Show the preferences textarea. Gated to signed-in users. */
  showPreferences?: boolean;
}

export function SearchForm({ showPreferences = false }: SearchFormProps = {}) {
  const router = useRouter();
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

  const submit = form.handleSubmit((values) => {
    router.push(buildTripNewHref(values));
  });

  const isPending = form.formState.isSubmitting;
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
          Plan my trip
        </Button>
      </form>
    </Form>
  );
}
