import { Module } from "@nestjs/common";
import { EventBusModule } from "@platform/events";
import { AuthModule, PrismaModule } from "@platform/service-kit";

import { GamificationController } from "./gamification.controller";
import { GamificationRepository } from "./gamification.repository";
import { GamificationService } from "./gamification.service";
import { PlatformEventsConsumer } from "./platform-events.consumer";

@Module({
  imports: [PrismaModule, AuthModule, EventBusModule],
  controllers: [GamificationController],
  providers: [
    GamificationService,
    GamificationRepository,
    PlatformEventsConsumer,
  ],
})
export class GamificationModule {}
