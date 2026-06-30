# ActOS

**The runtime layer for agents that do digital work.**

ActOS turns the web from a human-clicked interface into an agent-executable surface.

---

## Status

ActOS Runtime **v0** is feature-complete for the local developer MVP:

- browser sessions, observe, structured actions, JSONL trace
- Fastify REST server and TypeScript SDK
- human handoff (`pause` / `resume`)
- developer dashboard
- mock-admin demo site and automated demo script

---

## Prerequisites

- Node.js 20+
- pnpm 9+

---

## Quick start

```bash
# Install dependencies
pnpm install

# Install Playwright Chromium (required once)
pnpm --filter @actos/browser-playwright exec playwright install chromium

# Build all packages and the mock-admin site
pnpm build

# Run unit/integration tests
pnpm test
```

---

## Run the full demo (recommended)

Terminal 1 — runtime server:

```bash
pnpm --filter @actos/runtime-server start
```

Terminal 2 — mock-admin target site:

```bash
pnpm --filter @actos/mock-admin build
pnpm --filter @actos/mock-admin start
```

Terminal 3 — developer dashboard (optional):

```bash
pnpm --filter @actos/dashboard dev
```

Terminal 4 — automated end-to-end demo (creates its own servers):

```bash
pnpm demo
```

The demo script logs in to mock-admin, searches `ORD-1001`, exports CSV, creates a checkpoint, and prints trace + screenshot paths.

Mock-admin credentials: `demo@example.com` / `demo1234`

---

## Local development

```bash
# Build all packages
pnpm build

# Run all package tests
pnpm test

# Browser E2E for mock-admin UI
pnpm test:e2e

# Start runtime server (http://127.0.0.1:8787)
pnpm --filter @actos/runtime-server start

# Start dashboard (http://127.0.0.1:5173)
pnpm --filter @actos/dashboard dev

# Start mock-admin in dev mode (http://127.0.0.1:3001)
pnpm --filter @actos/mock-admin dev

# Lint / format
pnpm lint
pnpm format
```

---

## Packages

| Package | Description |
|---------|-------------|
| `@actos/core` | Zod schemas, types, IDs, error model |
| `@actos/browser-playwright` | Playwright driver, observe, action router, trace |
| `@actos/runtime-server` | Local Fastify REST API |
| `@actos/sdk` | TypeScript SDK |
| `@actos/dashboard` | Developer console UI |
| `@actos/mock-admin` | Deterministic demo target web app |

---

## Documentation

Developer docs (implemented v0):

- [Architecture](./docs/architecture.md)
- [API reference](./docs/api.md)
- [Trace format](./docs/trace-format.md)
- [Safety model](./docs/safety.md)
- [Mock-admin example](./examples/mock-admin/README.md)

Authoritative implementation pack: `docs/actos_llm_dev_pack/`

---

## Core ideas

- **Intent over clicks** — agents express what they want to do; the runtime grounds it safely.
- **Structured first** — DOM, accessibility, network and state before pixels.
- **Human in command** — risky actions pause for approval.
- **Every action is evidence** — replayable traces for every mission.

---

## License

Private — early architecture.
