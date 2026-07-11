import axios from "axios";

/**
 * Mint a fresh, isolated test user: register through the live auth-service
 * (É2 — email+password) and return its access token. Each scenario calls this
 * with a unique email, so scenarios are independent and parallel-safe.
 */
export async function registerAndLogin(
  baseUrl: string,
  email: string,
  deviceId: string,
): Promise<{ token: string; userId: string }> {
  const res = await axios.post(
    `${baseUrl}/auth/register`,
    {
      email,
      password: "E2e-test-pass-1",
      full_name: "E2E User",
      device_id: deviceId,
    },
    { validateStatus: () => true },
  );
  if (res.status !== 201) {
    throw new Error(
      `register failed (${res.status}): ${JSON.stringify(res.data)}`,
    );
  }
  const data = res.data?.data ?? res.data;
  return { token: data.tokens.access_token, userId: data.user.id };
}

/** A unique identifier per scenario so test users are isolated. */
export function uniqueEmail(): string {
  const n = `${Date.now().toString(36)}${Math.floor(Math.random() * 1_000_000).toString(36)}`;
  return `e2e-${n}@nutribalance.test`;
}
