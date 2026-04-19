import "server-only";

export interface FindPlaceResult {
  latitude: number;
  longitude: number;
  placeId: string;
  photoReference: string | null;
}

interface FindPlaceRequest {
  /** Raw activity name — included for log context. */
  name: string;
  /** Text query passed to Find Place (e.g. `"Pastéis de Belém, Lisbon"`). */
  query: string;
}

interface FindPlaceApiResponse {
  status: string;
  error_message?: string;
  candidates: Array<{
    place_id: string;
    geometry: { location: { lat: number; lng: number } };
    photos?: Array<{ photo_reference: string }>;
  }>;
}

const ENDPOINT =
  "https://maps.googleapis.com/maps/api/place/findplacefromtext/json";
const FIELDS = "place_id,geometry,photos";
const TIMEOUT_MS = 5_000;

/**
 * Look up a single POI via Google Places Find Place From Text. Returns
 * place_id + coords + first photo reference in one API call — what used to
 * take a Geocode + Place Details round-trip.
 *
 * Returns `null` on ZERO_RESULTS, quota errors, network failure, or timeout —
 * the caller can still persist the activity without a pin/photo. Uses an
 * AbortController so one slow request can't drag out a batch save.
 */
export async function findPlaceOne(
  query: string,
  fetcher: typeof fetch = fetch
): Promise<FindPlaceResult | null> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) {
    console.warn("[find-place] GOOGLE_MAPS_SERVER_KEY not set — skipping.");
    return null;
  }
  if (!query.trim()) return null;

  const url = new URL(ENDPOINT);
  url.searchParams.set("input", query);
  url.searchParams.set("inputtype", "textquery");
  url.searchParams.set("fields", FIELDS);
  url.searchParams.set("key", key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetcher(url.toString(), { signal: controller.signal });
    if (!res.ok) {
      console.warn(`[find-place] http=${res.status} queryLen=${query.length}`);
      return null;
    }
    const data = (await res.json()) as FindPlaceApiResponse;
    if (data.status === "OK" && data.candidates[0]) {
      const c = data.candidates[0];
      return {
        latitude: c.geometry.location.lat,
        longitude: c.geometry.location.lng,
        placeId: c.place_id,
        photoReference: c.photos?.[0]?.photo_reference ?? null,
      };
    }
    if (data.status === "ZERO_RESULTS") return null;
    // OVER_QUERY_LIMIT, REQUEST_DENIED, INVALID_REQUEST, UNKNOWN_ERROR
    console.warn(
      `[find-place] status=${data.status} queryLen=${query.length} msg=${data.error_message ?? "-"}`
    );
    return null;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      console.warn(
        `[find-place] timeout (${TIMEOUT_MS}ms) queryLen=${query.length}`
      );
    } else {
      console.warn(
        `[find-place] fetch failed queryLen=${query.length}:`,
        e instanceof Error ? e.message : e
      );
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Max simultaneous Places Find Place requests per batch. Google's per-project
 *  QPS limits aren't publicly documented but a common default is ~10 QPS —
 *  an unbounded fanout of 210 (30-day trip × 7 activities) would routinely
 *  trip OVER_QUERY_LIMIT. 5 keeps us well clear while still finishing a
 *  cold-generate inside the 60s route timeout. */
const MAX_CONCURRENCY = 5;

/** Batch-lookup several places with bounded concurrency; order preserved,
 *  `null` on miss. */
export async function findPlaceMany(
  requests: FindPlaceRequest[],
  fetcher: typeof fetch = fetch
): Promise<(FindPlaceResult | null)[]> {
  const results: (FindPlaceResult | null)[] = new Array(requests.length).fill(
    null
  );
  let next = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = next++;
      if (index >= requests.length) return;
      results[index] = await findPlaceOne(requests[index].query, fetcher);
    }
  }

  const workerCount = Math.min(MAX_CONCURRENCY, requests.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
