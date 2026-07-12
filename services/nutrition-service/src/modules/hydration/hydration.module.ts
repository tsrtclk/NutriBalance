import { Module } from "@nestjs/common";
import { AuthModule, PrismaModule } from "@platform/service-kit";

import { HydrationController } from "./hydration.controller";
import { HydrationRepository } from "./hydration.repository";
import { HydrationService } from "./hydration.service";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [HydrationController],
  providers: [HydrationService, HydrationRepository],
})
export class HydrationModule {}
