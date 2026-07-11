import {
  setWorldConstructor,
  setDefaultTimeout,
  World,
  IWorldOptions,
} from "@cucumber/cucumber";
import axios, { AxiosInstance, AxiosResponse } from "axios";

// Login may back off through the OTP rate-limit window (5/60s), so allow steps
// plenty of time before failing.
setDefaultTimeout(120_000);

/**
 * Shared state for a scenario. Holds a non-throwing HTTP client (so steps can
 * assert on any status), a token per named actor, the last response, and a
 * `vars` bag for carrying ids between steps (e.g. a created tool's id).
 */
export class PlatformWorld extends World {
  readonly baseUrl: string;
  readonly http: AxiosInstance;
  readonly tokens: Record<string, string> = {};
  readonly userIds: Record<string, string> = {};
  readonly vars: Record<string, string> = {};
  lastResponse?: AxiosResponse;

  constructor(options: IWorldOptions) {
    super(options);
    this.baseUrl = process.env.API_BASE_URL || "http://localhost:8000/api/v1";
    this.http = axios.create({
      baseURL: this.baseUrl,
      validateStatus: () => true, // never throw — steps assert on status
    });
  }

  /** Auth header for a named actor, or none. */
  authHeader(actor?: string): Record<string, string> {
    const t = actor ? this.tokens[actor] : undefined;
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  /** Substitute {{var}} placeholders from the vars bag (and ids/tokens). */
  interpolate(s: string): string {
    return s.replace(
      /\{\{(\w+)\}\}/g,
      (_, k) => this.vars[k] ?? this.userIds[k] ?? "",
    );
  }

  get data(): any {
    const body = this.lastResponse?.data;
    return body && typeof body === "object" && "data" in body
      ? body.data
      : body;
  }
}

setWorldConstructor(PlatformWorld);
