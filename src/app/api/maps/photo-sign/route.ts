import type { NextRequest } from "next/server";
import { signPhoto } from "@/features/maps/activity-photo";

export async function GET(req: NextRequest): Promise<Response> {
  if (!process.env.MAPS_PHOTO_SECRET) {
    return new Response("missing MAPS_PHOTO_SECRET", { status: 500 });
  }

  const photoReference = req.nextUrl.searchParams.get("photoReference");
  if (!photoReference) {
    return new Response("missing photo reference", { status: 400 });
  }

  const signed = signPhoto(photoReference);
  if (!signed) {
    return new Response("missing MAPS_PHOTO_SECRET", { status: 500 });
  }

  return Response.json(signed, {
    headers: { "Cache-Control": "no-store" },
  });
}
