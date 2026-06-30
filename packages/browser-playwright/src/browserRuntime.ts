import {
  createId,
  ID_PREFIXES,
  runtimeError,
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

import {
  ActionRouter,
  redactActionForTrace,
  type ActionExecutionDetails,
} from "./actionRouter.js";
import { getArtifactRoot } from "./artifacts.js";
import { JsonlTraceStore } from "./jsonlTraceStore.js";
import { observePage } from "./observe.js";
import {
  PlaywrightSessionDriver,
  type BrowserSessionHandle,
  type PlaywrightDriverConfig,
} from "./playwrightDriver.js";

export type BrowserRuntimeConfig = PlaywrightDriverConfig;

export class BrowserRuntime {
  private readonly driver: PlaywrightSessionDriver;
  private readonly traceStore: JsonlTraceStore;
  private readonly artifactRoot: string;
  private readonly pausedSessions = new Set<string>();
  private readonly handoffs = new Map<string, HandoffState>();

  constructor(config: BrowserRuntimeConfig = {}) {
    this.artifactRoot = getArtifactRoot(config);
    this.driver = new PlaywrightSessionDriver(config);
    this.traceStore = new JsonlTraceStore({ artifactRoot: this.artifactRoot });
  }

  getTraceStore(): JsonlTraceStore {
    return this.traceStore;
  }

  getDriver(): PlaywrightSessionDriver {
    return this.driver;
  }

  getSession(sessionId: string): Session {
    return this.driver.getSession(sessionId);
  }

  listSessions(): Session[] {
    return this.driver.listSessions();
  }

  async createSession(request: CreateSessionRequest = {}): Promise<BrowserSessionHandle> {
    const handle = await this.driver.createSession(request);

    await this.traceStore.append(
      this.traceStore.createEvent(handle.session.id, "session.created", {
        session: {
          id: handle.session.id,
          browser: handle.session.browser,
          profile: handle.session.profile,
          isolation: handle.session.isolation,
          headless: handle.session.headless,
        },
        startUrl: request.startUrl,
      }),
    );

    return handle;
  }

  async observe(sessionId: string, request: ObserveRequest = {}): Promise<Observation> {
    const session = this.driver.getSession(sessionId);
    const tabId = session.activeTabId;
    if (!tabId) {
      throw this.sessionError("SESSION_NOT_FOUND", "Session has no active tab");
    }

    const page = this.driver.getActivePage(sessionId);
    const observation = await observePage(page, {
      sessionId,
      tabId,
      artifactRoot: this.artifactRoot,
      ...request,
    });

    await this.traceStore.append(
      this.traceStore.createEvent(
        sessionId,
        "observe.completed",
        {
          observationId: observation.id,
          page: {
            url: observation.page.url,
            title: observation.page.title,
            stable: observation.page.stable,
            loading: observation.page.loading,
          },
          elementCount: observation.elements.length,
          artifacts: observation.artifacts?.screenshotPath
            ? [
                {
                  id: createId(ID_PREFIXES.artifact),
                  type: "screenshot",
                  path: observation.artifacts.screenshotPath,
                  mimeType: "image/png",
                },
              ]
            : [],
        },
        tabId,
      ),
    );

    return observation;
  }

  async act(sessionId: string, action: AgentAction): Promise<ActionResult> {
    const session = this.driver.getSession(sessionId);
    if (this.pausedSessions.has(sessionId) || session.status === "paused") {
      return this.failedActionResult(sessionId, session.activeTabId ?? "tab_unknown", action, {
        code: "SESSION_PAUSED",
        message: "Session is paused for human handoff",
      });
    }

    const tabId = session.activeTabId;
    if (!tabId) {
      return this.failedActionResult(sessionId, "tab_unknown", action, {
        code: "SESSION_NOT_FOUND",
        message: "Session has no active tab",
      });
    }

    const page = this.driver.getActivePage(sessionId);
    const actionId = createId(ID_PREFIXES.action);
    const startedAt = Date.now();

    await this.traceStore.append(
      this.traceStore.createEvent(
        sessionId,
        "action.started",
        {
          actionId,
          action: redactActionForTrace(action),
        },
        tabId,
      ),
    );

    const router = new ActionRouter({ artifactRoot: this.artifactRoot });
    const outcome = await router.execute({ page, sessionId, tabId, action, actionId });
    const durationMs = Date.now() - startedAt;

    if (outcome.result.status === "success") {
      await this.traceStore.append(
        this.traceStore.createEvent(
          sessionId,
          "action.completed",
          this.buildActionTracePayload(actionId, action, outcome, durationMs),
          tabId,
        ),
      );
      return outcome.result;
    }

    await this.traceStore.append(
      this.traceStore.createEvent(
        sessionId,
        "action.failed",
        {
          ...this.buildActionTracePayload(actionId, action, outcome, durationMs),
          error: outcome.result.error,
          artifacts: outcome.result.artifacts ?? [],
        },
        tabId,
      ),
    );

    if (outcome.result.error) {
      await this.traceStore.append(
        this.traceStore.createEvent(
          sessionId,
          "error.raised",
          { error: outcome.result.error },
          tabId,
        ),
      );
    }

    return outcome.result;
  }

  async checkpoint(sessionId: string, label: string): Promise<Checkpoint> {
    const session = this.driver.getSession(sessionId);
    const tabId = session.activeTabId;
    const observation = await this.observe(sessionId, { includeScreenshot: true });

    const checkpoint: Checkpoint = {
      id: createId(ID_PREFIXES.checkpoint),
      sessionId,
      label,
      timestamp: observation.timestamp,
      observationId: observation.id,
      screenshotPath: observation.artifacts?.screenshotPath,
    };

    await this.traceStore.append(
      this.traceStore.createEvent(
        sessionId,
        "checkpoint.created",
        {
          checkpoint: {
            id: checkpoint.id,
            label: checkpoint.label,
            observationId: checkpoint.observationId,
            screenshotPath: checkpoint.screenshotPath,
          },
        },
        tabId,
      ),
    );

    return checkpoint;
  }

  async pauseForHuman(sessionId: string, request: HandoffRequest): Promise<HandoffState> {
    this.pausedSessions.add(sessionId);

    const handoff: HandoffState = {
      id: createId(ID_PREFIXES.handoff),
      sessionId,
      status: "paused",
      reason: request.reason,
      instructions: request.instructions,
      startedAt: new Date().toISOString(),
    };

    this.handoffs.set(sessionId, handoff);

    await this.traceStore.append(
      this.traceStore.createEvent(sessionId, "handoff.started", {
        handoff,
        riskLevel: request.riskLevel,
      }),
    );

    return handoff;
  }

  async resume(sessionId: string): Promise<ResumeHandoffResponse> {
    if (!this.driver.hasSession(sessionId)) {
      throw this.sessionError("SESSION_NOT_FOUND", `Session not found: ${sessionId}`);
    }

    const previous = this.handoffs.get(sessionId);
    if (!previous) {
      throw this.sessionError("SESSION_NOT_FOUND", `No handoff found for session: ${sessionId}`);
    }

    this.pausedSessions.delete(sessionId);
    const observation = await this.observe(sessionId);
    const session = this.driver.getSession(sessionId);
    const tabId = session.activeTabId;

    const handoff: HandoffState = {
      ...previous,
      status: "resumed",
      resumedAt: new Date().toISOString(),
    };
    this.handoffs.set(sessionId, handoff);

    await this.traceStore.append(
      this.traceStore.createEvent(
        sessionId,
        "handoff.resumed",
        {
          handoff,
          observationId: observation.id,
        },
        tabId,
      ),
    );

    return { handoff, observation };
  }

  async getTrace(sessionId: string): Promise<TraceEvent[]> {
    return this.traceStore.getTrace(sessionId);
  }

  async closeSession(sessionId: string): Promise<void> {
    this.pausedSessions.delete(sessionId);
    this.handoffs.delete(sessionId);
    await this.traceStore.append(
      this.traceStore.createEvent(sessionId, "session.closed", {
        reason: "user_requested",
      }),
    );
    await this.driver.closeSession(sessionId);
  }

  private buildActionTracePayload(
    actionId: string,
    action: AgentAction,
    outcome: ActionExecutionDetails,
    durationMs: number,
  ): Record<string, unknown> {
    return {
      actionId,
      action: redactActionForTrace(action),
      observationBeforeId: outcome.observationBefore.id,
      observationAfterId: outcome.observationAfter?.id,
      resolvedTarget: outcome.resolvedTarget ?? null,
      execution: outcome.execution,
      stability: outcome.stability,
      durationMs,
    };
  }

  private failedActionResult(
    sessionId: string,
    tabId: string,
    action: AgentAction,
    errorInput: { code: "SESSION_PAUSED" | "SESSION_NOT_FOUND"; message: string },
  ): ActionResult {
    const error = runtimeError({
      code: errorInput.code,
      message: errorInput.message,
    });

    return {
      id: createId(ID_PREFIXES.action),
      sessionId,
      tabId,
      status: "failed",
      action,
      error,
      timestamp: new Date().toISOString(),
    };
  }

  private sessionError(code: "SESSION_NOT_FOUND", message: string): Error {
    const error: RuntimeError = runtimeError({ code, message });
    return new Error(error.message);
  }
}
