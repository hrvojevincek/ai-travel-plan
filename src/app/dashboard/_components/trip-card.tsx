"use client";

import { Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteTripAction } from "@/features/trips/actions";

export interface TripCardData {
  id: string;
  destination: string;
  summary: string | null;
  totalEstimatedCost: string | null;
  imageUrl: string | null;
  dayCount: number;
  createdAt: Date;
}

export function TripCard({ trip }: { trip: TripCardData }) {
  const [isDeleting, startDelete] = useTransition();

  const onConfirm = () => {
    startDelete(async () => {
      const res = await deleteTripAction(trip.id);
      if (res.ok) {
        toast.success(`Deleted ${trip.destination}`);
        return;
      }
      toast.error(res.message ?? "Couldn't delete trip. Please try again.");
    });
  };

  const cost =
    trip.totalEstimatedCost != null
      ? Math.round(Number(trip.totalEstimatedCost))
      : null;

  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:shadow-md">
      <Link href={`/trip/${trip.id}`} className="block">
        <div className="relative aspect-video w-full overflow-hidden bg-linear-to-br from-primary/20 via-primary/5 to-background">
          {trip.imageUrl ? (
            <Image
              src={trip.imageUrl}
              alt={trip.destination}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition group-hover:scale-[1.02]"
            />
          ) : (
            <>
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,var(--color-primary),transparent_60%)] opacity-30" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,var(--color-primary),transparent_50%)] opacity-20" />
            </>
          )}
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
        </div>
        <div className="space-y-2 p-4">
          <h3 className="truncate text-lg font-semibold text-foreground">
            {trip.destination}
          </h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {trip.dayCount} {trip.dayCount === 1 ? "day" : "days"}
            </span>
            {cost != null && (
              <>
                <span aria-hidden>·</span>
                <span>€{cost}</span>
              </>
            )}
            <span aria-hidden>·</span>
            <time dateTime={trip.createdAt.toISOString()}>
              {trip.createdAt.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          </div>
          {trip.summary && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {trip.summary}
            </p>
          )}
        </div>
      </Link>
      <div className="absolute right-3 top-3">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              aria-label={`Delete trip to ${trip.destination}`}
              disabled={isDeleting}
              className="h-8 w-8 bg-white/90 text-foreground shadow-sm hover:bg-white"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this trip?</AlertDialogTitle>
              <AlertDialogDescription>
                {`"${trip.destination}" will be permanently removed, including all days and activities. This action can't be undone.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onConfirm}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
