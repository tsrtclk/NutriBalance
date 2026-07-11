import {
  SyncConflictError,
  SyncEngine,
  type SyncHandler,
  type SyncOp,
  type SyncPrisma,
} from "@platform/service-kit";

// In-memory fake of the two Prisma delegates the engine uses. Supports the
// exact calls SyncEngine makes (findUnique / upsert / update + `increment`).
class FakeSyncPrisma implements SyncPrisma {
  queue = new Map<string, Record<string, unknown>>();
  versions = new Map<string, { version: number }>();

  offlineQueue = {
    findUnique: async (args: unknown) => {
      const { where } = args as { where: { client_op_id: string } };
      return this.queue.get(where.client_op_id) ?? null;
    },
    upsert: async (args: unknown) => {
      const { where, create, update } = args as {
        where: { client_op_id: string };
        create: Record<string, unknown>;
        update: { status?: string; retry_count?: { increment: number } };
      };
      const existing = this.queue.get(where.client_op_id);
      if (existing) {
        if (update.status) existing.status = update.status;
        if (update.retry_count?.increment) {
          existing.retry_count =
            ((existing.retry_count as number) ?? 0) +
            update.retry_count.increment;
        }
        return existing;
      }
      const row = { retry_count: 0, ...create };
      this.queue.set(where.client_op_id, row);
      return row;
    },
    update: async (args: unknown) => {
      const { where, data } = args as {
        where: { client_op_id: string };
        data: Record<string, unknown>;
      };
      const row = this.queue.get(where.client_op_id)!;
      Object.assign(row, data);
      return row;
    },
  };

  entityVersion = {
    upsert: async (args: unknown) => {
      const { where, create, update } = args as {
        where: {
          entity_type_entity_id: { entity_type: string; entity_id: string };
        };
        create: { version: number };
        update: { version: { increment: number } };
      };
      const key = `${where.entity_type_entity_id.entity_type}:${where.entity_type_entity_id.entity_id}`;
      const existing = this.versions.get(key);
      if (existing) {
        existing.version += update.version.increment;
        return existing;
      }
      const row = { version: create.version };
      this.versions.set(key, row);
      return row;
    },
  };
}

function op(overrides: Partial<SyncOp> = {}): SyncOp {
  return {
    client_op_id: "op-1",
    operation_type: "place.create",
    entity_type: "place",
    payload: { name: "Old Mill" },
    client_timestamp: new Date().toISOString(),
    ...overrides,
  };
}

const ctx = { userId: "u1", deviceId: "dev-1" };

describe("SyncEngine", () => {
  it("applies a new op, bumps the entity version, and records the entity id", async () => {
    const prisma = new FakeSyncPrisma();
    const handler: SyncHandler = async () => ({ entityId: "pl-1" });
    const engine = new SyncEngine(prisma, { "place.create": handler });

    const [res] = await engine.apply([op()], ctx);

    expect(res.status).toBe("synced");
    expect(res.entity_id).toBe("pl-1");
    expect(res.version).toBe(1);
    expect(prisma.queue.get("op-1")!.status).toBe("synced");
  });

  it("is idempotent — replaying a synced op returns duplicate, not a second write", async () => {
    const prisma = new FakeSyncPrisma();
    let calls = 0;
    const handler: SyncHandler = async () => {
      calls++;
      return { entityId: "pl-1" };
    };
    const engine = new SyncEngine(prisma, { "place.create": handler });

    await engine.apply([op()], ctx);
    const [second] = await engine.apply([op()], ctx); // same client_op_id

    expect(second.status).toBe("duplicate");
    expect(second.entity_id).toBe("pl-1");
    expect(calls).toBe(1); // handler ran only once
  });

  it("maps a SyncConflictError to conflict without failing the batch", async () => {
    const prisma = new FakeSyncPrisma();
    const handler: SyncHandler = async () => {
      throw new SyncConflictError("slot taken");
    };
    const engine = new SyncEngine(prisma, { "place.create": handler });

    const [res] = await engine.apply([op()], ctx);

    expect(res.status).toBe("conflict");
    expect(res.error).toBe("slot taken");
    expect(prisma.queue.get("op-1")!.status).toBe("conflict");
  });

  it("marks an unknown operation_type as failed", async () => {
    const prisma = new FakeSyncPrisma();
    const engine = new SyncEngine(prisma, {});
    const [res] = await engine.apply(
      [op({ operation_type: "mystery.op" })],
      ctx,
    );
    expect(res.status).toBe("failed");
    expect(res.error).toContain("unknown operation_type");
  });

  it("treats a non-conflict throw as a permanent failure", async () => {
    const prisma = new FakeSyncPrisma();
    const handler: SyncHandler = async () => {
      throw new Error("bad payload");
    };
    const engine = new SyncEngine(prisma, { "place.create": handler });
    const [res] = await engine.apply([op()], ctx);
    expect(res.status).toBe("failed");
    expect(res.error).toBe("bad payload");
  });
});
