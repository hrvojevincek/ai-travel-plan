"use client";

import { Clock, MapPin, RefreshCw, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { hasMapsApiKey, type MapActivity, TripMap } from "@/features/maps";
import { cn } from "@/lib/utils";
import type { GeneratedActivityTypeT, GeneratedTripT } from "../generate";

type PartialActivity = Partial<
  GeneratedTripT["days"][number]["activities"][number]
> & {
  latitude?: number | null;
  longitude?: number | null;
};
type PartialDay = Partial<
  Omit<GeneratedTripT["days"][number], "activities">
> & {
  activities?: (PartialActivity | undefined)[];
};
export type PartialTrip = Partial<Omit<GeneratedTripT, "days">> & {
  days?: (PartialDay | undefined)[];
};

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f", "g"] as const;

interface TripViewProps {
  trip: PartialTrip | undefined;
  expectedDays: number;
  destination: string;
  onSave?: () => void;
  canSave?: boolean;
  saveLabel?: string;
  onSwapActivity?: (dayNumber: number, activityIndex: number) => void;
  destinationLat?: number | null;
  destinationLng?: number | null;
}

function activityId(dayNumber: number, index: number): string {
  return `d${dayNumber}-a${index}`;
}

export function TripView({
  trip,
  expectedDays,
  destination,
  onSave,
  canSave,
  saveLabel = "Save trip",
  onSwapActivity,
  destinationLat,
  destinationLng,
}: TripViewProps) {
  const days = trip?.days ?? [];
  const title = trip?.destination ?? destination;
  const dayPlaceholders = Array.from({ length: expectedDays }, (_, i) => i + 1);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const mapActivities: MapActivity[] = [];
  for (const d of days) {
    if (!d) continue;
    const acts = d.activities ?? [];
    acts.forEach((a, i) => {
      if (
        a &&
        typeof a.latitude === "number" &&
        typeof a.longitude === "number" &&
        a.name
      ) {
        mapActivities.push({
          id: activityId(d.dayNumber ?? 0, i),
          name: a.name,
          latitude: a.latitude,
          longitude: a.longitude,
          dayNumber: d.dayNumber ?? 0,
        });
      }
    });
  }

  const mapsEnabled = hasMapsApiKey();

  return (
    <div className="flex min-h-screen w-full flex-col sm:flex-row">
      <aside className="w-full overflow-y-auto bg-white p-6 shadow-md sm:h-screen sm:w-[420px] sm:shrink-0 md:w-[480px] lg:w-[520px]">
        <ActivitiesHeader
          title={title}
          duration={expectedDays}
          onSave={onSave}
          canSave={canSave}
          saveLabel={saveLabel}
        />

        <OverviewCard
          destination={title}
          summary={trip?.summary}
          duration={expectedDays}
        />

        <div className="mt-10 space-y-10">
          {dayPlaceholders.map((dayNum) => {
            const day = days.find((d) => d?.dayNumber === dayNum);
            return (
              <DaySection
                key={dayNum}
                dayNumber={dayNum}
                activities={day?.activities}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onSwapActivity={onSwapActivity}
              />
            );
          })}
        </div>
      </aside>

      <section className="relative flex-1 bg-muted/30 sm:sticky sm:top-0 sm:h-screen">
        {mapsEnabled ? (
          <TripMap
            destination={title}
            destinationLat={destinationLat}
            destinationLng={destinationLng}
            activities={mapActivities}
            selectedActivityId={selectedId}
            onSelectActivity={setSelectedId}
          />
        ) : (
          <MapFallback destination={title} />
        )}
      </section>
    </div>
  );
}

function ActivitiesHeader({
  title,
  duration,
  onSave,
  canSave,
  saveLabel,
}: {
  title: string;
  duration: number;
  onSave?: () => void;
  canSave?: boolean;
  saveLabel: string;
}) {
  return (
    <>
      <div className="mb-10 flex w-full items-center justify-between">
        <Link href="/" aria-label="Home">
          <Image
            src="/logo.svg"
            alt="Voyago"
            width={120}
            height={40}
            priority
          />
        </Link>
        {onSave && (
          <Button
            size="sm"
            onClick={onSave}
            disabled={!canSave}
            className="font-semibold"
          >
            {saveLabel}
          </Button>
        )}
      </div>

      <h1 className="flex w-full align-middle text-4xl font-extrabold capitalize">
        View {duration} day itinerary
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{title}</p>
    </>
  );
}

function OverviewCard({
  destination,
  summary,
  duration,
}: {
  destination: string;
  summary: string | undefined;
  duration: number;
}) {
  return (
    <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        {duration}-day itinerary · {destination}
      </div>
      {summary ? (
        <p className="mt-2 text-pretty text-sm text-zinc-700">{summary}</p>
      ) : (
        <div className="mt-2 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      )}
    </div>
  );
}

function DaySection({
  dayNumber,
  activities,
  selectedId,
  onSelect,
  onSwapActivity,
}: {
  dayNumber: number;
  activities: (PartialActivity | undefined)[] | undefined;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onSwapActivity?: (dayNumber: number, activityIndex: number) => void;
}) {
  const hasContent = Array.isArray(activities) && activities.length > 0;

  return (
    <section className="max-w-2xl pt-6">
      <h2 className="mb-2 text-lg font-semibold">Day {dayNumber}</h2>
      {hasContent ? (
        <ol className="space-y-4">
          {activities.map((a, i) => {
            const id = activityId(dayNumber, i);
            return (
              <li key={`day-${dayNumber}-${SKELETON_KEYS[i] ?? i}`}>
                <ActivityCard
                  activity={a}
                  isSelected={selectedId === id}
                  onSelect={() => onSelect(selectedId === id ? null : id)}
                  onSwap={
                    onSwapActivity
                      ? () => onSwapActivity(dayNumber, i)
                      : undefined
                  }
                />
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="space-y-4">
          {SKELETON_KEYS.map((k) => (
            <ActivitySkeleton key={`sk-${dayNumber}-${k}`} />
          ))}
        </div>
      )}
    </section>
  );
}

const typeLabel: Record<GeneratedActivityTypeT, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  activity: "Activity",
};

function ActivityCard({
  activity,
  isSelected,
  onSelect,
  onSwap,
}: {
  activity: PartialActivity | undefined;
  isSelected: boolean;
  onSelect: () => void;
  onSwap?: () => void;
}) {
  if (!activity) return <ActivitySkeleton />;

  const hasCoords =
    typeof activity.latitude === "number" &&
    typeof activity.longitude === "number";

  return (
    <button
      type="button"
      onClick={hasCoords ? onSelect : undefined}
      disabled={!hasCoords}
      className={cn(
        "group relative flex w-full justify-stretch rounded-md border-2 border-zinc-100 p-4 text-left transition-colors",
        hasCoords && "cursor-pointer hover:border-zinc-400",
        isSelected && "border-primary bg-primary/5 hover:border-primary"
      )}
    >
      {onSwap && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSwap();
          }}
          aria-label="Swap activity"
          className="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 opacity-0 transition hover:bg-zinc-100 hover:text-zinc-700 group-hover:opacity-100"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3 text-zinc-700">
          {activity.durationMinutes != null && (
            <span className="inline-flex items-center gap-1 text-sm">
              <Clock className="mb-0.5 inline-block h-4 w-4 text-zinc-400" />
              {formatDuration(activity.durationMinutes)}
            </span>
          )}
          {activity.type && (
            <span className="text-xs uppercase tracking-wide text-zinc-400">
              {typeLabel[activity.type]}
            </span>
          )}
          {activity.estimatedCost != null && (
            <span className="ml-auto text-sm font-semibold tabular-nums">
              €{Math.round(activity.estimatedCost)}
            </span>
          )}
        </div>
        <div className="mt-1 text-lg font-semibold capitalize tracking-tight text-primary">
          {activity.name?.toLowerCase() ?? <Skeleton className="h-5 w-2/3" />}
        </div>
        {activity.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {activity.description}
          </p>
        )}
        {activity.address ? (
          <div className="mt-2 inline-flex max-w-full items-start gap-1 text-xs text-zinc-500">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="truncate">{activity.address}</span>
          </div>
        ) : activity.name ? null : (
          <Skeleton className="mt-2 h-3 w-5/6" />
        )}
      </div>
    </button>
  );
}

function ActivitySkeleton() {
  return (
    <div className="rounded-md border-2 border-zinc-100 p-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </div>
  );
}

function MapFallback({ destination }: { destination: string }) {
  return (
    <div className="relative h-full w-full bg-linear-to-br from-primary/20 via-primary/5 to-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,var(--color-primary),transparent_60%)] opacity-30" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,var(--color-primary),transparent_50%)] opacity-20" />
      <div className="absolute bottom-6 left-6 right-6 text-white drop-shadow">
        <div className="text-xs font-medium uppercase tracking-wide">Map</div>
        <div className="mt-1 text-2xl font-bold capitalize">{destination}</div>
        <div className="mt-1 text-xs text-white/70">
          Set NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY to enable the interactive map.
        </div>
      </div>
    </div>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
