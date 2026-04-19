"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { getSession } from "@/features/auth";
import { logAndFail } from "@/lib/action-error";
import { createTrip, deleteTripForUser } from "./data";
import { GeneratedTripResponse, toCreateTripInput } from "./generate";
import { geocodeMany } from "./geocode";
import { getDestinationImage } from "./image";

export type SaveTripResult =
  | { ok: true; id: string }
  | { ok: false; code: "UNAUTH" | "INVALID" | "FAILED"; message?: string };

const DestinationPick = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  placeId: z.string().min(1),
});
export type DestinationPickT = z.infer<typeof DestinationPick>;

export interface SaveTripOpts {
  /** Coords + place_id from Google Places Autocomplete on the search form. */
  destination?: DestinationPickT;
}

export async function saveTrip(
  raw: unknown,
  opts: SaveTripOpts = {}
): Promise<SaveTripResult> {
  const session = await getSession();
  if (!session) return { ok: false, code: "UNAUTH" };

  const parsed = GeneratedTripResponse.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, code: "INVALID", message: parsed.error.message };
  }

  const destinationPick = opts.destination
    ? DestinationPick.safeParse(opts.destination)
    : null;

  const input = toCreateTripInput(parsed.data);

  if (destinationPick?.success) {
    input.destinationLat = destinationPick.data.lat;
    input.destinationLng = destinationPick.data.lng;
    input.destinationPlaceId = destinationPick.data.placeId;
  }

  // Geocode only activities that arrived without coords (e.g. cache miss + old
  // client, or mock trips). When the generate endpoint pre-geocoded, we skip
  // this entirely — one Google Geocoding charge per unique generation.
  const missing: { dayIdx: number; actIdx: number; query: string }[] = [];
  input.days.forEach((d, dayIdx) => {
    d.activities.forEach((a, actIdx) => {
      if (a.latitude == null || a.longitude == null) {
        missing.push({
          dayIdx,
          actIdx,
          query: `${a.name}, ${parsed.data.destination}`,
        });
      }
    });
  });
  if (missing.length > 0) {
    const coords = await geocodeMany(
      missing.map((m) => ({ name: m.query, query: m.query }))
    );
    missing.forEach((m, i) => {
      const c = coords[i];
      if (c) {
        input.days[m.dayIdx].activities[m.actIdx].latitude = c.latitude;
        input.days[m.dayIdx].activities[m.actIdx].longitude = c.longitude;
      }
    });
  }

  const image = await getDestinationImage(parsed.data.destination);
  if (image) {
    input.imageUrl = image.url;
    input.imageAttribution = image.attribution;
  }

  try {
    const { id } = await createTrip(db, input, session.user.id);
    revalidatePath("/dashboard");
    return { ok: true, id };
  } catch (e) {
    return logAndFail("saveTrip", e);
  }
}

export type DeleteTripResult =
  | { ok: true }
  | { ok: false; code: "UNAUTH" | "NOT_FOUND" | "FAILED"; message?: string };

export async function deleteTripAction(id: string): Promise<DeleteTripResult> {
  const session = await getSession();
  if (!session) return { ok: false, code: "UNAUTH" };

  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, code: "NOT_FOUND" };
  }

  try {
    const deleted = await deleteTripForUser(db, id, session.user.id);
    if (!deleted) return { ok: false, code: "NOT_FOUND" };
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return logAndFail("deleteTripAction", e);
  }
}
