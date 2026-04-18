import { Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { db } from "@/db/client";
import { requireAuth } from "@/features/auth";
import { getUserTripSummaries } from "@/features/trips/data";
import { TripCard } from "./_components/trip-card";

export const metadata = { title: "Your trips · Voyago" };

export default async function DashboardPage() {
  const session = await requireAuth();
  const trips = await getUserTripSummaries(db, session.user.id);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Your trips
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {trips.length === 0
              ? "You haven't planned any trips yet."
              : `${trips.length} ${trips.length === 1 ? "trip" : "trips"} saved.`}
          </p>
        </div>
        <Button asChild>
          <Link href="/">
            <Plus className="mr-1 h-4 w-4" />
            New trip
          </Link>
        </Button>
      </header>

      {trips.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((t) => (
            <li key={t.id}>
              <TripCard
                trip={{
                  id: t.id,
                  destination: t.destination,
                  summary: t.summary,
                  totalEstimatedCost: t.totalEstimatedCost,
                  imageUrl: t.imageUrl,
                  dayCount: t.dayCount,
                  createdAt: t.createdAt,
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-muted/30 p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <h2 className="text-xl font-semibold">No trips yet</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Plan your first trip and save it here. Everything stays in your account.
      </p>
      <Button asChild size="lg">
        <Link href="/">
          <Plus className="mr-1 h-4 w-4" />
          Plan a trip
        </Link>
      </Button>
    </div>
  );
}
