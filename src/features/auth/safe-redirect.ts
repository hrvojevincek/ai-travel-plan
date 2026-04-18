const FALLBACK = "/";

/**
 * Validates that a string is safe to pass to `router.push` / `location.assign`
 * as a same-origin redirect. Returns "/" for anything that could navigate
 * off-origin, execute JavaScript, or inject CR/LF control characters.
 *
 * Rules (applied to the fully-decoded form):
 * - Must start with exactly one "/".
 * - Must not start with "//" (protocol-relative → off-origin).
 * - Must not contain "\" (browsers normalize to "/", enabling bypass tricks).
 * - Must not contain control characters or CR/LF.
 * - Must not be a URL with a scheme (http:, javascript:, data:, etc.).
 *
 * Designed for login/signup/logout post-navigation where the target comes
 * from a query param, referer, or caller option that is ultimately
 * attacker-controllable.
 */
export function safeInternalRedirect(path: string | undefined | null): string {
  if (!path) return FALLBACK;

  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return FALLBACK;
  }

  if (!decoded.startsWith("/")) return FALLBACK;
  if (decoded.startsWith("//")) return FALLBACK;
  if (decoded.includes("\\")) return FALLBACK;
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(decoded)) return FALLBACK;

  return path;
}
