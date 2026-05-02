import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest): Promise<Response> {
  const secret = process.env.MAPS_PHOTO_SECRET;
  const photoReference = req.nextUrl.searchParams.get("photoReference");

  if (!secret) {
    return new Response("missing MAPS_PHOTO_SECRET", { status: 500 });
  }
  if (!photoReference) {
    return new Response("missing photo reference", { status: 400 });
  }

  const ts = Date.now().toString();
  const payload = `${photoReference}|${ts}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");

  return Response.json(
    { ts, sig },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
