import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findPlaceMany, findPlaceOne } from "./find-place";

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

describe("findPlaceOne", () => {
  beforeEach(() => {
    process.env.GOOGLE_MAPS_SERVER_KEY = "test-key";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("returns lat/lng, placeId, and photoReference from the first candidate on OK", async () => {
    const fetcher = fetchResponding({
      status: "OK",
      candidates: [
        {
          place_id: "ChIJ_Test_01",
          geometry: { location: { lat: 38.7, lng: -9.14 } },
          photos: [{ photo_reference: "CmR_Photo_01" }],
        },
      ],
    });
    const result = await findPlaceOne("Pastéis de Belém, Lisbon", fetcher);
    expect(result).toEqual({
      latitude: 38.7,
      longitude: -9.14,
      placeId: "ChIJ_Test_01",
      photoReference: "CmR_Photo_01",
    });
  });

  it("returns null photoReference when candidate has no photos", async () => {
    const fetcher = fetchResponding({
      status: "OK",
      candidates: [
        {
          place_id: "ChIJ_Test_NoPhoto",
          geometry: { location: { lat: 1, lng: 2 } },
        },
      ],
    });
    const r = await findPlaceOne("Obscure landmark", fetcher);
    expect(r).toEqual({
      latitude: 1,
      longitude: 2,
      placeId: "ChIJ_Test_NoPhoto",
      photoReference: null,
    });
  });

  it("returns null on ZERO_RESULTS", async () => {
    const fetcher = fetchResponding({ status: "ZERO_RESULTS", candidates: [] });
    expect(await findPlaceOne("not-a-real-place-xyz", fetcher)).toBeNull();
  });

  it("returns null on OVER_QUERY_LIMIT without throwing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetcher = fetchResponding({
      status: "OVER_QUERY_LIMIT",
      candidates: [],
      error_message: "quota",
    });
    expect(await findPlaceOne("anything", fetcher)).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("returns null when fetch throws (network error)", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValue(new Error("ECONNREFUSED")) as unknown as typeof fetch;
    expect(await findPlaceOne("anything", fetcher)).toBeNull();
  });

  it("returns null on non-2xx HTTP status", async () => {
    const fetcher = fetchResponding({}, { status: 500 });
    expect(await findPlaceOne("anything", fetcher)).toBeNull();
  });

  it("aborts a slow request after the timeout and returns null", async () => {
    vi.useFakeTimers();
    try {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const fetcher = vi.fn(
        (_url: string | URL, init?: RequestInit) =>
          new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener("abort", () => {
              const err = new Error("aborted");
              err.name = "AbortError";
              reject(err);
            });
          })
      ) as unknown as typeof fetch;

      const pending = findPlaceOne("Somewhere", fetcher);
      await vi.advanceTimersByTimeAsync(6_000);

      await expect(pending).resolves.toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/timeout.*queryLen=\d+/)
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns null when GOOGLE_MAPS_SERVER_KEY is not set", async () => {
    process.env.GOOGLE_MAPS_SERVER_KEY = "";
    const fetcher = vi.fn() as unknown as typeof fetch;
    expect(await findPlaceOne("anything", fetcher)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("returns null on whitespace query", async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    expect(await findPlaceOne("   ", fetcher)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("requests the right fields so photos come back", async () => {
    const calls: string[] = [];
    const fetcher = vi.fn(async (url: string | URL | Request) => {
      calls.push(url.toString());
      return new Response(JSON.stringify({ status: "OK", candidates: [] }), {
        status: 200,
      });
    }) as unknown as typeof fetch;
    await findPlaceOne("Eiffel Tower, Paris", fetcher);
    expect(calls[0]).toContain("fields=place_id%2Cgeometry%2Cphotos");
    expect(calls[0]).toContain("inputtype=textquery");
  });
});

describe("findPlaceMany", () => {
  beforeEach(() => {
    process.env.GOOGLE_MAPS_SERVER_KEY = "test-key";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("preserves input order and fires requests in parallel", async () => {
    const DELAY_MS = 30;
    const startTimes: Record<string, number> = {};
    const endTimes: Record<string, number> = {};
    const fixtures: Record<
      string,
      { lat: number; lng: number; place_id: string }
    > = {
      a: { lat: 1, lng: 1, place_id: "pid-a" },
      b: { lat: 2, lng: 2, place_id: "pid-b" },
      c: { lat: 3, lng: 3, place_id: "pid-c" },
    };
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = input.toString();
      const q = decodeURIComponent(/[?&]input=([^&]+)/.exec(url)?.[1] ?? "");
      startTimes[q] = Date.now();
      await new Promise((r) => setTimeout(r, DELAY_MS));
      endTimes[q] = Date.now();
      const f = fixtures[q] ?? fixtures.a;
      return new Response(
        JSON.stringify({
          status: "OK",
          candidates: [
            {
              place_id: f.place_id,
              geometry: { location: { lat: f.lat, lng: f.lng } },
            },
          ],
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const out = await findPlaceMany(
      [
        { name: "A", query: "a" },
        { name: "B", query: "b" },
        { name: "C", query: "c" },
      ],
      fetcher
    );

    expect(out.map((r) => r?.placeId)).toEqual(["pid-a", "pid-b", "pid-c"]);
    expect(startTimes.b).toBeLessThan(endTimes.a);
    expect(startTimes.c).toBeLessThan(endTimes.b);
  });

  it("caps concurrency at 5 workers so large batches don't trip OVER_QUERY_LIMIT", async () => {
    const DELAY_MS = 30;
    let inFlight = 0;
    let maxInFlight = 0;
    const fetcher = vi.fn(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, DELAY_MS));
      inFlight--;
      return new Response(
        JSON.stringify({
          status: "OK",
          candidates: [
            {
              place_id: "pid",
              geometry: { location: { lat: 1, lng: 1 } },
            },
          ],
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    // 20 inputs — enough to prove the cap held across multiple waves.
    const inputs = Array.from({ length: 20 }, (_, i) => ({
      name: `n-${i}`,
      query: `q-${i}`,
    }));
    const out = await findPlaceMany(inputs, fetcher);

    expect(out).toHaveLength(20);
    expect(out.every((r) => r !== null)).toBe(true);
    expect(maxInFlight).toBeLessThanOrEqual(5);
    expect(maxInFlight).toBeGreaterThanOrEqual(5);
  });

  it("keeps a null slot for individual failures without breaking siblings", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = input.toString();
      const q = /[?&]input=([^&]+)/.exec(url)?.[1] ?? "";
      if (q === "bad") {
        return new Response(
          JSON.stringify({ status: "ZERO_RESULTS", candidates: [] }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          status: "OK",
          candidates: [
            {
              place_id: "pid",
              geometry: { location: { lat: 1, lng: 1 } },
            },
          ],
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const out = await findPlaceMany(
      [
        { name: "good", query: "good" },
        { name: "bad", query: "bad" },
        { name: "also", query: "also" },
      ],
      fetcher
    );

    expect(out[0]).not.toBeNull();
    expect(out[1]).toBeNull();
    expect(out[2]).not.toBeNull();
  });
});
