import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule } from "@nestjs/throttler";
import { TerminusModule } from "@nestjs/terminus";
import { EventBusModule } from "@platform/events";
import { AuthModule, PrismaModule, RedisModule } from "@platform/service-kit";

import configuration from "./config/configuration";
import { HealthController } from "./modules/health/health.controller";
import { PreferencesModule } from "./modules/preferences/preferences.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { RemindersScheduler } from "./modules/scheduler/reminders.scheduler";
import { PlatformEventsConsumer } from "./modules/consumers/platform-events.consumer";

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
    ScheduleModule.forRoot(),
    TerminusModule,
    EventBusModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    PreferencesModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
  providers: [RemindersScheduler, PlatformEventsConsumer],
})
export class AppModule {}
