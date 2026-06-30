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
  Session,
  TraceEvent,
} from "@actos/core";
import type { BrowserRuntime, BrowserSessionHandle } from "@actos/browser-playwright";

/** Runtime surface used by the HTTP server. */
export type ActOSRuntimeService = {
  createSession(request?: CreateSessionRequest): Promise<BrowserSessionHandle>;
  listSessions(): Session[];
  getSession(sessionId: string): Session;
  closeSession(sessionId: string): Promise<void>;
  observe(sessionId: string, request?: ObserveRequest): Promise<Observation>;
  act(sessionId: string, action: AgentAction): Promise<ActionResult>;
  checkpoint(sessionId: string, label: string): Promise<Checkpoint>;
  pauseForHuman(sessionId: string, request: HandoffRequest): Promise<HandoffState>;
  resume(sessionId: string): Promise<ResumeHandoffResponse>;
  getTrace(sessionId: string): Promise<TraceEvent[]>;
  hasSession(sessionId: string): boolean;
};

export function asRuntimeService(runtime: BrowserRuntime): ActOSRuntimeService {
  return {
    createSession: (request) => runtime.createSession(request),
    listSessions: () => runtime.listSessions(),
    getSession: (sessionId) => runtime.getSession(sessionId),
    closeSession: (sessionId) => runtime.closeSession(sessionId),
    observe: (sessionId, request) => runtime.observe(sessionId, request),
    act: (sessionId, action) => runtime.act(sessionId, action),
    checkpoint: (sessionId, label) => runtime.checkpoint(sessionId, label),
    pauseForHuman: (sessionId, request) => runtime.pauseForHuman(sessionId, request),
    resume: (sessionId) => runtime.resume(sessionId),
    getTrace: (sessionId) => runtime.getTrace(sessionId),
    hasSession: (sessionId) => runtime.getDriver().hasSession(sessionId),
  };
}

export function assertSessionExists(runtime: ActOSRuntimeService, sessionId: string): void {
  if (!runtime.hasSession(sessionId)) {
    throw new Error(`Session not found: ${sessionId}`);
  }
}
