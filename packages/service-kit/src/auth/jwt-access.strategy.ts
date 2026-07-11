import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import type { ServiceKitConfig } from "../config.types";
import type { UserPayload } from "../common/interfaces/user-payload.interface";
import { RedisService } from "../redis/redis.service";

/**
 * Validates Bearer access tokens issued by the product's auth service.
 *
 * Cryptographic validity + Redis blacklist check (matches the auth service's
 * blacklist namespace: `bl:access:{sub}:{deviceId}`). Kit consumers never
 * issue tokens — only verify them.
 */
@Injectable()
export class JwtAccessStrategy extends PassportStrategy(
  Strategy,
  "jwt-access",
) {
  constructor(
    @Inject(ConfigService) config: ConfigService<ServiceKitConfig, true>,
    private readonly redis: RedisService,
  ) {
    const jwtCfg = config.get("jwt", { infer: true });
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtCfg.accessSecret,
      issuer: jwtCfg.issuer,
      algorithms: ["HS256"],
      passReqToCallback: false,
    });
  }

  async validate(payload: UserPayload): Promise<UserPayload> {
    if (!payload.sub || !payload.deviceId) {
      throw new UnauthorizedException({
        code: "INVALID_TOKEN",
        message: "Invalid token",
      });
    }

    const blacklisted = await this.redis.exists(
      `bl:access:${payload.sub}:${payload.deviceId}`,
    );
    if (blacklisted) {
      throw new UnauthorizedException({
        code: "TOKEN_REVOKED",
        message: "Token has been revoked",
      });
    }

    return payload;
  }
}
