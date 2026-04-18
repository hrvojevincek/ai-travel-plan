import "server-only";

export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

interface GeocodeRequest {
  /** Raw activity name — always included so we can log which entry failed. */
  name: string;
  /** `{activity name}, {destination}` or free-form address. */
  query: string;
}

interface GeocodeApiResponse {
  status: string;
  error_message?: string;
  results: Array<{
    geometry: { location: { lat: number; lng: number } };
  }>;
}

const ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";
const TIMEOUT_MS = 5_000;

/**
 * Geocode a single address via Google's Geocoding API.
 * Returns `null` on ZERO_RESULTS, quota errors, network failure, or timeout —
 * the caller can still persist the activity without a pin. Uses an
 * AbortController so one slow request can't drag out a batch save.
 */
export async function geocodeOne(
  query: string,
  fetcher: typeof fetch = fetch
): Promise<GeocodeResult | null> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) {
    console.warn("[geocode] GOOGLE_MAPS_SERVER_KEY not set — skipping.");
    return null;
  }
  if (!query.trim()) return null;

  const url = new URL(ENDPOINT);
  url.searchParams.set("address", query);
  url.searchParams.set("key", key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetcher(url.toString(), { signal: controller.signal });
    if (!res.ok) {
      console.warn(`[geocode] http ${res.status} for query="${query}"`);
      return null;
    }
    const data = (await res.json()) as GeocodeApiResponse;
    if (data.status === "OK" && data.results[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      return { latitude: lat, longitude: lng };
    }
    if (data.status === "ZERO_RESULTS") return null;
    // OVER_QUERY_LIMIT, REQUEST_DENIED, INVALID_REQUEST, UNKNOWN_ERROR
    console.warn(
      `[geocode] status=${data.status} for query="${query}" msg=${data.error_message ?? "-"}`
    );
    return null;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      console.warn(`[geocode] timeout (${TIMEOUT_MS}ms) for query="${query}"`);
    } else {
      console.warn(
        `[geocode] fetch failed for query="${query}":`,
        e instanceof Error ? e.message : e
      );
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Batch-geocode several addresses in parallel. Returns results in the same
 * order as the input. Each entry is `null` when the individual lookup failed.
 */
export async function geocodeMany(
  requests: GeocodeRequest[],
  fetcher: typeof fetch = fetch
): Promise<(GeocodeResult | null)[]> {
  return Promise.all(requests.map((r) => geocodeOne(r.query, fetcher)));
}
