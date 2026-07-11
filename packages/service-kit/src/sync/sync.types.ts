/**
 * Offline sync replay — the server side of the offline-first sync queue.
 * A client that made writes while offline replays them here when connectivity
 * returns. The contract is **idempotent** (dedupe on `client_op_id`) and
 * **conflict-aware** (a write that lost a race is reported, not silently
 * overwritten). Products record their replay business rules (per-entity
 * conflict policy, TTL/retry/priority) as a decision record — see the
 * `offline-first-mobile` skill.
 */

export type SyncStatus = "synced" | "duplicate" | "conflict" | "failed";

/** One offline operation as replayed by the client. Mirrors `offline_queue`. */
export interface SyncOp {
  /** Client-generated UUID — the idempotency key the server dedupes on. */
  client_op_id: string;
  /** Routes to a handler, e.g. `place.create`. */
  operation_type: string;
  /** Entity kind for versioning/routing, e.g. `place`. */
  entity_type: string;
  /** Target id for updates (null for creates). */
  entity_id?: string | null;
  payload: Record<string, unknown>;
  /** Version the client last saw (optimistic concurrency; null for creates). */
  expected_version?: number | null;
  /** Per-op strategy; defaults to `server_wins`. */
  conflict_resolution?: string;
  /** When the client performed the op (ISO-8601). */
  client_timestamp: string;
  /** Op TTL (ISO-8601); defaults to 7 days server-side. */
  expires_at?: string;
}

/** Per-op outcome returned to the client so it can settle its local queue. */
export interface SyncOpResult {
  client_op_id: string;
  status: SyncStatus;
  /** Server id of the created/updated entity (on synced/duplicate). */
  entity_id?: string;
  /** New entity version after the write (on synced). */
  version?: number;
  /** Human-readable reason (on conflict/failed). */
  error?: string;
}

export interface SyncContext {
  userId: string;
  deviceId: string;
}

/**
 * Applies one op and returns the affected entity id. Throw {@link SyncConflictError}
 * for a lost-race / stale-version conflict (server-wins — the client should
 * refetch); any other throw is a **permanent** failure (won't succeed on retry,
 * e.g. a validation error), so the client should drop the op and surface it.
 */
export type SyncHandler = (
  payload: Record<string, unknown>,
  ctx: SyncContext,
) => Promise<{ entityId: string }>;

/** Signals a conflict (vs a permanent failure) to the engine. */
export class SyncConflictError extends Error {
  constructor(message = "sync conflict") {
    super(message);
    this.name = "SyncConflictError";
  }
}
