import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

const PHOTO_ENDPOINT = "https://maps.googleapis.com/maps/api/place/photo";
const DEFAULT_WIDTH = 400;
const MIN_WIDTH = 100;
const MAX_WIDTH = 1600;
const SIGNATURE_TTL_MS = 60_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_PER_WINDOW = 120;

const hitsByKey = new Map<string, { count: number; windowStart: number }>();

function clampWidth(raw: string | null): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return DEFAULT_WIDTH;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n));
}

function clientKey(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

function isRateLimited(key: string, now: number): boolean {
  const row = hitsByKey.get(key);
  if (!row || now - row.windowStart >= RATE_LIMIT_WINDOW_MS) {
    hitsByKey.set(key, { count: 1, windowStart: now });
    return false;
  }
  row.count += 1;
  return row.count > RATE_LIMIT_PER_WINDOW;
}

function isTimestampFresh(tsRaw: string | null, now: number): boolean {
  if (!tsRaw) return false;
  const ts = Number.parseInt(tsRaw, 10);
  if (!Number.isFinite(ts)) return false;
  return Math.abs(now - ts) <= SIGNATURE_TTL_MS;
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
  const payload = `${photoReference}|${ts}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  if (!/^[a-f0-9]{64}$/i.test(sig)) return false;
  const actualBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (actualBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(actualBuf, expectedBuf);
}

export async function GET(req: NextRequest): Promise<Response> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  const secret = process.env.MAPS_PHOTO_SECRET;
  const photoReference = req.nextUrl.searchParams.get("photoReference");
  if (!key || !secret || !photoReference) {
    return new Response("missing key or photo reference", { status: 400 });
  }

  const tsRaw = req.nextUrl.searchParams.get("ts");
  const sig = req.nextUrl.searchParams.get("sig");
  const now = Date.now();
  if (!isTimestampFresh(tsRaw, now) || !sig || !tsRaw) {
    return new Response("invalid signature", { status: 401 });
  }
  if (!hasValidSignature({ photoReference, ts: tsRaw, sig, secret })) {
    return new Response("invalid signature", { status: 401 });
  }
  if (isRateLimited(clientKey(req), now)) {
    return new Response("too many requests", { status: 429 });
  }

  const width = clampWidth(req.nextUrl.searchParams.get("maxwidth"));
  const url = new URL(PHOTO_ENDPOINT);
  url.searchParams.set("photoreference", photoReference);
  url.searchParams.set("maxwidth", String(width));
  url.searchParams.set("key", key);

  const upstream = await fetch(url.toString(), { redirect: "follow" });
  if (!upstream.ok) {
    return new Response("photo lookup failed", { status: upstream.status });
  }

  const bytes = await upstream.arrayBuffer();
  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
