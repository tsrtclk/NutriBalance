import { Module } from "@nestjs/common";
import { AuthModule, PrismaModule } from "@platform/service-kit";

import { FoodsModule } from "../foods/foods.module";
import { JournalController } from "./journal.controller";
import { JournalRepository } from "./journal.repository";
import { JournalService } from "./journal.service";

@Module({
  imports: [PrismaModule, AuthModule, FoodsModule],
  controllers: [JournalController],
  providers: [JournalService, JournalRepository],
})
export class JournalModule {}
