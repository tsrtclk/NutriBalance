/**
 * Port for the coach's language model (swappable-providers convention).
 * backlog: D9 — bound in DI from `coach.provider` config: deterministic mock
 * in dev/CI (no key, stable text), Claude in production. Implementations
 * degrade gracefully: an upstream failure returns a polite fallback string,
 * never a 5xx into the request path.
 */

export type CoachRequestKind = "daily_advice" | "chat" | "weekly_report";

export interface CoachChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface CoachRequest {
  kind: CoachRequestKind;
  /** System prompt incl. the user-context block (built by coach-facts). */
  system: string;
  /** Conversation turns; for advice/report a single user instruction. */
  messages: CoachChatTurn[];
  /** Structured facts — lets the mock answer deterministically. */
  facts: Record<string, unknown>;
}

export interface CoachLlmProvider {
  /** Which implementation answered — surfaced in responses for debugging. */
  readonly name: "mock" | "claude";
  generate(request: CoachRequest): Promise<string>;
}

export const COACH_LLM_PROVIDER = "COACH_LLM_PROVIDER";
