import { Module } from "@nestjs/common";
import { AuthModule, PrismaModule } from "@platform/service-kit";

import { ExercisesModule } from "../exercises/exercises.module";
import { WorkoutsController } from "./workouts.controller";
import { WorkoutsRepository } from "./workouts.repository";
import { WorkoutsService } from "./workouts.service";

@Module({
  imports: [PrismaModule, AuthModule, ExercisesModule],
  controllers: [WorkoutsController],
  providers: [WorkoutsService, WorkoutsRepository],
})
export class WorkoutsModule {}
