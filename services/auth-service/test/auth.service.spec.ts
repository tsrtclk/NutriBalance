import { JwtService } from "@nestjs/jwt";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import type { User } from "@platform/prisma-client";

import { AuthService } from "../src/modules/auth/auth.service";
import type { UsersRepository } from "../src/modules/auth/users.repository";
import type { AppConfig } from "../src/config/configuration";

const jwtCfg: AppConfig["jwt"] = {
  accessSecret: "test_access_secret_min_32_chars_xxxx",
  refreshSecret: "test_refresh_secret_min_32_chars_xxx",
  issuer: "platform-test",
  accessTtlSec: 900,
  refreshTtlSec: 3600,
};

class FakeUsersRepository {
  private byEmail = new Map<string, User>();
  private seq = 0;

  async findByEmail(email: string): Promise<User | null> {
    return this.byEmail.get(email) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    for (const u of this.byEmail.values()) if (u.id === id) return u;
    return null;
  }

  async create(data: {
    email: string;
    password_hash: string;
    full_name: string;
    locale?: string;
  }): Promise<User> {
    const user = {
      id: `00000000-0000-4000-8000-00000000000${this.seq++}`,
      email: data.email,
      password_hash: data.password_hash,
      full_name: data.full_name,
      auth_level: 1,
      locale: data.locale ?? "fr",
      created_at: new Date(),
      updated_at: new Date(),
    } as User;
    this.byEmail.set(user.email, user);
    return user;
  }

  async delete(id: string): Promise<User> {
    for (const u of this.byEmail.values())
      if (u.id === id) {
        this.byEmail.delete(u.email);
        return u;
      }
    throw new Error("not found");
  }
}

class FakeRedis {
  store = new Map<string, string>();
  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
  async set(key: string, value: string, _ttl?: number): Promise<void> {
    this.store.set(key, value);
  }
  async del(...keys: string[]): Promise<number> {
    let n = 0;
    for (const k of keys) if (this.store.delete(k)) n++;
    return n;
  }
  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }
}

function makeService() {
  const repo = new FakeUsersRepository();
  const redis = new FakeRedis();
  const events = { publish: jest.fn().mockResolvedValue(undefined) };
  const config = { get: jest.fn().mockReturnValue(jwtCfg) };
  const service = new AuthService(
    repo as unknown as UsersRepository,
    new JwtService({}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    redis as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    events as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config as any,
  );
  return { service, repo, redis, events };
}

const REGISTRATION = {
  email: "Test@Example.com",
  password: "s3cret-pass",
  full_name: "Test User",
  device_id: "dev-1",
};

describe("AuthService", () => {
  it("registers a user, lowercases the email, and emits user.registered", async () => {
    const { service, events } = makeService();
    const res = await service.register({ ...REGISTRATION });
    expect(res.user.email).toBe("test@example.com");
    expect(res.tokens.access_token).toBeTruthy();
    expect(res.tokens.expires_in).toBe(jwtCfg.accessTtlSec);
    expect(events.publish).toHaveBeenCalledWith(
      "user.registered",
      expect.objectContaining({ email: "test@example.com" }),
    );
  });

  it("rejects a duplicate email with 409", async () => {
    const { service } = makeService();
    await service.register({ ...REGISTRATION });
    await expect(service.register({ ...REGISTRATION })).rejects.toThrow(
      ConflictException,
    );
  });

  it("rejects a wrong password with the same error as an unknown email", async () => {
    const { service } = makeService();
    await service.register({ ...REGISTRATION });
    await expect(
      service.login({ email: REGISTRATION.email, password: "wrong-password" }),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      service.login({ email: "nobody@example.com", password: "whatever1" }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rotates the refresh token and rejects replay of the rotated-out one", async () => {
    const { service } = makeService();
    const { tokens } = await service.register({ ...REGISTRATION });

    const next = await service.refresh(tokens.refresh_token);
    expect(next.refresh_token).not.toBe(tokens.refresh_token);

    // The first refresh token was rotated out — replaying it must 401 AND
    // revoke the whole device session (the new token dies with it).
    await expect(service.refresh(tokens.refresh_token)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(service.refresh(next.refresh_token)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("rejects an access token passed as a refresh token (no jti)", async () => {
    const { service } = makeService();
    const { tokens } = await service.register({ ...REGISTRATION });
    await expect(service.refresh(tokens.access_token)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("logout blacklists the device's access tokens and drops its refresh pin", async () => {
    const { service, redis } = makeService();
    const { user, tokens } = await service.register({ ...REGISTRATION });
    await service.logout({
      sub: user.id,
      email: user.email,
      authLevel: 1,
      roles: [],
      deviceId: "dev-1",
      locale: "fr",
    });
    expect(redis.store.has(`bl:access:${user.id}:dev-1`)).toBe(true);
    expect(redis.store.has(`rt:${user.id}:dev-1`)).toBe(false);
    await expect(service.refresh(tokens.refresh_token)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("account deletion re-confirms the password (É12 RGPD, D14)", async () => {
    const { service, repo } = makeService();
    const { user } = await service.register({ ...REGISTRATION });
    const payload = {
      sub: user.id,
      email: user.email,
      authLevel: 1,
      roles: [],
      deviceId: "dev-1",
      locale: "fr",
    };
    await expect(
      service.deleteAccount(payload, "wrong-password"),
    ).rejects.toThrow(UnauthorizedException);
    expect(await repo.findById(user.id)).not.toBeNull();
  });

  it("account deletion wipes the user, kills the session, emits user.deleted", async () => {
    const { service, repo, redis, events } = makeService();
    const { user, tokens } = await service.register({ ...REGISTRATION });
    await service.deleteAccount(
      {
        sub: user.id,
        email: user.email,
        authLevel: 1,
        roles: [],
        deviceId: "dev-1",
        locale: "fr",
      },
      REGISTRATION.password,
    );
    expect(await repo.findById(user.id)).toBeNull();
    expect(redis.store.has(`bl:access:${user.id}:dev-1`)).toBe(true);
    expect(events.publish).toHaveBeenCalledWith("user.deleted", {
      id: user.id,
    });
    await expect(service.refresh(tokens.refresh_token)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
