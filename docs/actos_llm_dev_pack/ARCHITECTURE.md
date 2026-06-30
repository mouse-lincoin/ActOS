# ARCHITECTURE.md

# ActOS Runtime Architecture

> ActOS is a runtime layer for agents that do digital work through real web software.
>
> The architecture separates planning from execution, intent from grounding, and browser automation from trust and audit.

---

## 1. Architectural thesis

The core mistake in many Web Agent prototypes is connecting an LLM directly to a browser.

```text
LLM -> Browser
```

ActOS uses a safer and more durable architecture:

```text
LLM -> Structured Intent -> Runtime -> Grounded Action -> Verified State -> Trace
```

The runtime, not the model, owns:

- grounding;
- retries;
- page stability;
- verification;
- risk gates;
- trace;
- handoff;
- replay.

---

## 2. System overview

```text
Natural Language Goal
        |
        v
Agent / Planner
        |
        v
Structured Runtime Intent
        |
        v
ActOS Runtime
  +-----------------------------+
  | Control Plane               |
  | - Mission Orchestrator      |
  | - Policy Engine             |
  | - Profile Manager           |
  | - Human Approval System     |
  +-----------------------------+
  | Data Plane                  |
  | - Browser Session Runtime   |
  | - Observe Layer             |
  | - Action Router             |
  | - Stability Detector        |
  | - State Ledger              |
  | - Trace Store               |
  | - Artifact Store            |
  +-----------------------------+
        |
        v
Execution Adapters
  - Playwright / CDP
  - Playwright MCP bridge
  - Browser extension bridge
  - Computer-use fallback
  - API adapters
        |
        v
Websites / SaaS / Portals / Internal Tools
```

v0 implements the local data plane and a minimal local control plane.

---

## 3. v0 scope versus future scope

| Area | v0 | Future |
|---|---|---|
| Runtime | local single-node | distributed runtime |
| Browser | local Playwright | cloud/VPC browser fleet |
| Storage | local JSONL | database + object store |
| Policy | basic risk gates | enterprise policy DSL |
| Handoff | local pause/resume | approval workflows, mobile approvals |
| Auth | profile directory | identity vault, RBAC, SSO |
| Memory | per-session trace | site memory, workflow memory |
| UI | developer dashboard | operations console |
| API | REST + TS SDK | MCP server, agent-framework adapters |

---

## 4. Main runtime concepts

### 4.1 Mission

A mission is a user goal represented as an executable runtime container.

In v0, mission can be implicit. In future versions, it becomes first-class.

```ts
type Mission = {
  id: string;
  goal: string;
  status: "pending" | "running" | "paused" | "completed" | "failed";
  constraints?: MissionConstraints;
};
```

### 4.2 Session

A browser session is the execution container.

```ts
type Session = {
  id: string;
  status: "active" | "paused" | "closed" | "failed";
  browser: "chromium" | "firefox" | "webkit";
  profile: string;
  isolation: "strict" | "shared";
  createdAt: string;
  updatedAt: string;
};
```

### 4.3 Tab

A tab is a page inside a session.

```ts
type BrowserTab = {
  id: string;
  sessionId: string;
  url: string;
  title: string;
  active: boolean;
};
```

### 4.4 Observation

An observation is the runtime's semantic view of the current page.

It is not raw DOM. It is an agent-facing page state.

### 4.5 Action

An action is structured intent.

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

### 4.6 Trace

Trace is the durable event log of runtime execution.

Trace must be sufficient to answer:

- What did the agent see?
- What did it decide to do?
- What did the runtime actually execute?
- What changed after execution?
- Did a human intervene?
- Why did the task fail?

---

## 5. Component design

## 5.1 Browser Session Runtime

Responsibilities:

- launch browser;
- create page;
- manage tabs;
- manage session status;
- hold Playwright objects;
- close resources safely;
- support pause/resume state.

v0 implementation:

```text
SessionRegistry
  sessionId -> BrowserSession

BrowserSession
  - browser
  - context
  - pages
  - activePage
  - status
```

Important rules:

- one runtime session maps to one Playwright browser context;
- do not share context across unrelated sessions;
- always close contexts on session close;
- store artifacts under `./.actos/artifacts/{sessionId}`.

---

## 5.2 Observe Layer

Responsibilities:

- read page URL and title;
- check loading/stability;
- extract actionable elements;
- capture screenshot if requested;
- return a normalized `Observation` object;
- write observation artifacts.

Input:

```ts
observe(sessionId, options)
```

Output:

```ts
Observation
```

Extraction strategy v0:

1. query common interactive roles and elements;
2. collect accessible names where possible;
3. collect text/label/placeholder/test id;
4. collect bounding boxes;
5. collect visible/enabled state;
6. generate runtime element ids.

Element sources:

```text
button
input
textarea
select
a[href]
[role]
[data-testid]
[aria-label]
[label]
```

The v0 observe layer should be deterministic and simple. Do not attempt full visual scene understanding yet.

---

## 5.3 Action Router

Responsibilities:

- validate action schema;
- perform fresh observation before action;
- resolve target;
- run risk check;
- execute low-level Playwright operation;
- wait for stability;
- observe after action;
- return structured result;
- write trace.

Flow:

