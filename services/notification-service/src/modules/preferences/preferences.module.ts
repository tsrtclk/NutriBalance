import { Module } from "@nestjs/common";
import { AuthModule, PrismaModule } from "@platform/service-kit";

import { PreferencesController } from "./preferences.controller";
import { PreferencesRepository } from "./preferences.repository";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PreferencesController],
  providers: [PreferencesRepository],
  exports: [PreferencesRepository],
})
export class PreferencesModule {}
