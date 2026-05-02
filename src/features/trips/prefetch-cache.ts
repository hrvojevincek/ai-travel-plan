import {
  GeneratedTripResponse,
  type GeneratedTripResponseT,
} from "./generate";

const PREFETCH_STORAGE_KEY = "trip:new:prefetch";

interface PrefetchedTripPayload {
  destination: string;
  duration: number;
  preferences?: string;
  trip: GeneratedTripResponseT;
}

function normalizePreferences(preferences: string | undefined): string | undefined {
  if (!preferences) return undefined;
  const trimmed = preferences.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function savePrefetchedTrip(payload: PrefetchedTripPayload): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PREFETCH_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn(`Failed to cache prefetched trip in ${PREFETCH_STORAGE_KEY}.`, error);
  }
}

function readPrefetchedTrip(input: {
  destination: string;
  duration: number;
  preferences?: string;
}): GeneratedTripResponseT | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(PREFETCH_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PrefetchedTripPayload;
    const trip = GeneratedTripResponse.safeParse(parsed.trip);
    if (!trip.success) return null;

    const destinationMatches = parsed.destination === input.destination;
    const durationMatches = parsed.duration === input.duration;
    const preferencesMatch =
      normalizePreferences(parsed.preferences) ===
      normalizePreferences(input.preferences);

    if (!destinationMatches || !durationMatches || !preferencesMatch) {
      return null;
    }

    return trip.data;
  } catch {
    return null;
  }
}

export function peekPrefetchedTrip(input: {
  destination: string;
  duration: number;
  preferences?: string;
}): GeneratedTripResponseT | null {
  return readPrefetchedTrip(input);
}

export function takePrefetchedTrip(input: {
  destination: string;
  duration: number;
  preferences?: string;
}): GeneratedTripResponseT | null {
  if (typeof window === "undefined") return null;
  try {
    const trip = readPrefetchedTrip(input);
    window.sessionStorage.removeItem(PREFETCH_STORAGE_KEY);
    return trip;
  } catch {
    return null;
  }
}
