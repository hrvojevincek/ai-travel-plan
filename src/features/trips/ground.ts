import "server-only";

import type { LanguageModel } from "ai";
import { type FindPlaceResult, findPlaceMany } from "./find-place";
import {
  type GeneratedTripResponseT,
  type GeneratedTripT,
  type GenerateTripOpts,
  generateTrip,
  regenerateUngroundedActivities,
  type UngroundedSlot,
} from "./generate";

export const MAX_GROUNDING_PASSES = 2;

export interface GroundTripOpts extends GenerateTripOpts {
  model?: LanguageModel;
  /** Injected for tests — defaults to findPlaceMany. */
  lookupPlaces?: typeof findPlaceMany;
}

/**
 * Build a Places text query preferring the LLM street address when present.
 */
export function buildPlaceQuery(
  name: string,
  address: string,
  destination: string
): string {
  const addr = address.trim();
  const dest = destination.trim();
  if (!addr) return `${name}, ${dest}`;
  if (dest && addr.toLowerCase().includes(dest.toLowerCase())) {
    return addr;
  }
  return `${name}, ${addr}, ${dest}`;
}

function placesKeyConfigured(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_SERVER_KEY?.trim());
}

/**
 * Generate a trip, ground each activity via Google Places, and regenerate
 * ungroundable slots (when a Places API key is configured). Remaining misses
 * still return null coords so the trip is usable without pins.
 */
export async function generateTripWithGrounding(
  opts: GroundTripOpts
): Promise<GeneratedTripResponseT> {
  let trip = await generateTrip(opts);
  const lookup = opts.lookupPlaces ?? findPlaceMany;

  // Without a Places key every lookup is null — skip repair loops.
  if (!placesKeyConfigured() && !opts.lookupPlaces) {
    return attachPlaceResults(
      trip,
      trip.days.flatMap((d) => d.activities.map(() => null))
    );
  }

  for (let pass = 0; pass < MAX_GROUNDING_PASSES; pass++) {
    const { places, failures } = await lookupAll(trip, lookup);

    if (failures.length === 0) {
      return attachPlaceResults(trip, places);
    }

    console.warn(
      `[trips/ground] pass=${pass + 1} ungrounded=${failures.length} ` +
        `names=${failures.map((f) => f.previousName).join("|")}`
    );

    const isLastPass = pass === MAX_GROUNDING_PASSES - 1;
    if (isLastPass) {
      return attachPlaceResults(trip, places);
    }

    trip = await regenerateUngroundedActivities(opts, trip, failures);
  }

  // Unreachable — loop always returns — but keeps TS happy.
  return attachPlaceResults(
    trip,
    trip.days.flatMap((d) => d.activities.map(() => null))
  );
}

async function lookupAll(
  trip: GeneratedTripT,
  lookup: typeof findPlaceMany
): Promise<{
  places: (FindPlaceResult | null)[];
  failures: UngroundedSlot[];
}> {
  const requests = trip.days.flatMap((d) =>
    d.activities.map((a) => ({
      name: a.name,
      query: buildPlaceQuery(a.name, a.address, trip.destination),
    }))
  );

  let places: (FindPlaceResult | null)[];
  try {
    places = await lookup(requests);
  } catch (e) {
    console.warn(
      "[trips/ground] findPlaceMany threw; treating all as ungrounded:",
      e instanceof Error ? e.message : e
    );
    places = requests.map(() => null);
  }

  const failures: UngroundedSlot[] = [];
  let i = 0;
  for (let dayIdx = 0; dayIdx < trip.days.length; dayIdx++) {
    for (
      let actIdx = 0;
      actIdx < trip.days[dayIdx].activities.length;
      actIdx++
    ) {
      const p = places[i++];
      if (!p) {
        const a = trip.days[dayIdx].activities[actIdx];
        failures.push({
          dayIdx,
          actIdx,
          previousName: a.name,
          type: a.type,
        });
      }
    }
  }

  return { places, failures };
}

function attachPlaceResults(
  trip: GeneratedTripT,
  places: (FindPlaceResult | null)[]
): GeneratedTripResponseT {
  let i = 0;
  return {
    ...trip,
    days: trip.days.map((d) => ({
      dayNumber: d.dayNumber,
      activities: d.activities.map((a) => {
        const p = places[i++];
        return {
          ...a,
          latitude: p?.latitude ?? null,
          longitude: p?.longitude ?? null,
          placeId: p?.placeId ?? null,
          photoReference: p?.photoReference ?? null,
        };
      }),
    })),
  };
}
