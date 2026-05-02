import { NextRequest } from "next/server";

const PHOTO_ENDPOINT = "https://maps.googleapis.com/maps/api/place/photo";
const DEFAULT_WIDTH = 400;
const MIN_WIDTH = 100;
const MAX_WIDTH = 1600;

function clampWidth(raw: string | null): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return DEFAULT_WIDTH;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, n));
}

export async function GET(req: NextRequest): Promise<Response> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  const photoReference = req.nextUrl.searchParams.get("photoReference");
  if (!key || !photoReference) {
    return new Response("missing key or photo reference", { status: 400 });
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
