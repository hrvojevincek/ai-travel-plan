"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { getSession } from "@/features/auth";
import { createTrip, deleteTripForUser } from "./data";
import { GeneratedTrip, toCreateTripInput } from "./generate";
import { getDestinationImage } from "./image";

export type SaveTripResult =
  | { ok: true; id: string }
  | { ok: false; code: "UNAUTH" | "INVALID" | "FAILED"; message?: string };

export async function saveTrip(raw: unknown): Promise<SaveTripResult> {
  const session = await getSession();
  if (!session) return { ok: false, code: "UNAUTH" };

  const parsed = GeneratedTrip.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, code: "INVALID", message: parsed.error.message };
  }

  const image = await getDestinationImage(parsed.data.destination);
  const input = toCreateTripInput(parsed.data);
  if (image) {
    input.imageUrl = image.url;
    input.imageAttribution = image.attribution;
  }

  try {
    const { id } = await createTrip(db, input, session.user.id);
    revalidatePath("/dashboard");
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      code: "FAILED",
      message: e instanceof Error ? e.message : "Unknown error",
    };
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
    return {
      ok: false,
      code: "FAILED",
      message: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
