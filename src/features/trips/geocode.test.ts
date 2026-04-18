import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { geocodeMany, geocodeOne } from "./geocode";

const originalEnv = { ...process.env };

function fetchResponding(
  body: unknown,
  init: { ok?: boolean; status?: number } = {}
): typeof fetch {
  return vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status: init.status ?? 200,
        headers: { "Content-Type": "application/json" },
      })
  ) as unknown as typeof fetch;
}

describe("geocodeOne", () => {
  beforeEach(() => {
    process.env.GOOGLE_MAPS_SERVER_KEY = "test-key";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("returns lat/lng from the first result on OK", async () => {
    const fetcher = fetchResponding({
      status: "OK",
      results: [{ geometry: { location: { lat: 38.7223, lng: -9.1393 } } }],
    });
    const result = await geocodeOne("Tram 28, Lisbon", fetcher);
    expect(result).toEqual({ latitude: 38.7223, longitude: -9.1393 });
  });

  it("returns null on ZERO_RESULTS", async () => {
    const fetcher = fetchResponding({ status: "ZERO_RESULTS", results: [] });
    expect(await geocodeOne("not-a-real-place-xyz", fetcher)).toBeNull();
  });

  it("returns null on OVER_QUERY_LIMIT without throwing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetcher = fetchResponding({
      status: "OVER_QUERY_LIMIT",
      results: [],
      error_message: "quota",
    });
    expect(await geocodeOne("anything", fetcher)).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("returns null when fetch throws (network error)", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValue(new Error("ECONNREFUSED")) as unknown as typeof fetch;
    expect(await geocodeOne("anything", fetcher)).toBeNull();
  });

  it("returns null on non-2xx HTTP status", async () => {
    const fetcher = fetchResponding({}, { status: 500 });
    expect(await geocodeOne("anything", fetcher)).toBeNull();
  });

  it("returns null when GOOGLE_MAPS_SERVER_KEY is not set", async () => {
    process.env.GOOGLE_MAPS_SERVER_KEY = "";
    const fetcher = vi.fn() as unknown as typeof fetch;
    expect(await geocodeOne("anything", fetcher)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("returns null when query is whitespace", async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    expect(await geocodeOne("   ", fetcher)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("geocodeMany", () => {
  beforeEach(() => {
    process.env.GOOGLE_MAPS_SERVER_KEY = "test-key";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("preserves input order and fires requests in parallel", async () => {
    const calls: string[] = [];
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = input.toString();
      const match = /[?&]address=([^&]+)/.exec(url);
      const addr = decodeURIComponent(match?.[1] ?? "");
      calls.push(addr);
      const coords: Record<string, { lat: number; lng: number }> = {
        a: { lat: 1, lng: 1 },
        b: { lat: 2, lng: 2 },
        c: { lat: 3, lng: 3 },
      };
      const loc = coords[addr] ?? coords.a;
      return new Response(
        JSON.stringify({
          status: "OK",
          results: [{ geometry: { location: loc } }],
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const out = await geocodeMany(
      [
        { name: "A", query: "a" },
        { name: "B", query: "b" },
        { name: "C", query: "c" },
      ],
      fetcher
    );

    expect(out).toEqual([
      { latitude: 1, longitude: 1 },
      { latitude: 2, longitude: 2 },
      { latitude: 3, longitude: 3 },
    ]);
    // All three fired (order in calls[] is not asserted — Promise.all is
    // parallel so interleaving is implementation-defined).
    expect(calls).toHaveLength(3);
  });

  it("keeps a null slot for individual failures without breaking siblings", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = input.toString();
      const addr = /[?&]address=([^&]+)/.exec(url)?.[1] ?? "";
      if (addr === "bad") {
        return new Response(
          JSON.stringify({ status: "ZERO_RESULTS", results: [] }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          status: "OK",
          results: [{ geometry: { location: { lat: 1, lng: 1 } } }],
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const out = await geocodeMany(
      [
        { name: "good", query: "good" },
        { name: "bad", query: "bad" },
        { name: "also good", query: "good2" },
      ],
      fetcher
    );

    expect(out[0]).not.toBeNull();
    expect(out[1]).toBeNull();
    expect(out[2]).not.toBeNull();
  });
});
