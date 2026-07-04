/**
 * Resolve a usable photo_reference. Prefer placeId → Place Details: stored
 * photo_reference values in the generation cache go stale and Google returns 400.
 */
export async function fetchPhotoRef(placeId: string): Promise<string | null> {
  const params = new URLSearchParams({ placeId });
  const res = await fetch(`/api/maps/photo-ref?${params.toString()}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { photoReference?: string | null };
  return data.photoReference ?? null;
}

export async function signPhotoUrl(
  photoReference: string
): Promise<string | null> {
  const params = new URLSearchParams({ photoReference });
  const signRes = await fetch(`/api/maps/photo-sign?${params.toString()}`, {
    cache: "no-store",
  });
  if (!signRes.ok) return null;
  const { ts, sig } = (await signRes.json()) as { ts?: string; sig?: string };
  if (!ts || !sig) return null;
  const urlParams = new URLSearchParams({
    photoReference,
    ts,
    sig,
    maxwidth: "400",
  });
  return `/api/maps/photo?${urlParams.toString()}`;
}

export async function resolveActivityPhotoUrl(
  placeId: string | null | undefined,
  photoReference: string | null | undefined
): Promise<string | null> {
  let ref: string | null = null;
  if (placeId) {
    ref = await fetchPhotoRef(placeId);
  }
  if (!ref) {
    ref = photoReference ?? null;
  }
  if (!ref) return null;
  return signPhotoUrl(ref);
}
