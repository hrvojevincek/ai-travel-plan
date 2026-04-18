import {
  ChefHat,
  Clock,
  Coffee,
  MapPin,
  Sparkles,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
}

export function TripView({
  trip,
  expectedDays,
  destination,
  isStreaming,
}: TripViewProps) {
  const days = trip?.days ?? [];
  const title = trip?.destination ?? destination;

  const dayPlaceholders = Array.from({ length: expectedDays }, (_, i) => i + 1);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <TripHeader
        destination={title}
        summary={trip?.summary}
        totalCost={trip?.totalEstimatedCost}
        duration={expectedDays}
        isStreaming={isStreaming}
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
            />
          );
        })}
      </div>
    </div>
  );
}

function TripHeader({
  destination,
  summary,
  totalCost,
  duration,
  isStreaming,
}: {
  destination: string;
  summary: string | undefined;
  totalCost: number | undefined;
  duration: number;
  isStreaming?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-primary/15 via-background to-background p-6 sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--color-primary),transparent_60%)]/[30] opacity-40" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>{duration}-day itinerary</span>
          {isStreaming && (
            <span className="ml-1 inline-flex items-center gap-1 text-xs font-medium text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Generating
            </span>
          )}
        </div>

        <h1 className="mt-3 text-balance text-4xl font-extrabold tracking-tight capitalize sm:text-5xl">
          {destination}
        </h1>

        <div className="mt-4 min-h-12 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
          {summary ?? <Skeleton className="h-5 w-3/4" />}
        </div>

        {totalCost != null ? (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Est. total</span>
            <span className="tabular-nums">€{Math.round(totalCost)}</span>
          </div>
        ) : (
          <Skeleton className="mt-6 h-9 w-40 rounded-full" />
        )}
      </div>
    </div>
  );
}

function DaySection({
  dayNumber,
  activities,
  isStreaming,
}: {
  dayNumber: number;
  activities: (PartialActivity | undefined)[] | undefined;
  isStreaming?: boolean;
}) {
  const hasContent = Array.isArray(activities) && activities.length > 0;

  return (
    <section>
      <div className="mb-5 flex items-center gap-3">
        <h2 className="text-2xl font-bold tracking-tight">
          Day <span className="text-primary">{dayNumber}</span>
        </h2>
        <div className="h-px flex-1 bg-border" />
      </div>

      {hasContent ? (
        <ol className="space-y-3">
          {activities.map((a, i) => (
            <li key={`day-${dayNumber}-${SKELETON_KEYS[i] ?? i}`}>
              <ActivityCard activity={a} />
            </li>
          ))}
        </ol>
      ) : (
        <div className="space-y-3">
          {SKELETON_KEYS.slice(0, isStreaming ? 3 : 7).map((k) => (
            <ActivitySkeleton key={`sk-${dayNumber}-${k}`} />
          ))}
        </div>
      )}
    </section>
  );
}

const typeMeta: Record<
  GeneratedActivityTypeT,
  { label: string; Icon: typeof Coffee; tint: string }
> = {
  breakfast: {
    label: "Breakfast",
    Icon: Coffee,
    tint: "bg-amber-100 text-amber-900 border-amber-200",
  },
  lunch: {
    label: "Lunch",
    Icon: UtensilsCrossed,
    tint: "bg-orange-100 text-orange-900 border-orange-200",
  },
  dinner: {
    label: "Dinner",
    Icon: ChefHat,
    tint: "bg-rose-100 text-rose-900 border-rose-200",
  },
  activity: {
    label: "Activity",
    Icon: Sparkles,
    tint: "bg-sky-100 text-sky-900 border-sky-200",
  },
};

function ActivityCard({ activity }: { activity: PartialActivity | undefined }) {
  if (!activity) return <ActivitySkeleton />;

  const meta = activity.type ? typeMeta[activity.type] : typeMeta.activity;
  const Icon = meta.Icon;
  const isMeal = activity.type && activity.type !== "activity";

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-colors hover:border-primary/40",
        isMeal && "bg-muted/30"
      )}
    >
      <CardContent className="flex gap-4 p-4 sm:p-5">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border",
            meta.tint
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {meta.label}
            </Badge>
            {activity.durationMinutes != null && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDuration(activity.durationMinutes)}
              </span>
            )}
            {activity.estimatedCost != null && (
              <span className="ml-auto text-sm font-semibold tabular-nums">
                €{Math.round(activity.estimatedCost)}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold leading-tight sm:text-lg">
            {activity.name ?? <Skeleton className="h-5 w-2/3" />}
          </h3>
          {activity.description ? (
            <p className="mt-1.5 text-sm text-muted-foreground">
              {activity.description}
            </p>
          ) : activity.name ? null : (
            <Skeleton className="mt-1.5 h-4 w-5/6" />
          )}
          {activity.address && (
            <div className="mt-2 inline-flex max-w-full items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="truncate">{activity.address}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ActivitySkeleton() {
  return (
    <Card>
      <CardContent className="flex gap-4 p-4 sm:p-5">
        <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </CardContent>
    </Card>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
