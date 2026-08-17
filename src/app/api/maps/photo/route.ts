import type { NextRequest } from "next/server";
import { serveSignedPhoto } from "@/features/maps/activity-photo";

export async function GET(req: NextRequest): Promise<Response> {
  const result = await serveSignedPhoto({
    photoReference: req.nextUrl.searchParams.get("photoReference"),
    ts: req.nextUrl.searchParams.get("ts"),
    sig: req.nextUrl.searchParams.get("sig"),
    maxwidth: req.nextUrl.searchParams.get("maxwidth"),
    clientId: clientKey(req),
  });

  if (!result.ok) {
    return new Response(result.message, { status: result.status });
  }

  return new Response(result.bytes, {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
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
