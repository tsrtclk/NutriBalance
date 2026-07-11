import { randomUUID } from "node:crypto";

import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { EventBusService } from "@platform/events";
import {
  RedisService,
  type RefreshPayload,
  type UserPayload,
} from "@platform/service-kit";
import type { User } from "@platform/prisma-client";
import * as bcrypt from "bcryptjs";

import type { AppConfig } from "../../config/configuration";
import { UsersRepository } from "./users.repository";
import type { RegisterDto } from "./dto/register.dto";
import type { LoginDto } from "./dto/login.dto";
import type {
  AuthResponseDto,
  TokensDto,
  UserResponseDto,
} from "./dto/auth-response.dto";

const BCRYPT_ROUNDS = 10;
const DEFAULT_DEVICE = "web";

/**
 * The only token-issuing service (É2). Every other service verifies through
 * @platform/service-kit, so the shapes here are contracts:
 *   - access JWT: UserPayload, HS256, `jwt.issuer`, `jwt.accessSecret`
 *   - revocation: Redis `bl:access:{sub}:{deviceId}` under the SHARED prefix (X1)
 *   - refresh: RefreshPayload with a rotating `jti` pinned in Redis
 *     (`rt:{sub}:{deviceId}`) — a reused/rotated-out token revokes the session.
 */
@Injectable()
export class AuthService {
  private readonly jwtCfg: AppConfig["jwt"];

  constructor(
    private readonly users: UsersRepository,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly events: EventBusService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.jwtCfg = config.get("jwt", { infer: true });
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.users.findByEmail(dto.email.toLowerCase());
    if (existing) {
      throw new ConflictException({
        code: "EMAIL_TAKEN",
        message: "An account with this email already exists",
      });
    }
    const user = await this.users.create({
      email: dto.email.toLowerCase(),
      password_hash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      full_name: dto.full_name,
      locale: dto.locale,
    });
    await this.events.publish("user.registered", {
      id: user.id,
      email: user.email,
    });
    const tokens = await this.issueTokens(user, dto.device_id);
    return { user: this.toUserDto(user), tokens };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.users.findByEmail(dto.email.toLowerCase());
    // Same error for unknown email and bad password — no account enumeration.
    const valid =
      user && (await bcrypt.compare(dto.password, user.password_hash));
    if (!valid) {
      throw new UnauthorizedException({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }
    const tokens = await this.issueTokens(user, dto.device_id);
    return { user: this.toUserDto(user), tokens };
  }

  async refresh(refreshToken: string): Promise<TokensDto> {
    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.jwtCfg.refreshSecret,
        issuer: this.jwtCfg.issuer,
      });
    } catch {
      throw this.invalidRefresh();
    }
    if (!payload.sub || !payload.deviceId || !payload.jti) {
      throw this.invalidRefresh();
    }
    const key = `rt:${payload.sub}:${payload.deviceId}`;
    const storedJti = await this.redis.get(key);
    if (storedJti !== payload.jti) {
      // Rotated-out token being replayed → kill the whole device session.
      await this.redis.del(key);
      throw this.invalidRefresh();
    }
    const user = await this.users.findById(payload.sub);
    if (!user) throw this.invalidRefresh();
    return this.issueTokens(user, payload.deviceId);
  }

  /** Blacklists the current access token's device and drops its refresh jti. */
  async logout(payload: UserPayload): Promise<void> {
    await this.redis.set(
      `bl:access:${payload.sub}:${payload.deviceId}`,
      "1",
      this.jwtCfg.accessTtlSec,
    );
    await this.redis.del(`rt:${payload.sub}:${payload.deviceId}`);
  }

  async me(userId: string): Promise<UserResponseDto> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }
    return this.toUserDto(user);
  }

  private async issueTokens(
    user: User,
    deviceId = DEFAULT_DEVICE,
  ): Promise<TokensDto> {
    const accessPayload: Omit<UserPayload, "iat" | "exp"> = {
      sub: user.id,
      email: user.email,
      authLevel: user.auth_level,
      roles: [],
      deviceId,
      locale: user.locale,
    };
    const jti = randomUUID();
    const refreshPayload: Omit<RefreshPayload, "iat" | "exp"> = {
      sub: user.id,
      deviceId,
      jti,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.jwtCfg.accessSecret,
        issuer: this.jwtCfg.issuer,
        expiresIn: this.jwtCfg.accessTtlSec,
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.jwtCfg.refreshSecret,
        issuer: this.jwtCfg.issuer,
        expiresIn: this.jwtCfg.refreshTtlSec,
      }),
    ]);
    // Pin the only valid refresh jti for this device (rotation).
    await this.redis.set(
      `rt:${user.id}:${deviceId}`,
      jti,
      this.jwtCfg.refreshTtlSec,
    );
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: this.jwtCfg.accessTtlSec,
    };
  }

  private invalidRefresh(): UnauthorizedException {
    return new UnauthorizedException({
      code: "INVALID_REFRESH_TOKEN",
      message: "Refresh token is invalid or has been rotated",
    });
  }

  private toUserDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      locale: user.locale,
      auth_level: user.auth_level,
      created_at: user.created_at,
    };
  }
}
