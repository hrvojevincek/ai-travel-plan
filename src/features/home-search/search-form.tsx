"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
import { buildTripNewHref, SearchFormSchema, type SearchFormValues } from "./schema";

export function SearchForm() {
  const router = useRouter();
  const form = useForm<SearchFormValues>({
    resolver: zodResolver(SearchFormSchema),
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

  return (
    <Form {...form}>
      <form onSubmit={submit} className="flex w-full max-w-xl flex-col gap-4">
        <FormField
          control={form.control}
          name="destination"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Destination</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Lisbon, Portugal"
                  autoComplete="off"
                />
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
              <FormLabel>Duration (days)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={30}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="preferences"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferences (optional)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Vegan, no museums, local markets..."
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          Plan my trip
        </Button>
      </form>
    </Form>
  );
}
