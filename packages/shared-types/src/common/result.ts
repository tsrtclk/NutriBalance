/**
 * Result type for service-layer operations.
 *
 * Prefer this over throwing in service methods — controllers/exception filters
 * can map known error codes to HTTP responses cleanly.
 */
export type Result<T, E = string> =
  { ok: true; value: T } | { ok: false; error: E; details?: unknown };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E, details?: unknown): Result<never, E> => ({
  ok: false,
  error,
  details,
});
