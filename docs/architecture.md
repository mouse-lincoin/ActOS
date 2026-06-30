# ActOS Runtime v0 Architecture

ActOS is a local-first supervised Web Agent Runtime. Agents express structured intent; the runtime grounds actions in the browser, verifies page state, records evidence, and pauses for human handoff when needed.

## System layers

```text
Agent / SDK
    |
    v
Runtime Server (Fastify REST)
    |
    v
BrowserRuntime
  +-- Playwright driver (sessions, tabs, navigation)
  +-- Observe layer (semantic page snapshot)
  +-- Action router (click, fill, navigate, ...)
  +-- Target resolver (role/label/selector grounding)
  +-- Stability detector
  +-- JSONL trace store
  +-- Artifact store (screenshots)
```

## Packages

| Package | Responsibility |
|---------|----------------|
| `@actos/core` | Zod schemas, IDs, errors, shared contracts |
| `@actos/browser-playwright` | Browser execution, observe, actions, trace |
| `@actos/runtime-server` | Local REST API and error mapping |
| `@actos/sdk` | TypeScript client wrapping REST routes |
| `@actos/dashboard` | Developer console for sessions, traces, handoff |
| `@actos/mock-admin` | Deterministic demo target web app |

## Runtime flow

1. **Create session** — launch Chromium, open `startUrl`, write `session.created` trace event.
2. **Observe** — capture page metadata, interactive elements, optional screenshot; write `observe.completed`.
3. **Act** — resolve target, execute action with before/after observations; write `action.started` / `action.completed` or `action.failed`.
4. **Checkpoint** — label a durable observation snapshot; write `checkpoint.created`.
5. **Handoff** — pause agent operations, set session `paused`; resume captures fresh observation.

## Local storage layout

```text
.actos/
  traces/
    ses_<id>.jsonl
  artifacts/
    ses_<id>/
      screenshots/
        obs_<id>.png
```

## v0 boundaries

Implemented locally:

- single-user developer runtime
- Chromium via Playwright
- JSONL trace ledger
- pause/resume handoff
- dashboard and mock-admin demo

Not in v0:

- cloud browser fleet
- multi-tenant auth
- billing, marketplace, OAuth platform
- autonomous irreversible actions

## Related docs

- [API reference](./api.md)
- [Trace format](./trace-format.md)
- [Safety model](./safety.md)
- Authoritative dev pack: `docs/actos_llm_dev_pack/`
