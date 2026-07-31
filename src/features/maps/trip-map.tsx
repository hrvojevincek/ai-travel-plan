"use client";

import { CameraOff, MapPin } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useActivityPhotoQuery } from "./hooks/use-activity-photo";

export interface MapActivity {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  dayNumber: number;
  /** Activity category. */
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
        <FocusSelected activity={selected} />
        <MapControls show3D />
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
            offset={[0, -12]}
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
    <div className="bg-popover w-48 overflow-hidden rounded-md">
      {photoUrl && !failed ? (
        <img
          src={photoUrl}
          alt={activity.name}
          className="mb-1.5 h-24 w-full rounded object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="mb-1.5 flex h-24 w-full items-center justify-center rounded bg-zinc-100 text-zinc-500">
          <span className="inline-flex items-center gap-1 text-[10px] font-medium">
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
        <div className="text-[10px] tracking-wide text-zinc-500 uppercase">
          Day {activity.dayNumber}
        </div>
        <div className="text-xs font-semibold capitalize">
          {activity.name.toLowerCase()}
        </div>
      </div>
    </div>
  );
}

const PIN_BG = "#2563eb";
const PIN_SELECTED = "#1d4ed8";

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

  return (
    <MapMarker
      longitude={activity.longitude}
      latitude={activity.latitude}
      onClick={handleClick}
    >
      <MarkerContent>
        <div
          title={activity.name}
          className={cn(
            "cursor-pointer rounded-full border-2 border-white shadow-md transition-all",
            isSelected
              ? "h-4 w-4 scale-110 ring-2 ring-primary ring-offset-1 shadow-lg"
              : "h-3 w-3 hover:scale-125"
          )}
          style={{ backgroundColor: isSelected ? PIN_SELECTED : PIN_BG }}
        />
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

function FocusSelected({ activity }: { activity: MapActivity | null }) {
  const { map, isLoaded } = useMap();
  const id = activity?.id ?? null;
  const lng = activity?.longitude;
  const lat = activity?.latitude;

  useEffect(() => {
    if (!map || !isLoaded || id == null || lng == null || lat == null) return;
    map.flyTo({
      center: [lng, lat],
      zoom: Math.max(map.getZoom(), 14),
      duration: 800,
    });
  }, [map, isLoaded, id, lng, lat]);

  return null;
}
