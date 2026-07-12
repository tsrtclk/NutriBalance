import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthModule, PrismaModule, RedisModule } from "@platform/service-kit";

import type { AppConfig } from "../../config/configuration";
import { CoachController } from "./coach.controller";
import { CoachRepository } from "./coach.repository";
import { CoachService } from "./coach.service";
import { COACH_LLM_PROVIDER } from "./provider/coach-llm.provider";
import { MockCoachProvider } from "./provider/mock-coach.provider";
import { ClaudeCoachProvider } from "./provider/claude-coach.provider";

@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [CoachController],
  providers: [
    CoachService,
    CoachRepository,
    MockCoachProvider,
    ClaudeCoachProvider,
    {
      // backlog: D9 — swappable coach LLM (mock in dev/CI, Claude in prod).
      provide: COACH_LLM_PROVIDER,
      inject: [ConfigService, MockCoachProvider, ClaudeCoachProvider],
      useFactory: (
        config: ConfigService<AppConfig, true>,
        mock: MockCoachProvider,
        claude: ClaudeCoachProvider,
      ) =>
        config.get("coach", { infer: true }).provider === "claude"
          ? claude
          : mock,
    },
  ],
})
export class CoachModule {}
