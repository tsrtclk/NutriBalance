import { Module } from "@nestjs/common";
import { AuthModule, PrismaModule } from "@platform/service-kit";

import { SupplementsController } from "./supplements.controller";
import { SupplementsRepository } from "./supplements.repository";
import { SupplementsService } from "./supplements.service";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SupplementsController],
  providers: [SupplementsService, SupplementsRepository],
})
export class SupplementsModule {}
