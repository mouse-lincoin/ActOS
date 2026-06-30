# API_SPEC.md

# ActOS Runtime v0 API Specification

> This file defines the public API contract for the local ActOS Runtime v0.
>
> Keep this spec stable. Implementation details may change, but these contracts should not drift casually.

---

## 1. API surfaces

ActOS v0 exposes two equivalent surfaces:

1. TypeScript SDK;
2. local REST API.

The SDK wraps the REST API.

---

## 2. TypeScript SDK overview

```ts
import { ActOSClient } from "@actos/sdk";

const client = new ActOSClient({
  baseUrl: "http://localhost:8787"
});

const session = await client.createSession({
  startUrl: "http://localhost:3001",
  headless: false,
  isolation: "strict"
});

await session.act({
  type: "fill",
  target: { label: "Email" },
  value: "demo@example.com"
});

await session.act({
  type: "click",
  target: { role: "button", name: "Login" }
});

const trace = await session.getTrace();
```

---

## 3. Core schemas

## 3.1 ID conventions

IDs are opaque strings.

Suggested prefixes:

```text
ses_  session
obs_  observation
elm_  observed element
tab_  browser tab
act_  action step
trc_  trace event
art_  artifact
chk_  checkpoint
hnd_  handoff
err_  error
```

---

## 3.2 Session

```ts
type BrowserName = "chromium" | "firefox" | "webkit";
type SessionStatus = "active" | "paused" | "closed" | "failed";
type IsolationMode = "strict" | "shared";

type Session = {
  id: string;
  status: SessionStatus;
  browser: BrowserName;
  profile: string;
  isolation: IsolationMode;
  headless: boolean;
  createdAt: string;
  updatedAt: string;
  activeTabId?: string;
};
```

### Create session request

```ts
type CreateSessionRequest = {
  startUrl?: string;
  browser?: BrowserName;
  headless?: boolean;
  profile?: string;
  isolation?: IsolationMode;
  viewport?: {
    width: number;
    height: number;
  };
};
```

### Create session response

```ts
type CreateSessionResponse = {
  session: Session;
};
```

---

## 3.3 Browser tab

```ts
type BrowserTab = {
  id: string;
  sessionId: string;
  url: string;
  title: string;
  active: boolean;
};
```

---

## 3.4 Observation

```ts
type Observation = {
  id: string;
  schemaVersion: "0.1";
  sessionId: string;
  tabId: string;
  timestamp: string;
  page: ObservedPage;
  elements: ObservedElement[];
  warnings: ObservationWarning[];
  artifacts?: ObservationArtifacts;
  raw?: {
    accessibilitySnapshot?: unknown;
  };
};
```

```ts
type ObservedPage = {
  url: string;
  title: string;
  stable: boolean;
  loading: boolean;
  viewport: {
    width: number;
    height: number;
  };
};
```

```ts
type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};
```

```ts
type ObservedElement = {
  id: string;
  role: string;
  name?: string;
  text?: string;
  bbox?: BoundingBox;
  visible: boolean;
  enabled: boolean;
  checked?: boolean;
  selected?: boolean;
  value?: string;
  locatorHints: LocatorHints;
  confidence: number;
};
```

```ts
type LocatorHints = {
  role?: string;
  name?: string;
  text?: string;
  label?: string;
  placeholder?: string;
  testId?: string;
  selector?: string;
};
```

```ts
type ObservationWarning = {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  details?: Record<string, unknown>;
};
```

```ts
type ObservationArtifacts = {
  screenshotPath?: string;
  snapshotPath?: string;
};
```

### Observe request

```ts
type ObserveRequest = {
  includeScreenshot?: boolean;
  includeRawSnapshot?: boolean;
  maxElements?: number;
};
```

### Observe response

```ts
type ObserveResponse = {
  observation: Observation;
};
```

---

## 3.5 Action target

```ts
type ActionTarget = {
  elementId?: string;
  role?: string;
  name?: string;
  text?: string;
  label?: string;
  placeholder?: string;
  testId?: string;
  selector?: string;
  coordinates?: {
    x: number;
    y: number;
    reason: string;
  };
};
```

Rules:

- `coordinates` must include a non-empty reason.
- If `selector` is used, trace must mark `target.method = "selector"`.
- If `elementId` is used, runtime should still refresh observation if the page may have changed.

---

## 3.6 Agent action

```ts
type AgentAction =
  | NavigateAction
  | ClickAction
  | FillAction
  | PressAction
  | SelectAction
  | ScrollAction
  | WaitAction;
```

```ts
type NavigateAction = {
  type: "navigate";
  url: string;
};
```

