import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { TerminusModule } from "@nestjs/terminus";
import { EventBusModule } from "@platform/events";
import { AuthModule, PrismaModule, RedisModule } from "@platform/service-kit";

import configuration from "./config/configuration";
import { HealthController } from "./modules/health/health.controller";
import { GamificationModule } from "./modules/gamification/gamification.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [".env.local", ".env"],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL_MS ?? 60_000),
        limit: Number(process.env.THROTTLE_LIMIT ?? 100),
      },
    ]),
    TerminusModule,
    EventBusModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    GamificationModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
