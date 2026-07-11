/**
 * What lives inside the access JWT and is attached to req.user by JwtAuthGuard.
 * Minted by the product's auth service; verified everywhere else.
 */
export interface UserPayload {
  /** sub claim — the user's UUID */
  sub: string;
  /** Primary login identifier (NutriBalance: email) */
  email: string;
  /** Verification level 0-4 — see VerificationLevel enum */
  authLevel: number;
  /** RBAC roles (empty for regular users) */
  roles: string[];
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
  /** Refresh token id — rotated on every refresh, revocable via Redis */
  jti: string;
  iat?: number;
  exp?: number;
}
