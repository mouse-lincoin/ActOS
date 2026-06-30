import {
  ActionResultSchema,
  CreateCheckpointResponseSchema,
  CreateSessionRequestSchema,
  CreateSessionResponseSchema,
  GetTraceResponseSchema,
  ObserveResponseSchema,
  PauseHandoffResponseSchema,
  ResumeHandoffResponseSchema,
  RuntimeErrorSchema,
  SessionSchema,
  type ActionResult,
  type AgentAction,
  type Checkpoint,
  type CreateSessionRequest,
  type HandoffRequest,
  type HandoffState,
  type Observation,
  type ObserveRequest,
  type ResumeHandoffResponse,
  type RuntimeError,
  type Session,
  type TraceEvent,
} from "@actos/core";
import { z } from "zod";

export class ActOSClientError extends Error {
  readonly runtimeError: RuntimeError;
  readonly statusCode: number;

  constructor(statusCode: number, runtimeError: RuntimeError) {
    super(runtimeError.message);
    this.name = "ActOSClientError";
    this.statusCode = statusCode;
    this.runtimeError = runtimeError;
  }
}

const ListSessionsResponseSchema = z.object({
  sessions: z.array(SessionSchema),
});

const GetSessionResponseSchema = z.object({
  session: SessionSchema,
});

const ActResponseSchema = z.object({
  result: ActionResultSchema,
});

export type ActOSClientOptions = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
};

type HttpMethod = "GET" | "POST" | "DELETE";

export class ActOSClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ActOSClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async createSession(request: CreateSessionRequest = {}): Promise<ActOSSession> {
    CreateSessionRequestSchema.parse(request);
    const response = await this.request("POST", "/sessions", request, CreateSessionResponseSchema);
    return new ActOSSession(this, response.session.id);
  }

  async listSessions(): Promise<Session[]> {
    const response = await this.request("GET", "/sessions", undefined, ListSessionsResponseSchema);
    return response.sessions;
  }

  async getSession(sessionId: string): Promise<Session> {
    const response = await this.request("GET", `/sessions/${sessionId}`, undefined, GetSessionResponseSchema);
    return response.session;
  }

  async closeSession(sessionId: string): Promise<void> {
    await this.requestVoid("DELETE", `/sessions/${sessionId}`);
  }

  async observe(sessionId: string, request: ObserveRequest = {}): Promise<Observation> {
    const response = await this.request(
      "POST",
      `/sessions/${sessionId}/observe`,
      request,
      ObserveResponseSchema,
    );
    return response.observation;
  }

  async act(sessionId: string, action: AgentAction): Promise<ActionResult> {
    const response = await this.request(
      "POST",
      `/sessions/${sessionId}/act`,
      { action },
      ActResponseSchema,
    );
    return response.result;
  }

  async checkpoint(sessionId: string, label: string): Promise<Checkpoint> {
    const response = await this.request(
      "POST",
      `/sessions/${sessionId}/checkpoints`,
      { label },
      CreateCheckpointResponseSchema,
    );
    return response.checkpoint;
  }

  async pauseForHuman(sessionId: string, request: HandoffRequest): Promise<HandoffState> {
    const response = await this.request(
      "POST",
      `/sessions/${sessionId}/handoff/pause`,
      request,
      PauseHandoffResponseSchema,
    );
    return response.handoff;
  }

  async resume(sessionId: string): Promise<ResumeHandoffResponse> {
    return this.request("POST", `/sessions/${sessionId}/handoff/resume`, {}, ResumeHandoffResponseSchema);
  }

  async getTrace(sessionId: string): Promise<TraceEvent[]> {
    const response = await this.request("GET", `/sessions/${sessionId}/trace`, undefined, GetTraceResponseSchema);
    return response.events;
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    body: unknown,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    const json = text ? JSON.parse(text) : {};

    if (!response.ok) {
      const parsedError = z.object({ error: RuntimeErrorSchema }).safeParse(json);
      if (parsedError.success) {
        throw new ActOSClientError(response.status, parsedError.data.error);
      }
      throw new ActOSClientError(
        response.status,
        RuntimeErrorSchema.parse({
          id: "err_client",
          code: "UNKNOWN_RUNTIME_ERROR",
          message: `Request failed with status ${response.status}`,
          category: "unknown",
          recoverable: true,
        }),
      );
    }

    return schema.parse(json);
  }

  private async requestVoid(method: HttpMethod, path: string): Promise<void> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, { method });
    if (!response.ok && response.status !== 204) {
      const text = await response.text();
      const json = text ? JSON.parse(text) : {};
      const parsedError = z.object({ error: RuntimeErrorSchema }).safeParse(json);
      if (parsedError.success) {
        throw new ActOSClientError(response.status, parsedError.data.error);
      }
      throw new ActOSClientError(
        response.status,
        RuntimeErrorSchema.parse({
          id: "err_client",
          code: "UNKNOWN_RUNTIME_ERROR",
          message: `Request failed with status ${response.status}`,
          category: "unknown",
          recoverable: true,
        }),
      );
    }
  }
}

export class ActOSSession {
  readonly id: string;

  constructor(
    private readonly client: ActOSClient,
    id: string,
  ) {
    this.id = id;
  }

  observe(request?: ObserveRequest): Promise<Observation> {
    return this.client.observe(this.id, request);
  }

  act(action: AgentAction): Promise<ActionResult> {
    return this.client.act(this.id, action);
  }

  checkpoint(label: string): Promise<Checkpoint> {
    return this.client.checkpoint(this.id, label);
  }

  pauseForHuman(request: HandoffRequest): Promise<HandoffState> {
    return this.client.pauseForHuman(this.id, request);
  }

  resume(): Promise<ResumeHandoffResponse> {
    return this.client.resume(this.id);
  }

  getTrace(): Promise<TraceEvent[]> {
    return this.client.getTrace(this.id);
  }

  close(): Promise<void> {
    return this.client.closeSession(this.id);
  }
}
