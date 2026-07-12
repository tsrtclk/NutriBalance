import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  CurrentUser,
  HttpExceptionFilter,
  JwtAuthGuard,
  PrismaExceptionFilter,
  TransformInterceptor,
  type UserPayload,
} from "@platform/service-kit";

import { ExercisesRepository } from "./exercises.repository";
import { CreateExerciseDto } from "./dto/create-exercise.dto";
import type { ExerciseResponseDto } from "./dto/exercise-response.dto";

// Thin CRUD over the library — no service layer needed until rules appear.
@ApiTags("exercises")
@ApiBearerAuth()
@Controller("exercises")
@UseGuards(JwtAuthGuard)
@UseFilters(new HttpExceptionFilter(), new PrismaExceptionFilter())
@UseInterceptors(TransformInterceptor)
export class ExercisesController {
  constructor(private readonly exercises: ExercisesRepository) {}

  @Get()
  list(
    @CurrentUser() user: UserPayload,
    @Query("muscle_group") muscleGroup?: string,
    @Query("equipment") equipment?: string,
  ): Promise<ExerciseResponseDto[]> {
    return this.exercises.list(user.sub, muscleGroup, equipment);
  }

  @Post()
  create(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateExerciseDto,
  ): Promise<ExerciseResponseDto> {
    return this.exercises.createCustom(user.sub, dto);
  }
}
