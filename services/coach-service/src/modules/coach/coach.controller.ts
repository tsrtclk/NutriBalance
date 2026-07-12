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

import { CoachService } from "./coach.service";
import { ChatDto, DateQueryDto, WeekQueryDto } from "./dto/coach-dtos";

@ApiTags("coach")
@ApiBearerAuth()
@Controller("coach")
@UseGuards(JwtAuthGuard)
@UseFilters(new HttpExceptionFilter(), new PrismaExceptionFilter())
@UseInterceptors(TransformInterceptor)
export class CoachController {
  constructor(private readonly coach: CoachService) {}

  @Get("daily-advice")
  dailyAdvice(@CurrentUser() user: UserPayload, @Query() query: DateQueryDto) {
    return this.coach.dailyAdvice(user.sub, query.date);
  }

  @Post("chat")
  chat(@CurrentUser() user: UserPayload, @Body() dto: ChatDto) {
    return this.coach.chat(user.sub, dto.message);
  }

  @Get("chat")
  history(@CurrentUser() user: UserPayload) {
    return this.coach.history(user.sub);
  }

  @Get("weekly-report")
  weeklyReport(@CurrentUser() user: UserPayload, @Query() query: WeekQueryDto) {
    return this.coach.weeklyReport(user.sub, query.week_start);
  }
}
