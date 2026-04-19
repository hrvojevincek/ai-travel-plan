"use client";

import {
  AdvancedMarker,
  Map as GoogleMap,
  InfoWindow,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps";
import { Camera, Coffee, MapPin, Utensils, Wine } from "lucide-react";
import { useEffect, useMemo } from "react";
import type { GeneratedActivityTypeT } from "@/features/trips/generate";
import { getMapId } from "./api-provider";

export interface MapActivity {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  dayNumber: number;
  /** Activity category — drives the selected-pin glyph. */
  type?: GeneratedActivityTypeT;
  /** Google Places photo reference — when present, InfoWindow lazy-loads it. */
  photoReference?: string | null;
}

interface TripMapProps {
  destination?: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
  activities: MapActivity[];
  selectedActivityId: string | null;
  onSelectActivity: (id: string | null) => void;
  /** Map ID for styling and AdvancedMarker support. Defaults to env. */
  mapId?: string;
}

export function TripMap({
  destination,
  destinationLat,
  destinationLng,
  activities,
  selectedActivityId,
  onSelectActivity,
  mapId = getMapId(),
}: TripMapProps) {
  const center = useMemo(() => {
    if (destinationLat != null && destinationLng != null) {
      return { lat: destinationLat, lng: destinationLng };
    }
    if (activities.length > 0) {
      return { lat: activities[0].latitude, lng: activities[0].longitude };
    }
    return { lat: 0, lng: 0 };
  }, [destinationLat, destinationLng, activities]);

  const selected = activities.find((a) => a.id === selectedActivityId) ?? null;

  return (
    <div className="relative h-full w-full">
      <GoogleMap
        defaultCenter={center}
        defaultZoom={activities.length > 0 ? 12 : 5}
        mapId={mapId}
        gestureHandling="greedy"
        disableDefaultUI={false}
        clickableIcons={false}
        onClick={() => onSelectActivity(null)}
      >
        <BoundsFitter activities={activities} fallbackCenter={center} />
        {activities.map((a) => (
          <ActivityMarker
            key={a.id}
            activity={a}
            isSelected={a.id === selectedActivityId}
            onClick={() => onSelectActivity(a.id)}
          />
        ))}
        {selected && (
          <InfoWindow
            position={{ lat: selected.latitude, lng: selected.longitude }}
            // Clears the scale-1.4 Pin (~56px) + day-number badge (~7px) with
            // a few px of breathing room above.
            pixelOffset={[0, -64]}
            onCloseClick={() => onSelectActivity(null)}
          >
            <ActivityInfoContent activity={selected} />
          </InfoWindow>
        )}
      </GoogleMap>
      {activities.length === 0 && destination && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-white/90 px-2 py-1 text-xs text-zinc-700 shadow-sm">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {destination}
          </span>
        </div>
      )}
    </div>
  );
}

function ActivityInfoContent({ activity }: { activity: MapActivity }) {
  const photoUrl = buildPlacePhotoUrl(activity.photoReference);
  return (
    <div className="w-56 overflow-hidden">
      {photoUrl && (
        <img
          src={photoUrl}
          alt={activity.name}
          loading="lazy"
          className="mb-2 h-28 w-full rounded object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}
      <div className="px-1 py-0.5">
        <div className="text-xs uppercase tracking-wide text-zinc-500">
          Day {activity.dayNumber}
        </div>
        <div className="text-sm font-semibold capitalize">
          {activity.name.toLowerCase()}
        </div>
      </div>
    </div>
  );
}

/**
 * Constructs a Google Places Photo API URL from a stored `photo_reference`.
 * The image is billed only when the browser actually fetches it (on click +
 * InfoWindow mount), so we never pay for viewers who don't interact.
 */
function buildPlacePhotoUrl(
  photoReference: string | null | undefined
): string | null {
  if (!photoReference) return null;
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
  if (!key) return null;
  const url = new URL("https://maps.googleapis.com/maps/api/place/photo");
  url.searchParams.set("photoreference", photoReference);
  url.searchParams.set("maxwidth", "400");
  url.searchParams.set("key", key);
  return url.toString();
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

/**
 * Two visual tiers:
 *  - unselected → small colored dot, recedes on a busy map
 *  - selected   → full Pin with type glyph + day-number badge
 * See KRE-34.
 */
function ActivityMarker({
  activity,
  isSelected,
  onClick,
}: {
  activity: MapActivity;
  isSelected: boolean;
  onClick: () => void;
}) {
  const position = { lat: activity.latitude, lng: activity.longitude };

  if (!isSelected) {
    return (
      <AdvancedMarker
        position={position}
        onClick={onClick}
        title={activity.name}
      >
        <div
          className="h-3 w-3 cursor-pointer rounded-full border-2 border-white shadow-md transition-transform hover:scale-125"
          style={{ backgroundColor: PIN_BG }}
        />
      </AdvancedMarker>
    );
  }

  const Glyph = activity.type ? TYPE_ICON[activity.type] : null;

  return (
    <AdvancedMarker position={position} onClick={onClick} zIndex={1000}>
      <div className="relative">
        <Pin
          background={PIN_BG}
          borderColor={PIN_BORDER}
          glyphColor="#fff"
          scale={1.4}
        >
          {Glyph && <Glyph className="h-4 w-4 text-white" />}
        </Pin>
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-primary px-1 text-[10px] font-bold leading-none text-white shadow">
          {activity.dayNumber}
        </span>
      </div>
    </AdvancedMarker>
  );
}

/**
 * When activities change, pan/zoom the map to fit all pins. Runs once per
 * activity-set change; selection changes are handled by panTo elsewhere.
 */
function BoundsFitter({
  activities,
  fallbackCenter,
}: {
  activities: MapActivity[];
  fallbackCenter: { lat: number; lng: number };
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (activities.length === 0) {
      map.setCenter(fallbackCenter);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    for (const a of activities) {
      bounds.extend({ lat: a.latitude, lng: a.longitude });
    }
    map.fitBounds(bounds, 64);
  }, [map, activities, fallbackCenter]);

  return null;
}
