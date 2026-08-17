import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clampPhotoWidth,
  createPhotoRateLimiter,
  lookupPhotoReference,
  serveSignedPhoto,
  signPhoto,
} from "@/features/maps/activity-photo";

const originalEnv = { ...process.env };
const NOW = 1_700_000_000_000;

function jsonFetch(body: unknown): typeof fetch {
  return vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
  ) as unknown as typeof fetch;
}

function bytesFetch(body: string, contentType = "image/jpeg"): typeof fetch {
  return vi.fn(
    async () =>
      new Response(body, {
        status: 200,
        headers: { "Content-Type": contentType },
      })
  ) as unknown as typeof fetch;
}

function signedAt(now: number) {
  const signed = signPhoto("CmR_abc", now);
  expect(signed).not.toBeNull();
  if (!signed) throw new Error("expected a photo signature");
  return signed;
}

describe("activity photo", () => {
  beforeEach(() => {
    process.env.MAPS_PHOTO_SECRET = "test-photo-secret";
    process.env.GOOGLE_MAPS_SERVER_KEY = "test-maps-key";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("proxies Google photo bytes when the signature is valid", async () => {
    const signed = signedAt(NOW);
    const result = await serveSignedPhoto({
      photoReference: "CmR_abc",
      ts: signed.ts,
      sig: signed.sig,
      maxwidth: "400",
      clientId: "1.1.1.1",
      now: NOW,
      isRateLimited: () => false,
      fetch: bytesFetch("jpeg-bytes"),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.contentType).toBe("image/jpeg");
    expect(Buffer.from(result.bytes).toString()).toBe("jpeg-bytes");
  });

  it("rejects expired or tampered signatures", async () => {
    const signed = signedAt(NOW);
    const expired = await serveSignedPhoto({
      photoReference: "CmR_abc",
      ts: signed.ts,
      sig: signed.sig,
      maxwidth: "400",
      clientId: "1.1.1.1",
      now: NOW + 60_001,
      isRateLimited: () => false,
      fetch: bytesFetch("img"),
    });
    const tampered = await serveSignedPhoto({
      photoReference: "CmR_abc",
      ts: signed.ts,
      sig: "a".repeat(64),
      maxwidth: "400",
      clientId: "1.1.1.1",
      now: NOW,
      isRateLimited: () => false,
      fetch: bytesFetch("img"),
    });
    expect(expired).toEqual({
      ok: false,
      status: 401,
      message: "invalid signature",
    });
    expect(tampered).toEqual(expired);
  });

  it("clamps photo width to 100–1600, default 400", () => {
    expect(clampPhotoWidth(null)).toBe(400);
    expect(clampPhotoWidth("50")).toBe(100);
    expect(clampPhotoWidth("800")).toBe(800);
    expect(clampPhotoWidth("9999")).toBe(1600);
    expect(clampPhotoWidth("nope")).toBe(400);
  });

  it("returns the first Place Details photo reference, or null on a miss", async () => {
    await expect(
      lookupPhotoReference("ChIJplace", {
        fetch: jsonFetch({
          status: "OK",
          result: { photos: [{ photo_reference: "CmR_fresh" }] },
        }),
      })
    ).resolves.toEqual({ ok: true, photoReference: "CmR_fresh" });

    await expect(
      lookupPhotoReference("ChIJmissing", {
        fetch: jsonFetch({ status: "ZERO_RESULTS" }),
      })
    ).resolves.toEqual({ ok: true, photoReference: null });
  });

  it("rate-limits by client id", async () => {
    const signed = signedAt(NOW);
    const isRateLimited = createPhotoRateLimiter(60_000, 1);
    const input = {
      photoReference: "CmR_abc",
      ts: signed.ts,
      sig: signed.sig,
      maxwidth: "400",
      clientId: "9.9.9.9",
      now: NOW,
      isRateLimited,
      fetch: bytesFetch("ok"),
    };

    expect(await serveSignedPhoto(input)).toMatchObject({ ok: true });
    expect(await serveSignedPhoto(input)).toEqual({
      ok: false,
      status: 429,
      message: "too many requests",
    });
  });
});
