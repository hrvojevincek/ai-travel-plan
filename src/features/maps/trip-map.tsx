"use client";

import {
  Camera,
  CameraOff,
  Coffee,
  MapPin,
  Utensils,
  Wine,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Map,
  MapControls,
  MapMarker,
  MapPopup,
  MarkerContent,
  useMap,
} from "@/components/ui/map";
import type { GeneratedActivityTypeT } from "@/features/trips/generate";
import { useActivityPhotoQuery } from "./hooks/use-activity-photo";

export interface MapActivity {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  dayNumber: number;
  /** Activity category — drives the selected-pin glyph. */
  type?: GeneratedActivityTypeT;
  placeId?: string | null;
  /** Google Places photo reference — when present, popup lazy-loads it. */
  photoReference?: string | null;
}

interface TripMapProps {
  destination?: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
  activities: MapActivity[];
  selectedActivityId: string | null;
  onSelectActivity: (id: string | null) => void;
}

export function TripMap({
  destination,
  destinationLat,
  destinationLng,
  activities,
  selectedActivityId,
  onSelectActivity,
}: TripMapProps) {
  const suppressMapClickRef = useRef(false);
  const center = useMemo((): [number, number] => {
    if (destinationLat != null && destinationLng != null) {
      return [destinationLng, destinationLat];
    }
    if (activities.length > 0) {
      return [activities[0].longitude, activities[0].latitude];
    }
    return [0, 0];
  }, [destinationLat, destinationLng, activities]);

  const zoom = activities.length > 0 ? 12 : 5;
  const selected = activities.find((a) => a.id === selectedActivityId) ?? null;

  return (
    <div className="relative h-full w-full">
      <Map center={center} zoom={zoom}>
        <MapClickHandler
          suppressRef={suppressMapClickRef}
          onClick={() => onSelectActivity(null)}
        />
        <BoundsFitter activities={activities} fallbackCenter={center} />
        <MapControls />
        {activities.map((a) => (
          <ActivityMarker
            key={a.id}
            activity={a}
            isSelected={a.id === selectedActivityId}
            suppressRef={suppressMapClickRef}
            onClick={() => onSelectActivity(a.id)}
          />
        ))}
        {selected && (
          <MapPopup
            longitude={selected.longitude}
            latitude={selected.latitude}
            offset={[0, -64]}
            closeButton
            closeOnClick={false}
            onClose={() => onSelectActivity(null)}
          >
            <ActivityInfoContent
              key={`${selected.id}-${selected.photoReference ?? "none"}-${selected.placeId ?? "none"}`}
              activity={selected}
            />
          </MapPopup>
        )}
      </Map>
      {activities.length === 0 && destination && (
        <div className="pointer-events-none absolute top-3 left-3 rounded-md bg-white/90 px-2 py-1 text-xs text-zinc-700 shadow-sm">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {destination}
          </span>
        </div>
      )}
    </div>
  );
}

function MapClickHandler({
  onClick,
  suppressRef,
}: {
  onClick: () => void;
  suppressRef: React.RefObject<boolean>;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;
    const handler = () => {
      if (suppressRef.current) return;
      onClick();
    };
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [map, isLoaded, onClick, suppressRef]);

  return null;
}

/**
 * Resolve a usable photo_reference. Prefer placeId → Place Details: stored
 * photo_reference values in the generation cache go stale and Google returns 400.
 */
function ActivityInfoContent({ activity }: { activity: MapActivity }) {
  const {
    data: photoUrl,
    isPending,
    isError,
  } = useActivityPhotoQuery(activity.placeId, activity.photoReference);
  const [imgFailed, setImgFailed] = useState(false);
  const failed = isError || imgFailed || (!isPending && !photoUrl);

  return (
    <div className="bg-popover w-56 overflow-hidden rounded-md">
      {photoUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={activity.name}
          className="mb-2 h-28 w-full rounded object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="mb-2 flex h-28 w-full items-center justify-center rounded bg-zinc-100 text-zinc-500">
          <span className="inline-flex items-center gap-1 text-xs font-medium">
            {isPending ? (
              <>Loading photo…</>
            ) : (
              <>
                <CameraOff className="h-3.5 w-3.5" />
                No photo available
              </>
            )}
          </span>
        </div>
      )}
      <div className="px-1 py-0.5">
        <div className="text-xs tracking-wide text-zinc-500 uppercase">
          Day {activity.dayNumber}
        </div>
        <div className="text-sm font-semibold capitalize">
          {activity.name.toLowerCase()}
        </div>
      </div>
    </div>
  );
}

const PIN_BG = "#2563eb";
const PIN_BORDER = "#1e40af";

const TYPE_ICON: Record<
  GeneratedActivityTypeT,
  React.ComponentType<{ className?: string }>
> = {
  breakfast: Coffee,
  lunch: Utensils,
  dinner: Wine,
  activity: Camera,
};

function ActivityMarker({
  activity,
  isSelected,
  onClick,
  suppressRef,
}: {
  activity: MapActivity;
  isSelected: boolean;
  onClick: () => void;
  suppressRef: React.RefObject<boolean>;
}) {
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    suppressRef.current = true;
    onClick();
    requestAnimationFrame(() => {
      suppressRef.current = false;
    });
  };

  if (!isSelected) {
    return (
      <MapMarker
        longitude={activity.longitude}
        latitude={activity.latitude}
        onClick={handleClick}
      >
        <MarkerContent>
          <div
            title={activity.name}
            className="h-3 w-3 cursor-pointer rounded-full border-2 border-white shadow-md transition-transform hover:scale-125"
            style={{ backgroundColor: PIN_BG }}
          />
        </MarkerContent>
      </MapMarker>
    );
  }

  const Glyph = activity.type ? TYPE_ICON[activity.type] : null;

  return (
    <MapMarker
      longitude={activity.longitude}
      latitude={activity.latitude}
      onClick={handleClick}
    >
      <MarkerContent>
        <div className="relative cursor-pointer">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 shadow-lg"
            style={{ backgroundColor: PIN_BG, borderColor: PIN_BORDER }}
          >
            {Glyph && <Glyph className="h-5 w-5 text-white" />}
          </div>
          <div
            className="mx-auto h-0 w-0 border-x-10 border-t-14 border-x-transparent"
            style={{ borderTopColor: PIN_BG }}
          />
          <span className="bg-primary absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white px-1 text-[10px] leading-none font-bold text-white shadow">
            {activity.dayNumber}
          </span>
        </div>
      </MarkerContent>
    </MapMarker>
  );
}

function BoundsFitter({
  activities,
  fallbackCenter,
}: {
  activities: MapActivity[];
  fallbackCenter: [number, number];
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;
    if (activities.length === 0) {
      map.setCenter(fallbackCenter);
      return;
    }
    let minLng = Number.POSITIVE_INFINITY;
    let minLat = Number.POSITIVE_INFINITY;
    let maxLng = Number.NEGATIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;
    for (const a of activities) {
      minLng = Math.min(minLng, a.longitude);
      minLat = Math.min(minLat, a.latitude);
      maxLng = Math.max(maxLng, a.longitude);
      maxLat = Math.max(maxLat, a.latitude);
    }
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 64 }
    );
  }, [map, isLoaded, activities, fallbackCenter]);

  return null;
}
