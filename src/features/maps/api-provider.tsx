"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import type { ReactNode } from "react";

export function MapsApiProvider({ children }: { children: ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
  if (!apiKey) return <>{children}</>;
  return (
    <APIProvider apiKey={apiKey} libraries={["places"]}>
      {children}
    </APIProvider>
  );
}

export function hasMapsApiKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY);
}

// AdvancedMarker + Pin require a configured Map ID (set in Google Cloud Console
// → Maps JS → Map styles). Without one, markers silently fall back to the old
// red-pin API and styled maps don't apply.
export function getMapId(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || undefined;
}
