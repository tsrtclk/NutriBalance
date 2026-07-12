/**
 * Port for the mobile push channel (swappable-providers convention).
 * backlog: D6 — no push vendor chosen yet (FCM/APNs need credentials +
 * device-token registration, tracked as B17). The inbox row is the source
 * of truth; push is a best-effort side channel and must never fail a
 * dispatch.
 */
export interface PushProvider {
  send(userId: string, title: string, body: string): Promise<void>;
}

export const PUSH_PROVIDER = "PUSH_PROVIDER";
