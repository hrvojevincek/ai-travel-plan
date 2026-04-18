import { Clock, MapPin, RefreshCw, Sparkles, Wallet } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { GeneratedActivityTypeT, GeneratedTripT } from "../generate";

type PartialActivity = Partial<
  GeneratedTripT["days"][number]["activities"][number]
>;
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
  isStreaming?: boolean;
  onSave?: () => void;
  canSave?: boolean;
  saveLabel?: string;
  onSwapActivity?: (dayNumber: number, activityIndex: number) => void;
  imageUrl?: string | null;
  imageAttribution?: string | null;
}

export function TripView({
  trip,
  expectedDays,
  destination,
  isStreaming,
  onSave,
  canSave,
  saveLabel = "Save trip",
  onSwapActivity,
  imageUrl,
  imageAttribution,
}: TripViewProps) {
  const days = trip?.days ?? [];
  const title = trip?.destination ?? destination;
  const dayPlaceholders = Array.from({ length: expectedDays }, (_, i) => i + 1);

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

        <div className="mt-10 space-y-10">
          {dayPlaceholders.map((dayNum) => {
            const day = days.find((d) => d?.dayNumber === dayNum);
            return (
              <DaySection
                key={dayNum}
                dayNumber={dayNum}
                activities={day?.activities}
                isStreaming={isStreaming}
                onSwapActivity={onSwapActivity}
              />
            );
          })}
        </div>
      </aside>

      <section className="relative flex-1 bg-muted/30 sm:h-screen sm:overflow-y-auto">
        <SummaryPanel
          destination={title}
          summary={trip?.summary}
          totalCost={trip?.totalEstimatedCost}
          duration={expectedDays}
          days={days}
          isStreaming={isStreaming}
          imageUrl={imageUrl}
          imageAttribution={imageAttribution}
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

      <h1 className="mt-10 flex w-full align-middle text-4xl font-extrabold capitalize">
        View {duration} day itinerary
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{title}</p>
    </>
  );
}

function DaySection({
  dayNumber,
  activities,
  isStreaming,
  onSwapActivity,
}: {
  dayNumber: number;
  activities: (PartialActivity | undefined)[] | undefined;
  isStreaming?: boolean;
  onSwapActivity?: (dayNumber: number, activityIndex: number) => void;
}) {
  const hasContent = Array.isArray(activities) && activities.length > 0;

  return (
    <section className="max-w-2xl pt-6">
      <h2 className="mb-2 text-lg font-semibold">Day {dayNumber}</h2>
      {hasContent ? (
        <ol className="space-y-4">
          {activities.map((a, i) => (
            <li key={`day-${dayNumber}-${SKELETON_KEYS[i] ?? i}`}>
              <ActivityCard
                activity={a}
                onSwap={
                  onSwapActivity
                    ? () => onSwapActivity(dayNumber, i)
                    : undefined
                }
              />
            </li>
          ))}
        </ol>
      ) : (
        <div className="space-y-4">
          {SKELETON_KEYS.slice(0, isStreaming ? 3 : 7).map((k) => (
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
  onSwap,
}: {
  activity: PartialActivity | undefined;
  onSwap?: () => void;
}) {
  if (!activity) return <ActivitySkeleton />;

  return (
    <div
      className={cn(
        "group relative flex justify-stretch rounded-md border-2 border-zinc-100 p-4 transition-colors hover:border-zinc-400"
      )}
    >
      {onSwap && (
        <button
          type="button"
          onClick={onSwap}
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
    </div>
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

function SummaryPanel({
  destination,
  summary,
  totalCost,
  duration,
  days,
  isStreaming,
  imageUrl,
  imageAttribution,
}: {
  destination: string;
  summary: string | undefined;
  totalCost: number | undefined;
  duration: number;
  days: (PartialDay | undefined)[];
  isStreaming?: boolean;
  imageUrl?: string | null;
  imageAttribution?: string | null;
}) {
  const dayTotals = Array.from({ length: duration }, (_, i) => {
    const d = days.find((x) => x?.dayNumber === i + 1);
    const acts = d?.activities ?? [];
    const sum = acts.reduce(
      (acc, a) =>
        acc + (typeof a?.estimatedCost === "number" ? a.estimatedCost : 0),
      0
    );
    return { day: i + 1, cost: sum, count: acts.length };
  });

  return (
    <div className="flex min-h-full flex-col gap-6 p-6 sm:p-10">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border bg-linear-to-br from-primary/20 via-primary/5 to-background shadow-sm">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={destination}
            fill
            sizes="(min-width: 640px) 60vw, 100vw"
            className="object-cover"
            priority
          />
        ) : (
          <>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,var(--color-primary),transparent_60%)] opacity-30" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,var(--color-primary),transparent_50%)] opacity-20" />
          </>
        )}
        {imageUrl && (
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
        )}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 p-6",
            imageUrl && "text-white"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 text-xs font-medium uppercase tracking-wide",
              imageUrl ? "text-white/80" : "text-zinc-500"
            )}
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {duration}-day itinerary
            {isStreaming && (
              <span className="ml-1 inline-flex items-center gap-1 text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Generating
              </span>
            )}
          </div>
          <h2 className="mt-2 text-balance text-3xl font-extrabold capitalize sm:text-4xl">
            {destination}
          </h2>
        </div>
        {imageAttribution && (
          <div className="absolute bottom-1 right-2 text-[10px] text-white/70">
            {imageAttribution}
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Overview
        </h3>
        {summary ? (
          <p className="mt-2 text-pretty text-base text-zinc-700">{summary}</p>
        ) : (
          <div className="mt-2 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Budget
          </h3>
          <div className="inline-flex items-center gap-2 text-sm font-semibold">
            <Wallet className="h-4 w-4 text-primary" />
            {totalCost != null ? (
              <span className="tabular-nums">€{Math.round(totalCost)}</span>
            ) : (
              <Skeleton className="h-5 w-16" />
            )}
          </div>
        </div>
        <ul className="mt-3 divide-y text-sm">
          {dayTotals.map((d) => (
            <li
              key={`budget-day-${d.day}`}
              className="flex items-center justify-between py-2"
            >
              <span className="text-zinc-600">Day {d.day}</span>
              {d.count > 0 ? (
                <span className="tabular-nums font-medium">
                  €{Math.round(d.cost)}
                </span>
              ) : (
                <Skeleton className="h-4 w-12" />
              )}
            </li>
          ))}
        </ul>
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
