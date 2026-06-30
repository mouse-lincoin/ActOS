# AGENTS.md

This repository implements ActOS Runtime v0.

ActOS is a supervised Web Agent Runtime. It allows an AI agent to create a browser session, observe a webpage semantically, execute grounded actions, record every step into a trace ledger, pause for human handoff, and resume from the current browser state.

## Authoritative documents

For implementation, follow the documents in this order:

1. `docs/llm_dev_pack/IMPLEMENTATION_BRIEF.md`
2. `docs/llm_dev_pack/P0_BACKLOG.md`
3. `docs/llm_dev_pack/API_SPEC.md`
4. `docs/llm_dev_pack/TRACE_SCHEMA.md`
5. `docs/llm_dev_pack/SAFETY_MODEL.md`
6. `docs/llm_dev_pack/ARCHITECTURE.md`

The documents under `docs/product/` are product background and long-term vision only.

Do not implement future roadmap features from:

- `docs/product/web_agent_runtime_PRD.md`
- `docs/product/web_agent_runtime_technical_roadmap.md`

unless the user explicitly asks for them.

## Current scope

Implement only ActOS Runtime v0.

v0 is local-only.

Required capabilities:

- monorepo foundation
- core TypeScript types
- Zod schemas
- Playwright browser driver
- browser session manager
- semantic observe
- structured action router
- target resolver
- page stability detector
- trace ledger
- checkpoint
- human handoff
- local runtime server
- TypeScript SDK
- dashboard v0
- mock-admin example

## Non-goals for v0

Do not implement:

- cloud deployment
- billing
- marketplace
- multi-tenant enterprise system
- browser fleet
- multi-agent scheduling
- OAuth platform
- production secrets vault
- workflow marketplace
- autonomous payments
- CAPTCHA bypass
- irreversible actions without human approval

## Design principles

1. The LLM should not directly control raw coordinates unless explicitly requested as a fallback.
2. Agent actions must be structured intent.
3. Runtime is responsible for target grounding, execution, waiting, verification, and trace logging.
4. Every action must produce before and after observations.
5. Every failure must return a structured error.
6. Human handoff must pause runtime execution and allow resume from the current browser state.
7. Trace completeness is mandatory.
8. Do not expand scope beyond the assigned P0 tasks.

## Development loop

For each task:

1. Read the relevant P0 item in `docs/llm_dev_pack/P0_BACKLOG.md`.
2. Implement only that task.
3. Add or update tests.
4. Run build and tests.
5. Summarize what changed.
6. Do not continue to the next P0 item unless instructed.