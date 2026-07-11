import { Module } from "@nestjs/common";
import { AuthModule, PrismaModule } from "@platform/service-kit";

import { ProfileModule } from "../profile/profile.module";
import { WeightController } from "./weight.controller";
import { WeightRepository } from "./weight.repository";
import { WeightService } from "./weight.service";

@Module({
  imports: [PrismaModule, AuthModule, ProfileModule],
  controllers: [WeightController],
  providers: [WeightService, WeightRepository],
})
export class WeightModule {}
