# IMPLEMENTATION_BRIEF.md

# ActOS Runtime v0 — LLM Development Brief

> Purpose: turn the product PRD and technical roadmap into a coding-agent-ready execution brief.
>
> This document defines exactly what the LLM should build first, what it must not build yet, what interfaces must remain stable, and how the first version is accepted.

---

## 1. Product intent

ActOS Runtime v0 is a **local-first supervised Web Agent Runtime**.

It lets an AI agent:

1. create an isolated browser session;
2. observe a webpage semantically;
3. perform grounded actions from structured intent;
4. record every observation and action into a trace ledger;
5. pause for human handoff;
6. resume from the current browser state;
7. replay or inspect the execution afterward.

The v0 goal is not to create a fully autonomous consumer web agent. The v0 goal is to create the **execution substrate** that a web agent can safely use.

---

## 2. One-sentence v0 goal

> Build a local runtime that converts structured agent intent into verified browser actions, with trace, checkpoint, and human handoff by default.

---

## 3. Non-negotiable design principles

### 3.1 Intent, not raw control

The agent should say:

```ts
await session.act({
  type: "click",
  target: { role: "button", name: "Search" }
});
```

The agent should not usually say:

```ts
await mouse.click(812, 456);
```

Coordinates may exist only as an explicit fallback.

### 3.2 Runtime owns grounding

The runtime is responsible for:

- observing the page;
- resolving the target;
- checking visibility and enabled state;
- executing the action;
- waiting for page stability;
- observing the result;
- writing a trace step.

### 3.3 Every action creates evidence

Every `act()` call must produce:

- observation before;
- action intent;
- resolved target;
- low-level execution details;
- observation after;
- result or structured error;
- timestamped trace event.

### 3.4 Human handoff is a first-class primitive

The runtime must support:

- pause;
- human takeover;
- resume;
- trace of the takeover interval;
- re-observe after resume.

### 3.5 v0 is local-only

Do not implement:

- cloud deployment;
- billing;
- multi-tenant auth;
- enterprise SSO;
- workflow marketplace;
- distributed browser fleet;
- long-term memory service.

---

## 4. Fixed technical stack

Use this stack for v0:

```text
Language: TypeScript
Runtime: Node.js 20+
Package manager: pnpm
Browser automation: Playwright
Runtime server: Fastify
Schema validation: Zod
Storage v0: local JSONL files
Dashboard: Vite + React
Tests: Vitest + Playwright Test
Formatting: Prettier
Linting: ESLint
```

Do not switch stack unless explicitly instructed.

---

## 5. Repository structure

Create this monorepo:

```text
actos/
  README.md
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json

  packages/
    core/
      src/
        ids.ts
        schemas.ts
        session.ts
        observation.ts
        action.ts
        trace.ts
        checkpoint.ts
        handoff.ts
        errors.ts
        index.ts
      tests/

    browser-playwright/
      src/
        playwrightDriver.ts
        observe.ts
        snapshot.ts
        locator.ts
        stability.ts
        downloads.ts
        screenshots.ts
        index.ts
      tests/

    runtime-server/
      src/
        server.ts
        runtime.ts
        storage/
          jsonlTraceStore.ts
        routes/
          sessions.ts
          observe.ts
          act.ts
          trace.ts
          handoff.ts
          artifacts.ts
        index.ts
      tests/

    sdk/
      src/
        client.ts
        types.ts
        index.ts
      tests/

    dashboard/
      src/
        main.tsx
        App.tsx
        api.ts
        components/
          SessionList.tsx
          BrowserPreview.tsx
          ObservationPanel.tsx
          Timeline.tsx
          ActionPanel.tsx
          HandoffPanel.tsx
      index.html
      package.json

  examples/
    mock-admin/
      package.json
      src/
        server.ts
        app.tsx
      public/
      scripts/
        run-demo.ts

  tests/
    e2e/
      mock-admin.spec.ts

  docs/
    architecture.md
    api.md
    trace-format.md
    safety.md
```

---

## 6. v0 package responsibilities

### `packages/core`

Owns stable contracts:

- IDs;
- Zod schemas;
- TypeScript types;
- action model;
- observation model;
- trace model;
- error model;
- safety/risk primitives.

No Playwright imports are allowed in `core`.

### `packages/browser-playwright`

Owns browser execution:

- browser lifecycle;
- sessions;
- tabs;
- screenshots;
- semantic observation;
- target resolution;
- page stability;
- action execution.

This package may depend on `core` and `playwright`.

### `packages/runtime-server`

Owns local runtime API:

- Fastify server;
- route handlers;
- runtime registry;
- trace storage;
- artifact serving;
- pause/resume state.

### `packages/sdk`

Owns developer-facing client:

- `ActOSClient`;
- session wrapper;
- typed API methods.

### `packages/dashboard`

Owns local dev UI:

- sessions list;
- screenshot preview;
- observation JSON;
- trace timeline;
- pause/resume controls.

### `examples/mock-admin`

Owns demo target site:

- login screen;
- order search;
- table;
- export button;
- modal;
- toast;
- loading state.

---

## 7. Core APIs to implement first

### 7.1 Create session

```ts
const session = await client.createSession({
  startUrl: "http://localhost:3001",
  headless: false,
  isolation: "strict",
  profile: "default"
});
```

### 7.2 Observe

```ts
const observation = await session.observe({
  includeScreenshot: true,
  includeRawSnapshot: false
});
```

### 7.3 Act

```ts
const result = await session.act({
  type: "click",
  target: {
    role: "button",
    name: "Search"
  }
});
```

