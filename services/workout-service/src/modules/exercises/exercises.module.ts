import { Module } from "@nestjs/common";
import { AuthModule, PrismaModule } from "@platform/service-kit";

import { ExercisesController } from "./exercises.controller";
import { ExercisesRepository } from "./exercises.repository";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ExercisesController],
  providers: [ExercisesRepository],
  exports: [ExercisesRepository],
})
export class ExercisesModule {}
