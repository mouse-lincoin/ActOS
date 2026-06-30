# Start Here: LLM Development Pack for ActOS Runtime v0

This pack turns the ActOS PRD and Roadmap into implementation-ready instructions.

Read in this order:

1. `IMPLEMENTATION_BRIEF.md` — product boundary, stack, repo shape, definition of done.
2. `ARCHITECTURE.md` — module boundaries and runtime lifecycle.
3. `API_SPEC.md` — public REST API and TypeScript SDK contracts.
4. `TRACE_SCHEMA.md` — append-only evidence ledger.
5. `SAFETY_MODEL.md` — risk levels, policy, handoff, and safe defaults.
6. `P0_BACKLOG.md` — task sequence for an LLM coding agent.

Recommended coding-agent sequence:

```text
1. P0-001 to P0-006: repo + core schemas
2. P0-007 to P0-011: browser session + observe
3. P0-012 to P0-018: action router + stability + trace
4. P0-019 to P0-025: handoff + server + SDK + dashboard
5. P0-026 to P0-030: mock-admin + tests + docs
```

Do not ask the coding agent to implement the entire long-term roadmap at once.

The v0 mantra:

```text
Intent -> Grounded Action -> Verified State -> Trace -> Handoff when needed
```
