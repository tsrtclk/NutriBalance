import {
  Controller,
  Get,
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

import {
  GamificationService,
  type ChallengeView,
  type StreakView,
} from "./gamification.service";
import type { StreakKind } from "./streak-rules";

@ApiTags("gamification")
@ApiBearerAuth()
@Controller("gamification")
@UseGuards(JwtAuthGuard)
@UseFilters(new HttpExceptionFilter(), new PrismaExceptionFilter())
@UseInterceptors(TransformInterceptor)
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  @Get("streaks")
  streaks(
    @CurrentUser() user: UserPayload,
  ): Promise<Record<StreakKind, StreakView>> {
    return this.gamification.streaks(user.sub);
  }

  @Get("badges")
  badges(
    @CurrentUser() user: UserPayload,
  ): Promise<{ code: string; title: string; earned_at: Date }[]> {
    return this.gamification.badges(user.sub);
  }

  @Get("challenge")
  challenge(@CurrentUser() user: UserPayload): Promise<ChallengeView> {
    return this.gamification.challenge(user.sub);
  }
}
