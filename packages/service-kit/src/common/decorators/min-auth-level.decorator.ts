import { SetMetadata } from "@nestjs/common";

export const MIN_AUTH_LEVEL_KEY = "platform:min_auth_level";

/**
 * Require at least the given verification level (0-4).
 * Default if not specified: 1 (phone verified). Public endpoints declare 0.
 *
 *   0 GUEST           — browse only
 *   1 PHONE_VERIFIED  — basic tx (<€100/day)
 *   2 COOP_VERIFIED   — rentals, jobs, payments <€500
 *   3 ID_VERIFIED     — full wallet <€1000/day
 *   4 BUSINESS        — admin, marketplace seller
 */
export const MinAuthLevel = (level: number) =>
  SetMetadata(MIN_AUTH_LEVEL_KEY, level);
