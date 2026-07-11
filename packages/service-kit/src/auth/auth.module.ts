import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";

import type { ServiceKitConfig } from "../config.types";
import { RedisModule } from "../redis/redis.module";
import { JwtAccessStrategy } from "./jwt-access.strategy";

/**
 * Verification-only auth module. Kit consumers verify JWTs minted by the
 * product's auth service; they never issue them. The strategy validates
 * the bearer token (signature + Redis blacklist) and attaches the
 * UserPayload to req.user.
 */
@Module({
  imports: [PassportModule, RedisModule, ConfigModule],
  providers: [JwtAccessStrategy, ConfigService<ServiceKitConfig, true>],
  exports: [JwtAccessStrategy],
})
export class AuthModule {}
