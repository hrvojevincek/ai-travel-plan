import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGeneratedTrip } from "@/features/trips/api/generate";
import { mockTrip } from "@/features/trips/mock";

const groundedBody = {
  ...mockTrip,
  days: mockTrip.days.map((d) => ({
    ...d,
    activities: d.activities.map((a) => ({
      ...a,
      latitude: null,
      longitude: null,
      placeId: null,
      photoReference: null,
    })),
  })),
};

describe("fetchGeneratedTrip", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("forwards AbortSignal to fetch", async () => {
    const ac = new AbortController();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => groundedBody,
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchGeneratedTrip({ destination: "Lisbon", duration: 3 }, ac.signal);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/trips/generate",
      expect.objectContaining({
        method: "POST",
        signal: ac.signal,
      })
    );
  });

  it("propagates an aborted fetch", async () => {
    const ac = new AbortController();
    ac.abort();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.signal?.aborted) throw abortLike();
        return { ok: true, json: async () => groundedBody };
      })
    );

    await expect(
      fetchGeneratedTrip({ destination: "Lisbon", duration: 3 }, ac.signal)
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

function abortLike(): Error {
  const err = new Error("Aborted");
  err.name = "AbortError";
  return err;
}
