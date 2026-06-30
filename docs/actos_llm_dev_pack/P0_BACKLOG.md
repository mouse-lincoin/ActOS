# P0_BACKLOG.md

# ActOS Runtime v0 P0 Backlog

> This backlog is ordered for coding-agent execution.
>
> Each task includes scope, acceptance criteria, and tests. Do not skip acceptance criteria.

---

## Milestone overview

```text
M0 Repo foundation
M1 Core contracts
M2 Browser driver + observe
M3 Action router + trace
M4 Runtime server + SDK
M5 Handoff + dashboard
M6 Mock-admin demo + docs
```

---

# M0 — Repo foundation

## P0-001 Initialize monorepo

### Goal

Create the pnpm monorepo structure for ActOS Runtime v0.

### Scope

- root `package.json`;
- `pnpm-workspace.yaml`;
- `tsconfig.base.json`;
- workspace packages;
- ESLint/Prettier baseline;
- Vitest baseline.

### Acceptance criteria

```text
pnpm install succeeds
pnpm build succeeds
pnpm test succeeds
all packages compile empty stubs
README has local dev commands
```

### Tests

- one placeholder test in `packages/core`;
- CI-style script: `pnpm test`.

---

## P0-002 Add root developer scripts

### Goal

Make the repo easy for a coding agent and human developer to run.

### Scope

Root scripts:

```json
{
  "dev": "pnpm -r --parallel dev",
  "build": "pnpm -r build",
  "test": "pnpm -r test",
  "lint": "pnpm -r lint",
  "format": "prettier --write ."
}
```

### Acceptance criteria

```text
pnpm build runs all package builds
pnpm test runs all package tests
pnpm lint runs without fatal config errors
```

---

# M1 — Core contracts

## P0-003 Implement core IDs and schema utilities

### Goal

Create stable ID helpers and schema conventions.

### Scope

- ID prefixes;
- `createId(prefix)` utility;
- timestamp helper;
- schema version constant.

### Acceptance criteria

```text
ID helper generates prefixed IDs
schema version is exported
unit tests cover ID prefix behavior
```

---

## P0-004 Implement core Zod schemas

### Goal

Define runtime contracts in `packages/core`.

### Scope

Schemas for:

- Session;
- BrowserTab;
- Observation;
- ObservedElement;
- AgentAction;
- ActionTarget;
- ActionResult;
- ResolvedTarget;
- RuntimeError;
- TraceEvent;
- Checkpoint;
- HandoffRequest;
- HandoffState;
- RuntimeArtifact.

### Acceptance criteria

```text
all schemas are exported from @actos/core
TypeScript types are inferred from Zod schemas
example objects parse successfully
invalid objects fail tests
no Playwright dependency in core
```

### Tests

- parse valid Session;
- parse valid Observation;
- parse all P0 action types;
- parse RuntimeError;
- parse TraceEvent;
- reject coordinate target without reason.

---

## P0-005 Implement error model

### Goal

Create structured runtime errors.

### Scope

- error code enum;
- error category enum;
- helper `runtimeError()`;
- helper `isRecoverableError()`.

### Acceptance criteria

```text
all runtime errors have code, message, category, recoverable
raw Error can be converted into UnknownRuntimeError
```

---

# M2 — Browser driver + observe

## P0-006 Implement Playwright session driver

### Goal

Create, manage, and close local browser sessions.

### Scope

- launch browser;
- create context;
- create page;
- navigate to start URL;
- close session;
- list tabs;
- create tab;
- select tab;
- get active page.

### Acceptance criteria

```text
createSession opens a browser context
startUrl navigation works
listTabs returns at least one active tab
closeSession closes context/browser resources
errors are structured
```

### Tests

- create session against local test page;
- navigate and read title;
- close session without leak.

---

## P0-007 Implement screenshots and artifact paths

### Goal

Save screenshots under the ActOS artifact directory.

### Scope

- artifact root config;
- screenshot path builder;
- screenshot capture method;
- trace-compatible artifact metadata.

### Acceptance criteria

```text
screenshot file exists after capture
artifact path includes sessionId
artifact metadata includes type image/png
```

---

## P0-008 Implement observe v0

### Goal

Return a semantic observation of the current page.

### Scope

- URL;
- title;
- viewport;
- loading/stability flags;
- actionable elements:
  - buttons;
  - inputs;
  - textareas;
  - selects;
  - links;
  - checkboxes;
  - role-based elements;
- bbox;
- visible/enabled;
- locator hints.

### Acceptance criteria

```text
observe returns Observation schema-compliant object
mock page button/input/link are detected
bbox is included when available
screenshot included when requested
warnings array exists even when empty
```

### Tests

- observe simple form page;
- detect button by role/name;
- detect input by label/placeholder;
- screenshot path exists when requested.

---

## P0-009 Implement page stability detector v0

### Goal

Wait for a page to become reasonably stable after actions.

### Scope

- readyState check;
- short DOM quiet window;
- configurable timeout;
- structured `STABILITY_TIMEOUT` error.

### Acceptance criteria

