import { NextRequest } from "next/server";

const PLACE_DETAILS_ENDPOINT =
  "https://maps.googleapis.com/maps/api/place/details/json";
const TIMEOUT_MS = 5_000;

export async function GET(req: NextRequest): Promise<Response> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  const placeId = req.nextUrl.searchParams.get("placeId");

  if (!key) {
    return new Response("missing GOOGLE_MAPS_SERVER_KEY", { status: 500 });
  }
  if (!placeId) {
    return new Response("missing placeId", { status: 400 });
  }

  const url = new URL(PLACE_DETAILS_ENDPOINT);
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "photos");
  url.searchParams.set("key", key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(url.toString(), { signal: controller.signal });
  } catch (e) {
    const status = e instanceof Error && e.name === "AbortError" ? 504 : 502;
    return new Response("place details failed", { status });
  } finally {
    clearTimeout(timer);
  }

  if (!upstream.ok) {
    return new Response("place details failed", { status: upstream.status });
  }

  const data = (await upstream.json()) as {
    status: string;
    result?: { photos?: Array<{ photo_reference: string }> };
  };

  if (data.status !== "OK") {
    return Response.json({ photoReference: null }, { status: 200 });
  }

  const photoReference = data.result?.photos?.[0]?.photo_reference ?? null;
  return Response.json(
    { photoReference },
    { headers: { "Cache-Control": "private, max-age=3600" } }
  );
}
