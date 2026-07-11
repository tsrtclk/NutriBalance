/**
 * What lives inside the access JWT and is attached to req.user by JwtAuthGuard.
 */
export interface UserPayload {
  /** sub claim — the user's UUID */
  sub: string;
  /** E.164 phone number */
  phone: string;
  /** Verification level 0-4 — see VerificationLevel enum */
  authLevel: number;
  /** RBAC roles within the user's primary cooperative (if any) */
  roles: string[];
  /** Cooperative IDs the user is an active member of */
  cooperativeIds: string[];
  /** Device fingerprint hash that issued this token */
  deviceId: string;
  /** Locale for response i18n */
  locale: string;
  /** JWT standard claims */
  iat?: number;
  exp?: number;
}

export interface RefreshPayload {
  sub: string;
  deviceId: string;
  /** Hashed refresh token for blacklisting */
  jti: string;
  iat?: number;
  exp?: number;
}
