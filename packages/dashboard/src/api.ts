import type {
  ActionResult,
  AgentAction,
  Checkpoint,
  CreateSessionRequest,
  HandoffRequest,
  HandoffState,
  Observation,
  ObserveRequest,
  ResumeHandoffResponse,
  RuntimeError,
  Session,
  TraceEvent,
} from "@actos/core";

import {
  ActResponseSchema,
  CreateCheckpointResponseSchema,
  CreateSessionRequestSchema,
  CreateSessionResponseSchema,
  fallbackRuntimeError,
  GetSessionResponseSchema,
  GetTraceResponseSchema,
  ListSessionsResponseSchema,
  ObserveResponseSchema,
  PauseHandoffResponseSchema,
  ResumeHandoffResponseSchema,
  RuntimeErrorSchema,
} from "./schemas.js";

export const DEFAULT_API_BASE = "http://127.0.0.1:8787";

export class ActOSDashboardApiError extends Error {
  readonly runtimeError: RuntimeError;
  readonly statusCode: number;

  constructor(statusCode: number, runtimeError: RuntimeError) {
    super(runtimeError.message);
    this.name = "ActOSDashboardApiError";
    this.statusCode = statusCode;
    this.runtimeError = runtimeError;
  }
}

export type ActOSDashboardApiOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

type HttpMethod = "GET" | "POST" | "DELETE";

export class ActOSDashboardApi {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ActOSDashboardApiOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_API_BASE).replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  screenshotUrl(sessionId: string, observationId: string): string {
    return `${this.baseUrl}/sessions/${sessionId}/artifacts/screenshot/${observationId}`;
  }

  async listSessions(): Promise<Session[]> {
    const response = await this.request("GET", "/sessions", undefined, ListSessionsResponseSchema);
    return response.sessions as Session[];
  }

  async getSession(sessionId: string): Promise<Session> {
    const response = await this.request("GET", `/sessions/${sessionId}`, undefined, GetSessionResponseSchema);
    return response.session as Session;
  }

  async createSession(request: CreateSessionRequest = {}): Promise<Session> {
    CreateSessionRequestSchema.parse(request);
    const response = await this.request("POST", "/sessions", request, CreateSessionResponseSchema);
    return response.session as Session;
  }

  async observe(sessionId: string, request: ObserveRequest = {}): Promise<Observation> {
    const response = await this.request(
      "POST",
      `/sessions/${sessionId}/observe`,
      request,
      ObserveResponseSchema,
    );
    return response.observation as Observation;
  }

  async act(sessionId: string, action: AgentAction): Promise<ActionResult> {
    const response = await this.request(
      "POST",
      `/sessions/${sessionId}/act`,
      { action },
      ActResponseSchema,
    );
    return response.result as ActionResult;
  }

  async checkpoint(sessionId: string, label: string): Promise<Checkpoint> {
    const response = await this.request(
      "POST",
      `/sessions/${sessionId}/checkpoints`,
      { label },
      CreateCheckpointResponseSchema,
    );
    return response.checkpoint as Checkpoint;
  }

  async pauseForHuman(sessionId: string, request: HandoffRequest): Promise<HandoffState> {
    const response = await this.request(
      "POST",
      `/sessions/${sessionId}/handoff/pause`,
      request,
      PauseHandoffResponseSchema,
    );
    return response.handoff as HandoffState;
  }

  async resume(sessionId: string): Promise<ResumeHandoffResponse> {
    const parsed = await this.request(
      "POST",
      `/sessions/${sessionId}/handoff/resume`,
      undefined,
      ResumeHandoffResponseSchema,
    );
    return parsed as ResumeHandoffResponse;
  }

  async getTrace(sessionId: string): Promise<TraceEvent[]> {
    const response = await this.request("GET", `/sessions/${sessionId}/trace`, undefined, GetTraceResponseSchema);
    return response.events as TraceEvent[];
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    body: unknown,
    schema: { parse: (value: unknown) => T },
  ): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    const payload = text.length > 0 ? (JSON.parse(text) as unknown) : undefined;

    if (!response.ok) {
      const parsedError = RuntimeErrorSchema.safeParse((payload as { error?: unknown } | undefined)?.error);
      throw new ActOSDashboardApiError(
        response.status,
        (parsedError.success ? parsedError.data : fallbackRuntimeError(`Request failed with status ${response.status}`)) as RuntimeError,
      );
    }

    return schema.parse(payload);
  }
}
