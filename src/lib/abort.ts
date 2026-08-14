/** True for fetch/DOM aborts and TanStack Query cancelled queries. */
export function isAbortError(error: unknown): boolean {
  if (typeof error !== "object" || error == null) return false;
  if (!("name" in error)) return false;
  return error.name === "AbortError" || error.name === "CancelledError";
}

export function abortError(signal?: AbortSignal): Error {
  if (signal?.reason instanceof Error) return signal.reason;
  const err = new Error("Aborted");
  err.name = "AbortError";
  return err;
}
