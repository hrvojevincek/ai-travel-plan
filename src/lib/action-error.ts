import "server-only";

/**
 * Logs a thrown error with context and returns a client-safe failure shape.
 * Keeps raw `e.message` / stack on the server; the client only sees the code.
 *
 * Usage:
 *   } catch (e) {
 *     return logAndFail("saveTrip", e);
 *   }
 */
export function logAndFail<Code extends string = "FAILED">(
  context: string,
  e: unknown,
  code: Code = "FAILED" as Code
): { ok: false; code: Code } {
  console.error(
    `[${context}] failed:`,
    e instanceof Error ? { message: e.message, stack: e.stack } : e
  );
  return { ok: false, code };
}
