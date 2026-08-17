import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGeneratedTrip } from "@/features/trips/api/generate";
import { mockTrip } from "@/features/trips/mock";

describe("fetchGeneratedTrip", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("forwards AbortSignal to fetch", async () => {
    const ac = new AbortController();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTrip,
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
        if (init?.signal?.aborted) {
          throw abortLike();
        }
        return { ok: true, json: async () => mockTrip };
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
