# ActOS Trace Format (v0)

ActOS stores one JSON object per line in `.actos/traces/{sessionId}.jsonl`. Each line is a `TraceEvent`.

## TraceEvent shape

```ts
type TraceEvent = {
  id: string;              // trc_...
  schemaVersion: "0.1";
  sessionId: string;       // ses_...
  tabId?: string;          // tab_...
  timestamp: string;       // ISO-8601
  type: TraceEventType;
  payload: Record<string, unknown>;
};
```

## Event types written in v0

| Type | When |
|------|------|
| `session.created` | Browser session created |
| `session.closed` | Session closed |
| `observe.completed` | Semantic observation captured |
| `action.started` | Structured action accepted |
| `action.completed` | Action succeeded |
| `action.failed` | Action failed (including `SESSION_PAUSED`) |
| `checkpoint.created` | Named checkpoint saved |
| `handoff.started` | Session paused for human intervention |
| `handoff.resumed` | Session resumed after handoff |
| `error.raised` | Structured runtime error recorded |

## Example file excerpt

```jsonl
{"id":"trc_001","schemaVersion":"0.1","sessionId":"ses_abc","timestamp":"2026-06-30T00:00:00.000Z","type":"session.created","payload":{"startUrl":"http://127.0.0.1:3001"}}
{"id":"trc_002","schemaVersion":"0.1","sessionId":"ses_abc","tabId":"tab_001","timestamp":"2026-06-30T00:00:01.000Z","type":"observe.completed","payload":{"observationId":"obs_001","page":{"url":"http://127.0.0.1:3001/","title":"Mock Admin","stable":true,"loading":false},"elementCount":12}}
{"id":"trc_003","schemaVersion":"0.1","sessionId":"ses_abc","tabId":"tab_001","timestamp":"2026-06-30T00:00:02.000Z","type":"action.started","payload":{"actionId":"act_001","action":{"type":"fill","target":{"label":"Email"},"value":"[REDACTED]"}}}
{"id":"trc_004","schemaVersion":"0.1","sessionId":"ses_abc","tabId":"tab_001","timestamp":"2026-06-30T00:00:02.500Z","type":"action.completed","payload":{"actionId":"act_001","observationBeforeId":"obs_001","observationAfterId":"obs_002","durationMs":420}}
{"id":"trc_005","schemaVersion":"0.1","sessionId":"ses_abc","timestamp":"2026-06-30T00:00:10.000Z","type":"checkpoint.created","payload":{"checkpoint":{"id":"chk_001","label":"after-export","observationId":"obs_010"}}}
```

## Action trace payload fields

Successful actions include:

- `actionId`
- redacted `action`
- `observationBeforeId`
- `observationAfterId`
- `resolvedTarget`
- `execution` metadata
- `stability` result
- `durationMs`

Failed actions include `error` and may emit `error.raised`.

## Screenshot artifacts

When `includeScreenshot: true`, `observe.completed` may include artifact metadata and the PNG is stored at:

```text
.actos/artifacts/{sessionId}/screenshots/{observationId}.png
```

Serve via:

```http
GET /sessions/{sessionId}/artifacts/screenshot/{observationId}
```

## Secret handling

`fill` actions with sensitive field names (for example password fields) are redacted in trace payloads as `[REDACTED]`.

## Querying trace

- REST: `GET /sessions/:sessionId/trace`
- SDK: `session.getTrace()`
- Dashboard: timeline panel
- Disk: read `.actos/traces/{sessionId}.jsonl` directly

## Related docs

- Full schema reference: `docs/actos_llm_dev_pack/TRACE_SCHEMA.md`
- Safety and redaction policy: [safety.md](./safety.md)
