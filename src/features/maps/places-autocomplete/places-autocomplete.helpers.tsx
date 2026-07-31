"use client";

import { MapPin } from "lucide-react";
import { useEffect } from "react";
import { getDetails, getGeocode, getLatLng } from "use-places-autocomplete";
import { cn } from "@/lib/utils";

export interface PlaceSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export async function resolveDestinationCoords(
  description: string,
  placeId: string,
  placesLib: google.maps.PlacesLibrary | null
): Promise<{ lat: number; lng: number }> {
  if (placesLib && placeId) {
    const details = (await getDetails({
      placeId,
      fields: ["geometry"],
    })) as google.maps.places.PlaceResult;
    const loc = details.geometry?.location;
    if (loc) return { lat: loc.lat(), lng: loc.lng() };
  }

  const results = await getGeocode({ address: description });
  return getLatLng(results[0]);
}

export function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
  onOutside: () => void
) {
  useEffect(() => {
    if (!active) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [active, onOutside, ref]);
}

export function SuggestionsList({
  suggestions,
  onSelect,
}: {
  suggestions: PlaceSuggestion[];
  onSelect: (description: string, placeId: string) => void;
}) {
  return (
    <div
      role="listbox"
      aria-label="Destination suggestions"
      className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-md border bg-popover p-1 shadow-md"
    >
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.place_id}
          type="button"
          role="option"
          aria-selected={false}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(suggestion.description, suggestion.place_id)}
          className={cn(
            "flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
          )}
        >
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1">
            <span className="block font-medium">
              {suggestion.structured_formatting.main_text}
            </span>
            <span className="block text-xs text-muted-foreground">
              {suggestion.structured_formatting.secondary_text}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
