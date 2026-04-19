"use client";

import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import usePlacesAutocomplete, {
  getDetails,
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface DestinationPick {
  description: string;
  placeId: string;
  lat: number;
  lng: number;
}

interface PlacesAutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  onPick: (pick: DestinationPick) => void;
  onClearPick: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  autoComplete?: string;
  id?: string;
  "aria-invalid"?: boolean;
  /** Forward react-hook-form's field.onBlur so touched/dirty state works. */
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  /** Forward react-hook-form's field.ref so RHF can focus on validation fail. */
  inputRef?: React.Ref<HTMLInputElement>;
}

/**
 * Destination input with Google Places Autocomplete.
 * - Uses the shared Maps JS session via APIProvider.
 * - After a suggestion is picked, fetches place details (places library) to
 *   get lat/lng + place_id. Stays on the browser key (no server roundtrip).
 * - If the Maps library hasn't loaded yet (no key, or loading), the input
 *   still works as a plain text field and we emit a `description`-only pick
 *   on blur via onValueChange.
 */
export function PlacesAutocomplete({
  value,
  onValueChange,
  onPick,
  onClearPick,
  placeholder,
  className,
  disabled,
  name,
  autoComplete,
  id,
  "aria-invalid": ariaInvalid,
  onBlur,
  inputRef,
}: PlacesAutocompleteProps) {
  const placesLib = useMapsLibrary("places");
  const {
    ready,
    value: inputValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
    init,
  } = usePlacesAutocomplete({
    // @vis.gl/react-google-maps owns the script loader; don't let
    // use-places-autocomplete load a second copy. Init manually once
    // the places library is ready.
    initOnMount: false,
    debounce: 250,
    requestOptions: { types: ["(cities)"] },
  });

  useEffect(() => {
    if (placesLib) init();
  }, [placesLib, init]);

  // Keep the hook's internal value in sync with the form's value. Only
  // depends on the external `value` — internal inputValue is derived.
  useEffect(() => {
    if (value !== inputValue) setValue(value, false);
  }, [value, inputValue, setValue]);

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handleSelect = useCallback(
    async (description: string, placeId: string) => {
      setValue(description, false);
      onValueChange(description);
      clearSuggestions();
      setOpen(false);
      try {
        if (placesLib && placeId) {
          const details = (await getDetails({
            placeId,
            fields: ["geometry"],
          })) as google.maps.places.PlaceResult;
          const loc = details.geometry?.location;
          if (loc) {
            onPick({
              description,
              placeId,
              lat: loc.lat(),
              lng: loc.lng(),
            });
            return;
          }
        }
        // Fallback: geocode by the address string — still on browser key's
        // Places permission via getGeocode which uses the Places service.
        const results = await getGeocode({ address: description });
        const { lat, lng } = getLatLng(results[0]);
        onPick({ description, placeId, lat, lng });
      } catch {
        // Couldn't resolve coords; let user continue with just the text.
        // saveTrip will geocode activities server-side regardless.
        onClearPick();
      }
    },
    [placesLib, setValue, clearSuggestions, onValueChange, onPick, onClearPick]
  );

  const showDropdown = open && ready && status === "OK" && data.length > 0;

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        id={id}
        name={name}
        ref={inputRef}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        className={className}
        onChange={(e) => {
          const v = e.target.value;
          onValueChange(v);
          // Only feed the autocomplete hook when its library has loaded;
          // falls through to plain text input otherwise (documented contract).
          if (ready) setValue(v);
          onClearPick();
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={onBlur}
      />
      {showDropdown && (
        <div
          role="listbox"
          aria-label="Destination suggestions"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-md border bg-popover p-1 shadow-md"
        >
          {data.map((s) => (
            <button
              key={s.place_id}
              type="button"
              role="option"
              aria-selected={false}
              // onMouseDown just blocks the input blur that would otherwise
              // close the dropdown before the click registers.
              onMouseDown={(e) => e.preventDefault()}
              // Selection goes on onClick so keyboard users (Enter/Space on a
              // focused button) trigger the same path as mouse users.
              onClick={() => {
                void handleSelect(s.description, s.place_id);
              }}
              className={cn(
                "flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
              )}
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1">
                <span className="block font-medium">
                  {s.structured_formatting.main_text}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {s.structured_formatting.secondary_text}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