```ts
type ClickAction = {
  type: "click";
  target: ActionTarget;
};
```

```ts
type FillAction = {
  type: "fill";
  target: ActionTarget;
  value: string;
  secret?: boolean;
};
```

```ts
type PressAction = {
  type: "press";
  target?: ActionTarget;
  key: string;
};
```

```ts
type SelectAction = {
  type: "select";
  target: ActionTarget;
  value: string | string[];
};
```

```ts
type ScrollAction = {
  type: "scroll";
  direction: "up" | "down";
  amount?: "small" | "medium" | "large";
};
```

```ts
type WaitAction = {
  type: "wait";
  ms?: number;
  until?: WaitCondition;
};
```

```ts
type WaitCondition =
  | { type: "pageStable" }
  | { type: "textVisible"; text: string }
  | { type: "urlContains"; value: string };
```

---

## 3.7 Resolved target

```ts
type ResolvedTarget = {
  method:
    | "elementId"
    | "testId"
    | "roleName"
    | "label"
    | "placeholder"
    | "text"
    | "selector"
    | "coordinates";
  confidence: number;
  locatorDescription: string;
  bbox?: BoundingBox;
  element?: ObservedElement;
};
```

---

## 3.8 Action result

```ts
type ActionResult = {
  id: string;
  sessionId: string;
  tabId: string;
  status: "success" | "failed" | "needs_human";
  action: AgentAction;
  observationBeforeId?: string;
  observationAfterId?: string;
  resolvedTarget?: ResolvedTarget;
  error?: RuntimeError;
  artifacts?: RuntimeArtifact[];
  timestamp: string;
};
```

---

## 3.9 Runtime error

```ts
type RuntimeError = {
  id: string;
  code: string;
  message: string;
  category:
    | "session"
    | "browser"
    | "observation"
    | "targeting"
    | "action"
    | "stability"
    | "policy"
    | "handoff"
    | "trace"
    | "unknown";
  recoverable: boolean;
  details?: Record<string, unknown>;
};
```

Common error codes:

```text
SESSION_NOT_FOUND
SESSION_PAUSED
BROWSER_LAUNCH_FAILED
NAVIGATION_FAILED
OBSERVATION_FAILED
TARGET_NOT_FOUND
TARGET_AMBIGUOUS
ELEMENT_NOT_VISIBLE
ELEMENT_DISABLED
ACTION_TIMEOUT
STABILITY_TIMEOUT
POLICY_DENIED
HUMAN_HANDOFF_REQUIRED
TRACE_WRITE_FAILED
UNKNOWN_RUNTIME_ERROR
```

---

## 3.10 Checkpoint

```ts
type Checkpoint = {
  id: string;
  sessionId: string;
  label: string;
  timestamp: string;
  observationId?: string;
  screenshotPath?: string;
};
```

---

## 3.11 Handoff

```ts
type HandoffRequest = {
  reason: string;
  instructions?: string;
  riskLevel?: RiskLevel;
};
```

```ts
type HandoffState = {
  id: string;
  sessionId: string;
  status: "requested" | "paused" | "resumed" | "cancelled";
  reason: string;
  instructions?: string;
  startedAt: string;
  resumedAt?: string;
};
```

---

## 4. REST API

Base URL:

```text
http://localhost:8787
```

---

## 4.1 Sessions

### Create session

```http
POST /sessions
Content-Type: application/json
```

Request:

```json
{
  "startUrl": "http://localhost:3001",
  "browser": "chromium",
  "headless": false,
  "profile": "default",
  "isolation": "strict",
  "viewport": { "width": 1280, "height": 900 }
}
```

Response:

```json
{
  "session": {
    "id": "ses_abc123",
    "status": "active",
    "browser": "chromium",
    "profile": "default",
    "isolation": "strict",
    "headless": false,
    "createdAt": "2026-06-30T00:00:00.000Z",
    "updatedAt": "2026-06-30T00:00:00.000Z",
    "activeTabId": "tab_abc123"
  }
}
```

### List sessions

```http
GET /sessions
```

### Get session

```http
GET /sessions/:sessionId
```

### Close session

```http
DELETE /sessions/:sessionId
```

---

## 4.2 Observe

```http
POST /sessions/:sessionId/observe
Content-Type: application/json
```

Request:

```json
{
  "includeScreenshot": true,
  "includeRawSnapshot": false,
  "maxElements": 200
}
```

Response:

