import { Module } from "@nestjs/common";
import { AuthModule, PrismaModule } from "@platform/service-kit";

import { SettingsController } from "./settings.controller";
import { SettingsRepository } from "./settings.repository";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SettingsController],
  providers: [SettingsRepository],
})
export class SettingsModule {}
