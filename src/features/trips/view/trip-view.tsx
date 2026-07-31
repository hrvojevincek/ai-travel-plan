"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Clock, MapPin, RefreshCw, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type MapActivity, TripMap } from "@/features/maps";
import { activityPhotoQueryOptions } from "@/features/maps/hooks/use-activity-photo";
import { cn } from "@/lib/utils";
import type { GeneratedActivityTypeT, GeneratedTripT } from "../generate-schema";

type PartialActivity = Partial<
  GeneratedTripT["days"][number]["activities"][number]
> & {
  /** DB row id — present for persisted trips, absent on /trip/new. */
  id?: string;
  latitude?: number | null;
  longitude?: number | null;
  placeId?: string | null;
  photoReference?: string | null;
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
  onSwapActivity?: (activityId: string) => void;
  /** Id of the activity currently being swapped — renders a loading state. */
  swappingActivityId?: string | null;
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
  swappingActivityId,
  destinationLat,
  destinationLng,
}: TripViewProps) {
  const days = trip?.days ?? [];
  const title = trip?.destination ?? destination;
  const dayPlaceholders = Array.from({ length: expectedDays }, (_, i) => i + 1);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const activeDay = Math.min(Math.max(selectedDay, 1), expectedDays);

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
          type: a.type,
          placeId: a.placeId ?? null,
          photoReference: a.photoReference ?? null,
        });
      }
    });
  }

  return (
    <div className="flex min-h-screen w-full flex-col sm:grid sm:grid-cols-3">
      <aside className="col-span-1 w-full overflow-y-auto bg-white px-3 py-4 text-[13px] leading-snug shadow-md sm:h-screen sm:max-h-screen sm:px-4">
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

        <Tabs
          value={String(activeDay)}
          onValueChange={(value) => {
            setSelectedDay(Number(value));
            setSelectedId(null);
          }}
          className="mt-4 gap-2"
        >
          <div className="overflow-x-auto pb-1">
            <TabsList className="h-auto w-max min-w-full justify-start gap-0.5 rounded-md bg-zinc-100 p-0.5">
              {dayPlaceholders.map((dayNum) => (
                <TabsTrigger
                  key={dayNum}
                  value={String(dayNum)}
                  className="px-2.5 py-1 text-[11px] font-medium"
                >
                  Day {dayNum}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {dayPlaceholders.map((dayNum) => {
            const day = days.find((d) => d?.dayNumber === dayNum);
            return (
              <TabsContent key={dayNum} value={String(dayNum)} className="mt-0">
                <DaySection
                  dayNumber={dayNum}
                  activities={day?.activities}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onSwapActivity={onSwapActivity}
                  swappingActivityId={swappingActivityId}
                />
              </TabsContent>
            );
          })}
        </Tabs>
      </aside>

      <section className="bg-muted/30 relative col-span-2 min-h-[50vh] sm:sticky sm:top-0 sm:h-screen sm:min-h-0">
        <TripMap
          destination={title}
          destinationLat={destinationLat}
          destinationLng={destinationLng}
          activities={mapActivities}
          selectedActivityId={selectedId}
          onSelectActivity={setSelectedId}
        />
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
      <div className="mb-3 flex w-full items-center justify-between">
        <Link href="/" aria-label="Home">
          <Image
            src="/logo.svg"
            alt="Voyago"
            width={80}
            height={26}
            priority
          />
        </Link>
        {onSave && (
          <Button
            size="sm"
            onClick={onSave}
            disabled={!canSave}
            className="h-7 px-2.5 text-[11px] font-medium"
          >
            {saveLabel}
          </Button>
        )}
      </div>

      <h1 className="text-sm font-semibold capitalize tracking-tight">
        View {duration} day itinerary
      </h1>
      <p className="text-muted-foreground mt-0.5 text-xs">{title}</p>
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
    <div className="mt-3 rounded-lg border bg-white p-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-zinc-500 uppercase">
        <Sparkles className="text-primary h-3 w-3" />
        {duration}-day itinerary · {destination}
      </div>
      {summary ? (
        <p className="mt-1.5 text-xs leading-relaxed text-pretty text-zinc-700">{summary}</p>
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
  swappingActivityId,
}: {
  dayNumber: number;
  activities: (PartialActivity | undefined)[] | undefined;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onSwapActivity?: (activityId: string) => void;
  swappingActivityId?: string | null;
}) {
  const hasContent = Array.isArray(activities) && activities.length > 0;

  return (
    <section className="pt-3">
      <h2 className="mb-1.5 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
        Day {dayNumber}
      </h2>
      {hasContent ? (
        <ol className="space-y-2">
          {activities.map((a, i) => {
            const id = activityId(dayNumber, i);
            // Swap is only offered for persisted activities that have a DB id.
            const canSwap = Boolean(onSwapActivity && a?.id);
            const isSwapping = Boolean(a?.id && swappingActivityId === a.id);
            return (
              <li key={`day-${dayNumber}-${SKELETON_KEYS[i] ?? i}`}>
                <ActivityCard
                  activity={a}
                  isSelected={selectedId === id}
                  onSelect={() => onSelect(selectedId === id ? null : id)}
                  onSwap={
                    canSwap && onSwapActivity && a?.id
                      ? () => {
                          onSwapActivity(a.id as string);
                        }
                      : undefined
                  }
                  isSwapping={isSwapping}
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
  isSwapping,
}: {
  activity: PartialActivity | undefined;
  isSelected: boolean;
  onSelect: () => void;
  onSwap?: () => void;
  isSwapping?: boolean;
}) {
  const queryClient = useQueryClient();

  const prefetchPhoto = useCallback(() => {
    if (!activity?.placeId && !activity?.photoReference) return;
    void queryClient.prefetchQuery(
      activityPhotoQueryOptions(activity.placeId, activity.photoReference)
    );
  }, [queryClient, activity?.placeId, activity?.photoReference]);

  if (!activity) return <ActivitySkeleton />;
  if (isSwapping) return <ActivitySkeleton />;

  const hasCoords =
    typeof activity.latitude === "number" &&
    typeof activity.longitude === "number";

  return (
    <button
      type="button"
      onClick={hasCoords ? onSelect : undefined}
      onMouseEnter={hasCoords ? prefetchPhoto : undefined}
      onFocus={hasCoords ? prefetchPhoto : undefined}
      onTouchStart={hasCoords ? prefetchPhoto : undefined}
      disabled={!hasCoords}
      className={cn(
        "group relative flex w-full justify-stretch rounded-md border border-zinc-200 p-2.5 text-left transition-colors",
        hasCoords && "cursor-pointer hover:border-zinc-400",
        isSelected && "border-primary bg-primary/5 ring-1 ring-primary/20 hover:border-primary"
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
          className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-zinc-500">
          {activity.durationMinutes != null && (
            <span className="inline-flex items-center gap-0.5 text-[11px]">
              <Clock className="mb-0.5 inline-block h-3 w-3 text-zinc-400" />
              {formatDuration(activity.durationMinutes)}
            </span>
          )}
          {activity.type && (
            <span className="text-[10px] tracking-wide text-zinc-400 uppercase">
              {typeLabel[activity.type]}
            </span>
          )}
          {activity.estimatedCost != null && (
            <span className="ml-auto text-[11px] font-semibold tabular-nums">
              €{Math.round(activity.estimatedCost)}
            </span>
          )}
        </div>
        <div className="text-primary mt-0.5 text-xs font-semibold tracking-tight capitalize">
          {activity.name?.toLowerCase() ?? <Skeleton className="h-5 w-2/3" />}
        </div>
        {activity.description && (
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-relaxed">
            {activity.description}
          </p>
        )}
        {activity.address ? (
          <div className="mt-1 inline-flex max-w-full items-start gap-0.5 text-[10px] text-zinc-500">
            <MapPin className="mt-0.5 h-2.5 w-2.5 shrink-0" />
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
    <div className="rounded-md border border-zinc-200 p-2.5">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-5/6" />
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
