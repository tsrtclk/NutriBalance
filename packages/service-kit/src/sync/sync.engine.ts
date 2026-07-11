import { Logger } from "@nestjs/common";

import {
  SyncConflictError,
  type SyncContext,
  type SyncHandler,
  type SyncOp,
  type SyncOpResult,
  type SyncStatus,
} from "./sync.types";

/** Statuses a prior attempt can be in that mean "already decided". */
const TERMINAL: ReadonlySet<SyncStatus> = new Set<SyncStatus>([
  "synced",
  "conflict",
  "failed",
]);

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The Prisma delegates the engine touches. Typed structurally so it stays
 * framework-light and easy to unit-test with a fake — the shared `PrismaService`
 * satisfies it via the generated `offline_queue` / `entity_versions` models.
 */
export interface SyncPrisma {
  offlineQueue: {
    findUnique(args: unknown): Promise<Record<string, unknown> | null>;
    upsert(args: unknown): Promise<unknown>;
    update(args: unknown): Promise<unknown>;
  };
  entityVersion: {
    upsert(args: unknown): Promise<{ version: bigint | number }>;
  };
}

/**
 * Generic offline-sync replay engine. For each op:
 *   1. **Idempotency** — a terminal prior attempt (by `client_op_id`) returns
 *      its recorded outcome (`synced` → reported as `duplicate`).
 *   2. **Record intent** — upsert a row in `offline_queue`.
 *   3. **Dispatch** — run the handler for `operation_type`.
 *   4. **Version** — bump `entity_versions` on success.
 *   5. **Settle** — persist the terminal status and return a per-op result.
 *
 * Handlers translate domain errors: throw {@link SyncConflictError} for a
 * lost-race conflict, anything else for a permanent failure. The engine itself
 * stays domain-agnostic — a product registers one handler per operation_type.
 */
export class SyncEngine {
  private readonly logger = new Logger(SyncEngine.name);

  constructor(
    private readonly prisma: SyncPrisma,
    private readonly handlers: Record<string, SyncHandler>,
  ) {}

  async apply(ops: SyncOp[], ctx: SyncContext): Promise<SyncOpResult[]> {
    const results: SyncOpResult[] = [];
    // Sequential on purpose: ops from one device can depend on each other
    // (create then update), and the batch is small.
    for (const op of ops) {
      results.push(await this.applyOne(op, ctx));
    }
    return results;
  }

  private async applyOne(op: SyncOp, ctx: SyncContext): Promise<SyncOpResult> {
    const prior = (await this.prisma.offlineQueue.findUnique({
      where: { client_op_id: op.client_op_id },
    })) as {
      status?: string;
      entity_id?: string | null;
      error_message?: string | null;
    } | null;

    if (prior && TERMINAL.has(prior.status as SyncStatus)) {
      // Already decided — replay is a no-op. A prior success reads as duplicate.
      const status: SyncStatus =
        prior.status === "synced" ? "duplicate" : (prior.status as SyncStatus);
      return {
        client_op_id: op.client_op_id,
        status,
        entity_id: prior.entity_id ?? undefined,
        error: prior.error_message ?? undefined,
      };
    }

    await this.prisma.offlineQueue.upsert({
      where: { client_op_id: op.client_op_id },
      update: { status: "processing", retry_count: { increment: 1 } },
      create: {
        user_id: ctx.userId,
        device_id: ctx.deviceId,
        client_op_id: op.client_op_id,
        operation_type: op.operation_type,
        entity_type: op.entity_type,
        entity_id: op.entity_id ?? null,
        payload: op.payload,
        conflict_resolution: op.conflict_resolution ?? "server_wins",
        expected_version: op.expected_version ?? null,
        client_timestamp: new Date(op.client_timestamp),
        expires_at: op.expires_at
          ? new Date(op.expires_at)
          : new Date(Date.now() + DEFAULT_TTL_MS),
        status: "processing",
      },
    });

    const handler = this.handlers[op.operation_type];
    if (!handler) {
      return this.settle(
        op,
        "failed",
        undefined,
        `unknown operation_type: ${op.operation_type}`,
      );
    }

    try {
      const { entityId } = await handler(op.payload, ctx);
      const version = await this.bumpVersion(op.entity_type, entityId);
      return this.settle(op, "synced", entityId, undefined, version);
    } catch (err) {
      if (err instanceof SyncConflictError) {
        return this.settle(op, "conflict", undefined, err.message);
      }
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `sync op ${op.client_op_id} (${op.operation_type}) failed: ${message}`,
      );
      return this.settle(op, "failed", undefined, message);
    }
  }

  private async settle(
    op: SyncOp,
    status: SyncStatus,
    entityId?: string,
    error?: string,
    version?: number,
  ): Promise<SyncOpResult> {
    await this.prisma.offlineQueue.update({
      where: { client_op_id: op.client_op_id },
      data: {
        status,
        entity_id: entityId ?? null,
        error_message: error ?? null,
        processed_at: new Date(),
      },
    });
    return {
      client_op_id: op.client_op_id,
      status,
      entity_id: entityId,
      error,
      version,
    };
  }

  private async bumpVersion(
    entityType: string,
    entityId: string,
  ): Promise<number> {
    const row = await this.prisma.entityVersion.upsert({
      where: {
        entity_type_entity_id: { entity_type: entityType, entity_id: entityId },
      },
      update: { version: { increment: 1 }, updated_at: new Date() },
      create: { entity_type: entityType, entity_id: entityId, version: 1 },
    });
    return Number(row.version);
  }
}
