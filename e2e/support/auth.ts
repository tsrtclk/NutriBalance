import axios from "axios";

/**
 * Log a test user in and return a JWT for the e2e suite.
 *
 * ⚠️ Product-specific: implement this against YOUR auth service. The skeleton
 * has no token issuer (services are verify-only). Typical implementation:
 * request an OTP / password login through the gateway, then return the access
 * token. See the upstream reference (Köydaş) for a dev-OTP-log-scraping example.
 */
export async function loginViaOtp(
  baseUrl: string,
  identifier: string,
  deviceId: string,
): Promise<{ token: string; userId: string }> {
  void baseUrl;
  void identifier;
  void deviceId;
  void axios;
  throw new Error(
    "loginViaOtp is a stub — implement it for your auth service (e2e/support/auth.ts).",
  );
}

/** A unique identifier per scenario so test users are isolated. */
export function uniquePhone(): string {
  const n = (
    (Date.now() % 100_000) * 10_000 +
    Math.floor(Math.random() * 10_000)
  )
    .toString()
    .padStart(9, "0")
    .slice(-9);
  return `+1${n}`;
}
