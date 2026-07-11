/**
 * Verification / auth level — gates what a user can do. Tune the names + tiers
 * for your product; the kit's auth-level guard reads `authLevel` from the JWT.
 */
export const VERIFICATION_LEVELS = [0, 1, 2, 3, 4] as const;
export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];

export enum VerificationLevelName {
  GUEST = 0,
  PHONE_VERIFIED = 1,
  EMAIL_VERIFIED = 2,
  ID_VERIFIED = 3,
  BUSINESS = 4,
}
