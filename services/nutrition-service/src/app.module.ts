import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { TerminusModule } from "@nestjs/terminus";
import { EventBusModule } from "@platform/events";
import { AuthModule, PrismaModule, RedisModule } from "@platform/service-kit";

import configuration from "./config/configuration";
import { HealthController } from "./modules/health/health.controller";
import { FoodsModule } from "./modules/foods/foods.module";
import { JournalModule } from "./modules/journal/journal.module";
import { HydrationModule } from "./modules/hydration/hydration.module";
import { SupplementsModule } from "./modules/supplements/supplements.module";

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
    FoodsModule,
    JournalModule,
    HydrationModule,
    SupplementsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