```text
act(action)
  -> trace action.started
  -> observe before
  -> resolve target
  -> policy check
  -> execute
  -> wait for stability
  -> observe after
  -> trace action.completed or action.failed
  -> return ActionResult
```

---

## 5.4 Target Resolver

Target resolution should try multiple signals in order.

Resolution order v0:

1. `elementId` from latest observation;
2. `testId`;
3. role + name;
4. label;
5. placeholder;
6. exact text;
7. selector;
8. coordinates fallback.

Each resolution should return:

```ts
type ResolvedTarget = {
  method: "elementId" | "testId" | "roleName" | "label" | "placeholder" | "text" | "selector" | "coordinates";
  confidence: number;
  locatorDescription: string;
  bbox?: BoundingBox;
  elementSnapshot?: ObservedElement;
};
```

If multiple elements match, return `AmbiguousTargetError` unless a safe disambiguation is available.

---

## 5.5 Stability Detector

v0 stability can be heuristic.

Signals:

- `document.readyState === "complete"`;
- Playwright `waitForLoadState("domcontentloaded")`;
- optional `networkidle` with timeout;
- DOM size not changing across a short interval;
- no visible common loading indicators if detectable.

Suggested v0 defaults:

```ts
const STABILITY_DEFAULTS = {
  timeoutMs: 5000,
  domQuietWindowMs: 300,
  networkIdleTimeoutMs: 1000
};
```

Do not block indefinitely. Stability timeout should produce structured errors.

---

## 5.6 Trace Store

v0 storage:

```text
.actos/
  traces/
    {sessionId}.jsonl
  artifacts/
    {sessionId}/
      screenshots/
      downloads/
      snapshots/
```

Rules:

- append-only;
- JSONL format;
- no silent trace failures;
- trace writes should include schema version;
- artifact paths should be relative to the `.actos` directory.

---

## 5.7 Human Handoff

State machine:

```text
active -> handoff_requested -> paused_for_human -> active
active -> handoff_requested -> closed
```

During pause:

- runtime should not run agent actions;
- user may manually operate the browser;
- trace records start time and reason;
- resume triggers fresh observation;
- trace records human handoff end.

---

## 5.8 Runtime Server

Fastify local server routes:

```text
POST   /sessions
GET    /sessions
GET    /sessions/:id
DELETE /sessions/:id
POST   /sessions/:id/observe
POST   /sessions/:id/act
POST   /sessions/:id/checkpoints
POST   /sessions/:id/handoff/pause
POST   /sessions/:id/handoff/resume
GET    /sessions/:id/trace
GET    /sessions/:id/artifacts/:artifactId
```

---

## 6. Important flows

## 6.1 Create session flow

```text
Client -> Runtime Server -> Session Registry -> Playwright Driver
       <- Session object
       -> Trace: session.created
```

## 6.2 Observe flow

```text
Client -> Runtime Server -> Observe Layer -> Browser Page
       <- Observation + artifacts
       -> Trace: observe.completed
```

## 6.3 Act flow

```text
Client -> Runtime Server
       -> trace action.started
       -> observe before
       -> target resolver
       -> risk gate
       -> Playwright execution
       -> stability detector
       -> observe after
       -> trace action.completed
       <- ActionResult
```

## 6.4 Failed action flow

```text
Action requested
  -> target resolution fails / execution fails / verification fails
  -> structured RuntimeError
  -> trace action.failed
  -> optional screenshot artifact
  -> return failure result
```

## 6.5 Handoff flow

```text
Agent requests pause
  -> runtime status = paused
  -> trace handoff.started
  -> human operates browser
  -> human clicks resume
  -> runtime status = active
  -> observe current page
  -> trace handoff.resumed
```

---

## 7. Error taxonomy

P0 errors:

```text
SessionNotFoundError
SessionPausedError
BrowserLaunchError
NavigationError
ObservationError
TargetNotFoundError
AmbiguousTargetError
ElementNotVisibleError
ElementDisabledError
ActionTimeoutError
StabilityTimeoutError
PolicyDeniedError
HandoffRequiredError
TraceWriteError
UnknownRuntimeError
```

All errors must be structured:

```ts
type RuntimeError = {
  code: string;
  message: string;
  category: "session" | "browser" | "observation" | "action" | "policy" | "trace" | "unknown";
  recoverable: boolean;
  details?: Record<string, unknown>;
};
```

---

## 8. Security posture v0

v0 is local-only but still needs basic safety:

- deny high-risk actions by default unless explicitly allowed;
- never log raw secrets intentionally;
- mark password fields as secret values;
- require explicit coordinate fallback reason;
- isolate session profiles by default;
- avoid automatic file uploads unless explicitly provided;
- never bypass CAPTCHA;
- trace user approvals for risky actions.

---

## 9. Future architecture expansion

After v0, the architecture can expand to:

```text
Policy Engine
  -> enterprise rules
  -> approval workflows
  -> risk scoring

Workflow Memory
  -> site adapters
  -> reusable workflows
  -> page object models

Browser Fleet
  -> distributed workers
  -> profile leasing
  -> concurrency limits

Agent API Layer
  -> MCP server
  -> LangGraph adapter
  -> OpenAI/Anthropic tool adapters
```

But none of these should be implemented before v0 is stable.
