"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { getSession } from "@/features/auth";
import { logAndFail } from "@/lib/action-error";
import { lookupActivityPlaces } from "./activity-places";
import { createTrip, deleteTripForUser, getTrip, updateActivity } from "./data";
import { GeneratedTripResponse, toCreateTripInput } from "./generate-schema";
import { getDestinationImage } from "./image";
import type { ActivityTypeValue } from "./schemas";
import { swapActivity } from "./swap";

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

  // Look up only activities that were never attempted (e.g. mock trips that
  // skipped the generate endpoint). Activities that arrived from the cached
  // /api/trips/generate response already carry explicit `null` for failed
  // lookups — retrying those here would burn Places quota on addresses we
  // already know are bad. `undefined` means "never attempted"; `null` means
  // "attempted and failed"; a string/number means "resolved".
  const missing: {
    dayIdx: number;
    actIdx: number;
    name: string;
    address: string;
  }[] = [];
  parsed.data.days.forEach((d, dayIdx) => {
    d.activities.forEach((a, actIdx) => {
      if (a.latitude === undefined || a.longitude === undefined) {
        missing.push({
          dayIdx,
          actIdx,
          name: a.name,
          address: a.address,
        });
      }
    });
  });
  if (missing.length > 0) {
    const places = await lookupActivityPlaces(
      missing.map((m) => ({ name: m.name, address: m.address })),
      parsed.data.destination
    );
    missing.forEach((m, i) => {
      const p = places[i];
      if (p) {
        const a = input.days[m.dayIdx].activities[m.actIdx];
        a.latitude = p.latitude;
        a.longitude = p.longitude;
        a.placeId = p.placeId;
        a.photoReference = p.photoReference;
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

export interface SwappedActivity {
  id: string;
  name: string;
  description: string | null;
  type: ActivityTypeValue;
  durationMinutes: number | null;
  address: string | null;
  estimatedCost: number | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  photoReference: string | null;
}

export type SwapActivityResult =
  | { ok: true; activity: SwappedActivity }
  | {
      ok: false;
      code: "UNAUTH" | "NOT_FOUND" | "FAILED";
      message?: string;
    };

export async function swapActivityAction(
  tripId: string,
  activityId: string
): Promise<SwapActivityResult> {
  const session = await getSession();
  if (!session) return { ok: false, code: "UNAUTH" };
  if (!tripId || !activityId) return { ok: false, code: "NOT_FOUND" };

  const trip = await getTrip(db, tripId);
  if (!trip || trip.userId !== session.user.id) {
    return { ok: false, code: "NOT_FOUND" };
  }
  const exists = trip.days.some((d) =>
    d.activities.some((a) => a.id === activityId)
  );
  if (!exists) return { ok: false, code: "NOT_FOUND" };

  try {
    const suggestion = await swapActivity(db, tripId, activityId);

    await updateActivity(db, activityId, {
      name: suggestion.name,
      description: suggestion.description,
      durationMinutes: suggestion.durationMinutes,
      address: suggestion.address,
      estimatedCost: suggestion.estimatedCost,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      placeId: suggestion.placeId,
      photoReference: suggestion.photoReference,
    });

    revalidatePath(`/trip/${tripId}`);

    return {
      ok: true,
      activity: {
        id: activityId,
        name: suggestion.name,
        description: suggestion.description,
        type: suggestion.type,
        durationMinutes: suggestion.durationMinutes,
        address: suggestion.address,
        estimatedCost: suggestion.estimatedCost,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        placeId: suggestion.placeId,
        photoReference: suggestion.photoReference,
      },
    };
  } catch (e) {
    return logAndFail("swapActivityAction", e);
  }
}