```json
{
  "observation": {
    "id": "obs_abc123",
    "schemaVersion": "0.1",
    "sessionId": "ses_abc123",
    "tabId": "tab_abc123",
    "timestamp": "2026-06-30T00:00:01.000Z",
    "page": {
      "url": "http://localhost:3001/orders",
      "title": "Mock Admin",
      "stable": true,
      "loading": false,
      "viewport": { "width": 1280, "height": 900 }
    },
    "elements": [],
    "warnings": [],
    "artifacts": {
      "screenshotPath": ".actos/artifacts/ses_abc123/screenshots/obs_abc123.png"
    }
  }
}
```

---

## 4.3 Act

```http
POST /sessions/:sessionId/act
Content-Type: application/json
```

Request:

```json
{
  "action": {
    "type": "click",
    "target": {
      "role": "button",
      "name": "Search"
    }
  }
}
```

Response:

```json
{
  "result": {
    "id": "act_abc123",
    "sessionId": "ses_abc123",
    "tabId": "tab_abc123",
    "status": "success",
    "action": {
      "type": "click",
      "target": {
        "role": "button",
        "name": "Search"
      }
    },
    "observationBeforeId": "obs_before",
    "observationAfterId": "obs_after",
    "resolvedTarget": {
      "method": "roleName",
      "confidence": 0.95,
      "locatorDescription": "getByRole(button, { name: Search })"
    },
    "timestamp": "2026-06-30T00:00:02.000Z"
  }
}
```

---

## 4.4 Checkpoints

```http
POST /sessions/:sessionId/checkpoints
Content-Type: application/json
```

Request:

```json
{
  "label": "after-search"
}
```

Response:

```json
{
  "checkpoint": {
    "id": "chk_abc123",
    "sessionId": "ses_abc123",
    "label": "after-search",
    "timestamp": "2026-06-30T00:00:03.000Z",
    "observationId": "obs_abc123"
  }
}
```

---

## 4.5 Handoff

### Pause for human

```http
POST /sessions/:sessionId/handoff/pause
Content-Type: application/json
```

Request:

```json
{
  "reason": "2FA required",
  "instructions": "Please complete login in the browser window, then click Resume."
}
```

Response:

```json
{
  "handoff": {
    "id": "hnd_abc123",
    "sessionId": "ses_abc123",
    "status": "paused",
    "reason": "2FA required",
    "instructions": "Please complete login in the browser window, then click Resume.",
    "startedAt": "2026-06-30T00:00:04.000Z"
  }
}
```

### Resume

```http
POST /sessions/:sessionId/handoff/resume
```

Response:

```json
{
  "handoff": {
    "id": "hnd_abc123",
    "sessionId": "ses_abc123",
    "status": "resumed",
    "reason": "2FA required",
    "startedAt": "2026-06-30T00:00:04.000Z",
    "resumedAt": "2026-06-30T00:00:30.000Z"
  },
  "observation": {
    "id": "obs_after_resume"
  }
}
```

---

## 4.6 Trace

### Get trace

```http
GET /sessions/:sessionId/trace
```

Response:

```json
{
  "events": []
}
```

---

## 4.7 Artifacts

### Get artifact

```http
GET /sessions/:sessionId/artifacts/:artifactId
```

May return image/file content or signed local path depending on implementation.

---

## 5. SDK interface

```ts
class ActOSClient {
  constructor(options: { baseUrl: string });

  createSession(request: CreateSessionRequest): Promise<ActOSSession>;
  listSessions(): Promise<Session[]>;
  getSession(sessionId: string): Promise<Session>;
  closeSession(sessionId: string): Promise<void>;
}
```

```ts
class ActOSSession {
  readonly id: string;

  observe(request?: ObserveRequest): Promise<Observation>;
  act(action: AgentAction): Promise<ActionResult>;
  checkpoint(label: string): Promise<Checkpoint>;
  pauseForHuman(request: HandoffRequest): Promise<HandoffState>;
  resume(): Promise<{ handoff: HandoffState; observation: Observation }>;
  getTrace(): Promise<TraceEvent[]>;
  close(): Promise<void>;
}
```

---

## 6. API behavior rules

1. `act()` must automatically observe before and after action.
2. `act()` must append trace events even on failure.
3. `act()` must return structured errors instead of throwing raw implementation errors through the REST API.
4. `observe()` should be safe to call repeatedly.
5. `pauseForHuman()` prevents agent actions until resume.
6. `resume()` must call observe and attach that observation to the handoff resume event.
7. Session close must close browser resources.
8. Secret values should be redacted in trace if `secret: true`.

---

## 7. Versioning

All major schemas include:

```ts
schemaVersion: "0.1"
```

Breaking changes require bumping schema version.
