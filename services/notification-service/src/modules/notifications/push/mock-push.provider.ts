import { Injectable, Logger } from "@nestjs/common";

import type { PushProvider } from "./push.provider";

/** Deterministic no-op push for dev/CI (backlog: D6) — logs instead of
 * sending, so the whole pipeline runs unconfigured. */
@Injectable()
export class MockPushProvider implements PushProvider {
  private readonly logger = new Logger(MockPushProvider.name);

  async send(userId: string, title: string, _body: string): Promise<void> {
    this.logger.log(`push (mock) → ${userId}: ${title}`);
  }
}
