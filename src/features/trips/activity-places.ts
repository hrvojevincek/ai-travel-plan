import "server-only";

import { type FindPlaceResult, findPlaceMany } from "./find-place";

export interface ActivityPlaceQuery {
  name: string;
  address: string;
}

export type ActivityPlaceLookup = typeof findPlaceMany;

/**
 * Place lookup for a batch of Activities: build a Places text query from
 * name + address + destination, then look up. Aligned `(place | null)[]`.
 * Places throw becomes a miss per item — callers still get a usable result
 * without pins. Callers decide which Activities to send.
 */
export async function lookupActivityPlaces(
  items: ActivityPlaceQuery[],
  destination: string,
  lookup: ActivityPlaceLookup = findPlaceMany
): Promise<(FindPlaceResult | null)[]> {
  if (items.length === 0) return [];

  const requests = items.map((item) => ({
    name: item.name,
    query: buildPlaceQuery(item.name, item.address, destination),
  }));

  try {
    return await lookup(requests);
  } catch (e) {
    console.warn(
      "[trips/activity-places] lookup threw; treating all as misses:",
      e instanceof Error ? e.message : e
    );
    return items.map(() => null);
  }
}

function buildPlaceQuery(
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
