/**
 * Domain events. Services publish to the `platform.events` topic exchange with
 * the event name as the routing key; consumers bind with topic patterns
 * (e.g. `user.#`, or `#` for everything).
 *
 * Add your product's events here — one routing key per notable write.
 */
export const PLATFORM_EXCHANGE = "platform.events";

export const PLATFORM_EVENTS = [
  // auth-service (É2)
  "user.registered",
  // profile-service (É1 / É7)
  "profile.updated",
  "weight.logged",
  // nutrition-service (É3)
  "food.created",
  "journal.entry_logged",
] as const;

export type PlatformEventName = (typeof PLATFORM_EVENTS)[number];

/** Wire envelope every event is wrapped in. */
export interface PlatformEvent<T = Record<string, unknown>> {
  /** Routing key / event name, e.g. `user.registered`. */
  event: PlatformEventName;
  /** ISO-8601 timestamp the event occurred. */
  occurred_at: string;
  /** Emitting service (best-effort label). */
  source: string;
  /** Event-specific payload. */
  data: T;
}
