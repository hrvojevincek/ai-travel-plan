"use client";

import {
  AdvancedMarker,
  Map as GoogleMap,
  InfoWindow,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";
import { useEffect, useMemo } from "react";

export interface MapActivity {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  dayNumber: number;
}

interface TripMapProps {
  destination?: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
  activities: MapActivity[];
  selectedActivityId: string | null;
  onSelectActivity: (id: string | null) => void;
  /** Map ID for styling. Optional. */
  mapId?: string;
}

export function TripMap({
  destination,
  destinationLat,
  destinationLng,
  activities,
  selectedActivityId,
  onSelectActivity,
  mapId,
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
            pixelOffset={[0, -36]}
            onCloseClick={() => onSelectActivity(null)}
          >
            <div className="px-1 py-0.5">
              <div className="text-xs uppercase tracking-wide text-zinc-500">
                Day {selected.dayNumber}
              </div>
              <div className="text-sm font-semibold capitalize">
                {selected.name.toLowerCase()}
              </div>
            </div>
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

function ActivityMarker({
  activity,
  isSelected,
  onClick,
}: {
  activity: MapActivity;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <AdvancedMarker
      position={{ lat: activity.latitude, lng: activity.longitude }}
      onClick={onClick}
      zIndex={isSelected ? 1000 : undefined}
    >
      <Pin
        background={isSelected ? "#1d4ed8" : "#2563eb"}
        borderColor={isSelected ? "#1e3a8a" : "#1e40af"}
        glyphColor="#fff"
        scale={isSelected ? 1.3 : 1.0}
      />
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
