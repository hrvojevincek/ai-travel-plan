"use client";

import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useCallback, useEffect, useRef, useState } from "react";
import usePlacesAutocomplete from "use-places-autocomplete";
import { Input } from "@/components/ui/input";
import {
  resolveDestinationCoords,
  SuggestionsList,
  useClickOutside,
} from "./places-autocomplete.helpers";

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
 * Destination input with Google Places Autocomplete via the shared Maps JS session.
 * Falls back to a plain text field when the library is still loading or unavailable.
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
    initOnMount: false,
    debounce: 250,
    requestOptions: { types: ["(cities)"] },
  });

  useEffect(() => {
    if (placesLib) init();
  }, [placesLib, init]);

  useEffect(() => {
    if (value !== inputValue) setValue(value, false);
  }, [value, inputValue, setValue]);

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const closeDropdown = useCallback(() => setOpen(false), []);
  useClickOutside(wrapperRef, open, closeDropdown);

  const handleSelect = useCallback(
    async (description: string, placeId: string) => {
      setValue(description, false);
      onValueChange(description);
      clearSuggestions();
      setOpen(false);

      try {
        const { lat, lng } = await resolveDestinationCoords(
          description,
          placeId,
          placesLib
        );
        onPick({ description, placeId, lat, lng });
      } catch {
        onClearPick();
      }
    },
    [
      placesLib,
      setValue,
      clearSuggestions,
      onValueChange,
      onPick,
      onClearPick,
    ]
  );

  const handleChange = useCallback(
    (nextValue: string) => {
      onValueChange(nextValue);
      if (ready) setValue(nextValue);
      onClearPick();
      setOpen(true);
    },
    [onValueChange, ready, setValue, onClearPick]
  );

  const showSuggestions =
    open && ready && status === "OK" && data.length > 0;

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
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={onBlur}
      />
      {showSuggestions && (
        <SuggestionsList suggestions={data} onSelect={handleSelect} />
      )}
    </div>
  );
}