### 7.4 Checkpoint

```ts
await session.checkpoint("after-search");
```

### 7.5 Human handoff

```ts
await session.pauseForHuman({
  reason: "Login or 2FA required"
});

await session.resume();
```

### 7.6 Trace

```ts
const trace = await session.getTrace();
```

---

## 8. P0 action types

Implement these action types first:

```ts
type AgentAction =
  | { type: "navigate"; url: string }
  | { type: "click"; target: ActionTarget }
  | { type: "fill"; target: ActionTarget; value: string }
  | { type: "press"; target?: ActionTarget; key: string }
  | { type: "select"; target: ActionTarget; value: string | string[] }
  | { type: "scroll"; direction: "up" | "down"; amount?: "small" | "medium" | "large" }
  | { type: "wait"; ms?: number; until?: WaitCondition };
```

P0 target methods:

```ts
type ActionTarget = {
  role?: string;
  name?: string;
  text?: string;
  label?: string;
  placeholder?: string;
  testId?: string;
  selector?: string;
  elementId?: string;
  coordinates?: { x: number; y: number; reason: string };
};
```

Coordinate fallback must require an explicit `reason`.

---

## 9. P0 observation requirements

`observe()` must return at least:

```ts
type Observation = {
  id: string;
  sessionId: string;
  tabId: string;
  timestamp: string;
  page: {
    url: string;
    title: string;
    stable: boolean;
    loading: boolean;
    viewport: { width: number; height: number };
  };
  elements: ObservedElement[];
  warnings: ObservationWarning[];
  artifacts?: {
    screenshotPath?: string;
  };
};
```

Each element:

```ts
type ObservedElement = {
  id: string;
  role: string;
  name?: string;
  text?: string;
  bbox?: { x: number; y: number; width: number; height: number };
  visible: boolean;
  enabled: boolean;
  checked?: boolean;
  selected?: boolean;
  value?: string;
  locatorHints: {
    role?: string;
    name?: string;
    text?: string;
    label?: string;
    placeholder?: string;
    testId?: string;
    selector?: string;
  };
  confidence: number;
};
```

---

## 10. P0 trace requirements

Every runtime operation must append one JSONL event.

Minimum trace event types:

```text
session.created
session.closed
tab.created
tab.selected
observe.completed
action.started
action.completed
action.failed
checkpoint.created
handoff.started
handoff.resumed
artifact.created
error.raised
```

Each action step must include:

- action intent;
- observation before id;
- resolved target;
- execution result;
- observation after id;
- error if failed;
- artifacts if any.

---

## 11. P0 dashboard requirements

Dashboard is for developers, not end users.

Must show:

1. session list;
2. current session status;
3. latest screenshot;
4. latest observation JSON;
5. trace timeline;
6. pause/resume buttons;
7. manual checkpoint button;
8. simple action form for testing `click`, `fill`, `navigate`.

Do not overbuild design.

---

## 12. Mock admin demo workflow

Create a local mock admin web app with:

1. login page;
2. orders page;
3. order status filter;
4. order search input;
5. order table;
6. export CSV button;
7. loading state;
8. toast;
9. confirmation modal.

Demo script should:

```text
1. create browser session
2. open mock admin
3. fill email/password
4. click login
5. search order "ORD-1001"
6. click export
7. observe toast or downloaded artifact
8. create checkpoint
9. print trace summary
```

---

## 13. Definition of done

The v0 implementation is complete only when:

```text
pnpm install works
pnpm build works
pnpm test works
mock-admin starts locally
demo script completes the workflow
trace JSONL is written to disk
dashboard displays session + screenshot + observation + timeline
pause/resume works manually
README explains setup and demo
API docs match implemented methods
```

---

## 14. What not to build in v0

Do not build:

- multi-tenant accounts;
- cloud browser fleet;
- hosted deployment;
- billing;
- OAuth app integrations;
- browser extension;
- complex visual recognition;
- marketplace;
- long-term workflow memory;
- prompt-based planner;
- automatic payment or irreversible actions;
- CAPTCHA bypass.

---

## 15. Recommended coding-agent sequence

Do not ask the LLM to build all of v0 in one pass. Use this sequence:

```text
Pass 1: monorepo + core types + schemas + tests
Pass 2: Playwright driver + observe
Pass 3: action router + trace ledger
Pass 4: runtime server + SDK
Pass 5: dashboard + handoff
Pass 6: mock-admin + demo + docs cleanup
```

Each pass must end with tests and a working build.

---

## 16. Initial coding-agent prompt

Use this as the first prompt to an implementation LLM:

```text
You are implementing ActOS Runtime v0.

ActOS is a local-first supervised Web Agent Runtime. It lets an AI agent create a browser session, observe a webpage semantically, perform grounded actions from structured intent, record every step into a trace ledger, pause for human handoff, and resume from the current browser state.

Build only the local developer MVP. Do not implement cloud, billing, OAuth, multi-tenant enterprise, marketplace, long-term memory, or browser fleet.

Use TypeScript, Node.js 20+, pnpm workspace, Playwright, Fastify, Zod, Vitest, Vite + React, and local JSONL storage.

Start with:
1. monorepo structure;
2. packages/core with Zod schemas and TypeScript types;
3. tests proving schemas parse example Session, Observation, AgentAction, TraceStep, and RuntimeError objects.

Definition of done for this first pass:
- pnpm install works;
- pnpm build works;
- pnpm test works;
- no Playwright dependency inside packages/core;
- README has local setup instructions.
```
