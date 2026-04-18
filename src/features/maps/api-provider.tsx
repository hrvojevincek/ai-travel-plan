"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import type { ReactNode } from "react";

/**
 * Wraps children in a Google Maps JS APIProvider. Expects
 * NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY to be set. If it's missing,
 * renders children unwrapped — consumers use `useHasMapsApi()` (or
 * simply check the key) to render a fallback.
 */
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
