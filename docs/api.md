# ActOS Runtime v0 API

Base URL (default):

```text
http://127.0.0.1:8787
```

All error responses use:

```json
{ "error": { "id": "err_...", "code": "SESSION_NOT_FOUND", "message": "...", "category": "session", "recoverable": false } }
```

## Sessions

### `POST /sessions`

Create a browser session.

Request body:

```json
{
  "startUrl": "http://127.0.0.1:3001",
  "browser": "chromium",
  "headless": true,
  "profile": "default",
  "isolation": "strict",
  "viewport": { "width": 1280, "height": 900 }
}
```

Response: `{ "session": Session }`

### `GET /sessions`

List active sessions.

Response: `{ "sessions": Session[] }`

### `GET /sessions/:sessionId`

Get one session.

Response: `{ "session": Session }`

### `DELETE /sessions/:sessionId`

Close a session. Returns `204` on success.

## Observe

### `POST /sessions/:sessionId/observe`

Capture a semantic observation of the active tab.

Request body:

```json
{
  "includeScreenshot": true,
  "includeRawSnapshot": false,
  "maxElements": 200
}
```

Response: `{ "observation": Observation }`

Returns `409` with `SESSION_PAUSED` when the session is paused for handoff.

## Actions

### `POST /sessions/:sessionId/act`

Execute a structured agent action.

Request body:

```json
{
  "action": {
    "type": "click",
    "target": { "role": "button", "name": "Search" }
  }
}
```

Response: `{ "result": ActionResult }`

Supported `action.type` values in v0:

- `navigate`
- `click`
- `fill`
- `press`
- `select`
- `scroll`
- `wait`

When paused, `act` returns a failed `ActionResult` with `error.code = "SESSION_PAUSED"` and still writes trace events.

## Checkpoints

### `POST /sessions/:sessionId/checkpoints`

Request body:

```json
{ "label": "after-export" }
```

Response: `{ "checkpoint": Checkpoint }`

Blocked with `409 SESSION_PAUSED` while handoff is active.

## Handoff

### `POST /sessions/:sessionId/handoff/pause`

Request body:

```json
{
  "reason": "Login or 2FA required",
  "instructions": "Complete login manually, then resume.",
  "riskLevel": "high"
}
```

Response: `{ "handoff": HandoffState }`

Sets `session.status` to `paused` and writes `handoff.started`.

### `POST /sessions/:sessionId/handoff/resume`

Response:

```json
{
  "handoff": { "...": "status resumed" },
  "observation": { "...": "fresh observation after resume" }
}
```

Writes `handoff.resumed` and `observe.completed`.

## Trace

### `GET /sessions/:sessionId/trace`

Response: `{ "events": TraceEvent[] }`

Trace files are also persisted at `.actos/traces/{sessionId}.jsonl`.

## Artifacts

### `GET /sessions/:sessionId/artifacts/screenshot/:observationId`

Returns the PNG screenshot captured for an observation.

## TypeScript SDK

Equivalent SDK methods are available on `ActOSClient` / `ActOSSession` from `@actos/sdk`:

```ts
import { ActOSClient } from "@actos/sdk";

const client = new ActOSClient({ baseUrl: "http://127.0.0.1:8787" });
const session = await client.createSession({ startUrl: "http://127.0.0.1:3001" });
await session.observe({ includeScreenshot: true });
await session.act({ type: "click", target: { role: "button", name: "Login" } });
const trace = await session.getTrace();
await session.close();
```

## CORS

The runtime server enables CORS for local dashboard access from `http://127.0.0.1:5173`.
