import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";

import type { AppConfig } from "../../../config/configuration";
import type { CoachLlmProvider, CoachRequest } from "./coach-llm.provider";

const FALLBACK_TEXT =
  "Le coach est momentanément indisponible — réessayez dans quelques instants.";

/**
 * Claude implementation of the coach port (backlog: D9). The zero-arg client
 * resolves ANTHROPIC_API_KEY from the environment. Best-effort: any API
 * failure logs a warning and returns a polite fallback so the endpoint
 * stays up through an outage.
 */
@Injectable()
export class ClaudeCoachProvider implements CoachLlmProvider {
  readonly name = "claude" as const;
  private readonly logger = new Logger(ClaudeCoachProvider.name);
  private readonly client = new Anthropic();
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(config: ConfigService<AppConfig, true>) {
    const coach = config.get("coach", { infer: true });
    this.model = coach.model;
    this.maxTokens = coach.maxTokens;
  }

  async generate(request: CoachRequest): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        thinking: { type: "adaptive" },
        system: request.system,
        messages: request.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });
      if (response.stop_reason === "refusal") {
        this.logger.warn("coach request refused by safety classifiers");
        return FALLBACK_TEXT;
      }
      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();
      return text || FALLBACK_TEXT;
    } catch (e) {
      if (e instanceof Anthropic.APIError) {
        this.logger.warn(`Claude API error ${e.status}: ${e.message}`);
      } else {
        this.logger.warn(`Claude call failed: ${e}`);
      }
      return FALLBACK_TEXT;
    }
  }
}
