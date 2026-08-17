import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const PLACE_DETAILS_ENDPOINT =
  "https://maps.googleapis.com/maps/api/place/details/json";
const PHOTO_ENDPOINT = "https://maps.googleapis.com/maps/api/place/photo";
const LOOKUP_TIMEOUT_MS = 5_000;

export const PHOTO_PROXY = {
  defaultWidth: 400,
  minWidth: 100,
  maxWidth: 1600,
  signatureTtlMs: 60_000,
  rateLimitWindowMs: 60_000,
  rateLimitPerWindow: 120,
} as const;

export function clampPhotoWidth(raw: string | null): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return PHOTO_PROXY.defaultWidth;
  return Math.min(PHOTO_PROXY.maxWidth, Math.max(PHOTO_PROXY.minWidth, n));
}

export function createPhotoRateLimiter(
  windowMs: number = PHOTO_PROXY.rateLimitWindowMs,
  max: number = PHOTO_PROXY.rateLimitPerWindow
): (clientId: string, now: number) => boolean {
  const hits = new Map<string, { count: number; windowStart: number }>();
  return (clientId: string, now: number) => {
    const row = hits.get(clientId);
    if (!row || now - row.windowStart >= windowMs) {
      hits.set(clientId, { count: 1, windowStart: now });
      return false;
    }
    row.count += 1;
    return row.count > max;
  };
}

export function signPhoto(
  photoReference: string,
  now = Date.now(),
  secret = process.env.MAPS_PHOTO_SECRET
): { ts: string; sig: string } | null {
  if (!secret || !photoReference) return null;
  const ts = now.toString();
  const sig = createHmac("sha256", secret)
    .update(`${photoReference}|${ts}`)
    .digest("hex");
  return { ts, sig };
}

export type LookupPhotoResult =
  | { ok: true; photoReference: string | null }
  | { ok: false; status: number; message: string };

export async function lookupPhotoReference(
  placeId: string,
  opts: { fetch?: typeof fetch; apiKey?: string } = {}
): Promise<LookupPhotoResult> {
  const key = opts.apiKey ?? process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) {
    return {
      ok: false,
      status: 500,
      message: "missing GOOGLE_MAPS_SERVER_KEY",
    };
  }

  const url = new URL(PLACE_DETAILS_ENDPOINT);
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "photos");
  url.searchParams.set("key", key);

  const fetcher = opts.fetch ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetcher(url.toString(), { signal: controller.signal });
  } catch (e) {
    const status = e instanceof Error && e.name === "AbortError" ? 504 : 502;
    return { ok: false, status, message: "place details failed" };
  } finally {
    clearTimeout(timer);
  }

  if (!upstream.ok) {
    return {
      ok: false,
      status: upstream.status,
      message: "place details failed",
    };
  }

  const data = (await upstream.json()) as {
    status: string;
    result?: { photos?: Array<{ photo_reference: string }> };
  };

  if (data.status !== "OK") {
    return { ok: true, photoReference: null };
  }

  return {
    ok: true,
    photoReference: data.result?.photos?.[0]?.photo_reference ?? null,
  };
}

export type ServePhotoResult =
  | { ok: true; bytes: ArrayBuffer; contentType: string }
  | { ok: false; status: number; message: string };

export async function serveSignedPhoto(input: {
  photoReference: string | null;
  ts: string | null;
  sig: string | null;
  maxwidth: string | null;
  clientId: string;
  now?: number;
  fetch?: typeof fetch;
  isRateLimited?: (clientId: string, now: number) => boolean;
}): Promise<ServePhotoResult> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  const secret = process.env.MAPS_PHOTO_SECRET;
  const photoReference = input.photoReference;
  if (!key || !secret || !photoReference) {
    return {
      ok: false,
      status: 400,
      message: "missing key or photo reference",
    };
  }

  const now = input.now ?? Date.now();
  if (
    !input.ts ||
    !input.sig ||
    !isTimestampFresh(input.ts, now) ||
    !hasValidSignature({
      photoReference,
      ts: input.ts,
      sig: input.sig,
      secret,
    })
  ) {
    return { ok: false, status: 401, message: "invalid signature" };
  }

  const isRateLimited = input.isRateLimited ?? defaultLimiter;
  if (isRateLimited(input.clientId, now)) {
    return { ok: false, status: 429, message: "too many requests" };
  }

  const width = clampPhotoWidth(input.maxwidth);
  const url = new URL(PHOTO_ENDPOINT);
  url.searchParams.set("photoreference", photoReference);
  url.searchParams.set("maxwidth", String(width));
  url.searchParams.set("key", key);

  const fetcher = input.fetch ?? fetch;
  const upstream = await fetcher(url.toString(), { redirect: "follow" });
  if (!upstream.ok) {
    return {
      ok: false,
      status: upstream.status,
      message: "photo lookup failed",
    };
  }

  const bytes = await upstream.arrayBuffer();
  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  return { ok: true, bytes, contentType };
}

const defaultLimiter = createPhotoRateLimiter();

function isTimestampFresh(tsRaw: string, now: number): boolean {
  const ts = Number.parseInt(tsRaw, 10);
  if (!Number.isFinite(ts)) return false;
  return Math.abs(now - ts) <= PHOTO_PROXY.signatureTtlMs;
}

function hasValidSignature({
  photoReference,
  ts,
  sig,
  secret,
}: {
  photoReference: string;
  ts: string;
  sig: string;
  secret: string;
}): boolean {
  const expected = createHmac("sha256", secret)
    .update(`${photoReference}|${ts}`)
    .digest("hex");
  if (!/^[a-f0-9]{64}$/i.test(sig)) return false;
  const actualBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (actualBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(actualBuf, expectedBuf);
}