```text
stable page returns success quickly
changing page waits until quiet or timeout
stability timeout produces structured error
```

---

# M3 — Action router + trace

## P0-010 Implement target resolver v0

### Goal

Map structured `ActionTarget` to Playwright locator/action target.

### Resolution order

1. elementId;
2. testId;
3. role + name;
4. label;
5. placeholder;
6. text;
7. selector;
8. coordinates.

### Acceptance criteria

```text
role/name resolves button
label resolves textbox
placeholder resolves textbox
testId resolves element
ambiguous text returns TARGET_AMBIGUOUS
missing target returns TARGET_NOT_FOUND
coordinate fallback requires reason
```

---

## P0-011 Implement action router v0

### Goal

Execute structured actions safely.

### Scope

Support:

- navigate;
- click;
- fill;
- press;
- select;
- scroll;
- wait.

### Required behavior

For every action:

```text
observe before
resolve target when needed
execute low-level action
wait for stability
observe after
return ActionResult
write trace events
```

### Acceptance criteria

```text
click button works
fill input works
select dropdown works
navigate works
failed actions return structured ActionResult with error
before/after observation IDs are included
```

---

## P0-012 Implement trace store v0

### Goal

Persist runtime events as local JSONL.

### Scope

- append event;
- list events by session;
- event schema validation;
- artifact references.

### Acceptance criteria

```text
trace file created per session
session.created is written
observe.completed is written
action.started and action.completed are written
action.failed is written on failure
getTrace returns parsed events in order
```

---

## P0-013 Integrate trace with observe and act

### Goal

Make trace automatic, not optional.

### Scope

- observe writes `observe.completed`;
- act writes started/completed/failed;
- checkpoint writes checkpoint event;
- errors write error event.

### Acceptance criteria

```text
running demo creates a complete timeline
no successful action lacks before/after observations
no failed action lacks error details
```

---

# M4 — Runtime server + SDK

## P0-014 Implement Fastify runtime server

### Goal

Expose local REST API.

### Routes

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
```

### Acceptance criteria

```text
server starts on configurable port
all routes validate request/response schemas
all route errors are structured JSON
```

---

## P0-015 Implement TypeScript SDK

### Goal

Provide ergonomic developer client.

### Scope

- `ActOSClient`;
- `ActOSSession` wrapper;
- typed methods;
- request/response validation.

### Acceptance criteria

```text
SDK can create session
SDK can observe
SDK can act
SDK can fetch trace
SDK example compiles
```

---

# M5 — Handoff + dashboard

## P0-016 Implement human handoff v0

### Goal

Pause runtime for manual intervention and resume safely.

### Scope

- session status `paused`;
- reject agent actions while paused;
- resume session;
- observe after resume;
- trace handoff start/resume.

### Acceptance criteria

```text
pause changes session status to paused
act while paused returns SESSION_PAUSED
resume changes status to active
resume returns fresh observation
handoff events appear in trace
```

---

## P0-017 Implement dashboard v0

### Goal

Create a local developer console.

### UI requirements

- session list;
- current session status;
- screenshot preview;
- observation JSON panel;
- trace timeline;
- pause/resume buttons;
- checkpoint button;
- simple action form.

### Acceptance criteria

```text
dashboard connects to runtime server
can list sessions
can show latest screenshot
can show latest observation JSON
can show trace timeline
can pause/resume a session
```

---

# M6 — Mock-admin demo + docs

## P0-018 Build mock-admin example app

### Goal

Create a deterministic local site for runtime validation.

### Pages

- login;
- orders;
- order detail optional;
- export confirmation modal.

### UI elements

- email input;
- password input;
- login button;
- order search input;
- status select;
- search button;
- table;
- export button;
- loading indicator;
- toast.

### Acceptance criteria

```text
mock-admin starts locally
login flow works with demo credentials
orders page has searchable table
export button triggers toast or file
```

---

## P0-019 Implement automated demo script

### Goal

Demonstrate v0 end-to-end.

### Script flow

```text
1. start runtime server
2. create session
3. open mock-admin
4. fill login form
5. click login
6. search ORD-1001
7. click export
8. checkpoint after export
9. fetch trace
10. print summary
```

### Acceptance criteria

```text
script completes without manual intervention
trace file exists
trace includes at least one observe and three actions
screenshot artifact exists
```

---

## P0-020 Write docs

### Required docs

- README setup;
- docs/architecture.md;
- docs/api.md;
- docs/trace-format.md;
- docs/safety.md;
- examples/mock-admin/README.md.

### Acceptance criteria

```text
new developer can run demo from README only
API docs match implemented routes
trace docs match actual JSONL output
safety docs explain high-risk action policy
```

---

# Release checklist

Before tagging v0:

```text
pnpm install
pnpm build
pnpm test
pnpm lint
start mock-admin
start runtime server
run demo script
open dashboard
verify trace JSONL
verify screenshot artifact
verify pause/resume
```

---

# P0 quality bar

v0 does not need to be smart.

v0 must be:

```text
typed
observable
traceable
recoverable
locally runnable
hard to misuse accidentally
```
