import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { TerminusModule } from "@nestjs/terminus";
import { EventBusModule } from "@platform/events";
import { AuthModule, PrismaModule, RedisModule } from "@platform/service-kit";

import configuration from "./config/configuration";
import { HealthController } from "./modules/health/health.controller";
import { ExercisesModule } from "./modules/exercises/exercises.module";
import { WorkoutsModule } from "./modules/workouts/workouts.module";

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
    ExercisesModule,
    WorkoutsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
