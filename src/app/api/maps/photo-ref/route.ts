import type { NextRequest } from "next/server";
import { lookupPhotoReference } from "@/features/maps/activity-photo";

export async function GET(req: NextRequest): Promise<Response> {
  const placeId = req.nextUrl.searchParams.get("placeId");
  if (!placeId) {
    return new Response("missing placeId", { status: 400 });
  }

  const result = await lookupPhotoReference(placeId);
  if (!result.ok) {
    return new Response(result.message, { status: result.status });
  }

  return Response.json(
    { photoReference: result.photoReference },
    { headers: { "Cache-Control": "private, max-age=3600" } }
  );
}
