import { Module } from "@nestjs/common";
import { AuthModule, PrismaModule } from "@platform/service-kit";

import { PlacesController } from "./places.controller";
import { PlacesRepository } from "./places.repository";
import { PlacesService } from "./places.service";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PlacesController],
  providers: [PlacesService, PlacesRepository],
})
export class PlacesModule {}
