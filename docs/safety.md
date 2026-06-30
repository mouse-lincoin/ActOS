# ActOS Safety Model (v0)

ActOS v0 is a local developer runtime, but it still enforces baseline safety defaults so agent actions remain structured, traceable, and supervisable.

## Core principles

1. **Structured intent only** — agents send typed actions (`click`, `fill`, `navigate`, ...), not raw coordinates, unless explicitly provided with a documented fallback reason.
2. **Runtime owns execution** — grounding, waiting, verification, and trace logging happen in the runtime, not in the LLM.
3. **Human handoff for intervention** — `pause` blocks agent operations while a human works in the browser; `resume` continues from current state.
4. **Trace everything** — session lifecycle, observations, actions, checkpoints, handoff, and errors are recorded in JSONL.
5. **Secrets redacted** — sensitive `fill` values are masked in trace output.

## Risk levels

`HandoffRequest` accepts optional `riskLevel`: `low | medium | high | blocked`.

v0 uses risk metadata for trace context and developer signaling. Automatic policy engines beyond handoff are out of scope for v0.

## Default posture in v0

| Area | v0 behavior |
|------|-------------|
| Execution environment | Local machine only |
| Session isolation | `strict` by default |
| Coordinate clicks | Rejected unless `target.coordinates.reason` is provided |
| Paused sessions | `observe`, `checkpoint`, and successful `act` are blocked |
| Failed paused `act` | Returns `SESSION_PAUSED`, still traced |
| CAPTCHA bypass | Not implemented |
| Autonomous payments / irreversible production actions | Not implemented |
| Secret fields in trace | Redacted |

## High-risk action policy

Actions that may require human approval in real deployments (login, export, checkout, irreversible submission) should be paired with:

1. explicit `pauseForHuman` before sensitive steps, or
2. human supervision via dashboard while the session is paused.

The mock-admin demo treats **export CSV** as a medium-risk UI action: it opens a confirmation modal before download. The automated demo completes only after explicit confirmation, and the runtime records the full action trace.

## Handoff workflow

```text
agent requests pause -> session.status = paused -> handoff.started
human edits browser manually
operator resumes -> session.status = active -> handoff.resumed + observe.completed
agent continues from fresh observation
```

While paused:

- `POST /observe` returns HTTP 409 `SESSION_PAUSED`
- `POST /act` returns a failed result with `SESSION_PAUSED` (traced)
- `POST /checkpoints` returns HTTP 409 `SESSION_PAUSED`

## Error categories

Runtime errors include `code`, `category`, `recoverable`, and optional `details`. Examples:

- `SESSION_PAUSED` — recoverable; resume or close session
- `TARGET_NOT_FOUND` — recoverable; re-observe and retry with better target
- `POLICY_DENIED` — non-recoverable in current policy context

## What v0 does not enforce yet

- domain allowlists across tenants
- production secrets vault
- automated payment approval chains
- cloud policy distribution

Those belong to future roadmap items outside Runtime v0.

## Related docs

- Authoritative safety spec: `docs/actos_llm_dev_pack/SAFETY_MODEL.md`
- Handoff API: [api.md](./api.md#handoff)
- Trace evidence: [trace-format.md](./trace-format.md)
