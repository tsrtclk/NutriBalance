import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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

import { WorkoutsService } from "./workouts.service";
import type { SessionSuggestion } from "./suggest-next-session";
import {
  AddSetDto,
  CompleteWorkoutDto,
  StartWorkoutDto,
} from "./dto/workout-dtos";
import type {
  ProgressionPointDto,
  WorkoutResponseDto,
} from "./dto/workout-response.dto";

// Static paths (suggestion, progression) are declared before ":id" so Nest
// never swallows them as workout ids.
@ApiTags("workouts")
@ApiBearerAuth()
@Controller("workouts")
@UseGuards(JwtAuthGuard)
@UseFilters(new HttpExceptionFilter(), new PrismaExceptionFilter())
@UseInterceptors(TransformInterceptor)
export class WorkoutsController {
  constructor(private readonly workouts: WorkoutsService) {}

  @Post()
  start(
    @CurrentUser() user: UserPayload,
    @Body() dto: StartWorkoutDto,
  ): Promise<WorkoutResponseDto> {
    return this.workouts.start(user.sub, dto);
  }

  @Get()
  list(@CurrentUser() user: UserPayload): Promise<WorkoutResponseDto[]> {
    return this.workouts.list(user.sub);
  }

  @Get("suggestion")
  suggestion(@CurrentUser() user: UserPayload): Promise<SessionSuggestion> {
    return this.workouts.suggestion(user.sub);
  }

  @Get("progression")
  progression(
    @CurrentUser() user: UserPayload,
    @Query("exercise_id", ParseUUIDPipe) exerciseId: string,
  ): Promise<ProgressionPointDto[]> {
    return this.workouts.progression(user.sub, exerciseId);
  }

  @Get(":id")
  get(
    @CurrentUser() user: UserPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<WorkoutResponseDto> {
    return this.workouts.getOwnedOrThrow(user.sub, id);
  }

  @Post(":id/sets")
  addSet(
    @CurrentUser() user: UserPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AddSetDto,
  ): Promise<WorkoutResponseDto> {
    return this.workouts.addSet(user.sub, id, dto);
  }

  @Post(":id/complete")
  @HttpCode(HttpStatus.OK)
  complete(
    @CurrentUser() user: UserPayload,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CompleteWorkoutDto,
  ): Promise<WorkoutResponseDto> {
    return this.workouts.complete(user.sub, id, dto);
  }
}
