# ActOS

**The runtime layer for agents that do digital work.**

ActOS turns the web from a human-clicked interface into an agent-executable surface.

---

## Status

ActOS Runtime **v0** — Pass 4 complete: Fastify REST server (`@actos/runtime-server`) and TypeScript SDK (`@actos/sdk`).

Dashboard remains a stub package until Pass 5.

---

## Prerequisites

- Node.js 20+
- pnpm 9+

---

## Local development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Install Playwright Chromium (required once for browser-playwright tests)
pnpm --filter @actos/browser-playwright exec playwright install chromium

# Start the local runtime server (default http://127.0.0.1:8787)
pnpm --filter @actos/runtime-server start

# Lint all packages
pnpm lint

# Format code
pnpm format
```

---

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| `@actos/core` | Zod schemas, types, IDs, error model | Implemented (Pass 1) |
| `@actos/browser-playwright` | Playwright driver, observe, action router, trace | Implemented (Pass 2–3) |
| `@actos/runtime-server` | Local Fastify REST API | Implemented (Pass 4) |
| `@actos/sdk` | TypeScript SDK | Implemented (Pass 4) |
| `@actos/dashboard` | Developer console UI | Stub (Pass 5) |

---

## Core ideas

- **Intent over clicks** — agents express what they want to do; the runtime grounds it safely.
- **Structured first** — DOM, accessibility, network and state before pixels.
- **Human in command** — risky actions pause for approval.
- **Every action is evidence** — replayable traces for every mission.

---

## Documentation

Implementation docs live under `docs/actos_llm_dev_pack/`:

1. `IMPLEMENTATION_BRIEF.md`
2. `P0_BACKLOG.md`
3. `API_SPEC.md`
4. `TRACE_SCHEMA.md`
5. `SAFETY_MODEL.md`
6. `ARCHITECTURE.md`

---

## License

Private — early architecture.
