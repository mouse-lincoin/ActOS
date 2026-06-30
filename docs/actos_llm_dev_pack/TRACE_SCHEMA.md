# TRACE_SCHEMA.md

# ActOS Runtime v0 Trace Schema

> Trace is the evidence layer of ActOS.
>
> A Web Agent runtime without trace is a black box. A runtime with trace becomes debuggable, auditable, replayable, and safe enough to supervise.

---

## 1. Trace goals

Trace must answer six questions:

1. What did the agent/runtime see?
2. What action was requested?
3. How was the target grounded?
4. What low-level browser operation was executed?
5. What changed afterward?
6. Did a human intervene or approve anything?

---

## 2. Storage format v0

v0 uses local JSONL.

Directory layout:

```text
.actos/
  traces/
    ses_abc123.jsonl
  artifacts/
    ses_abc123/
      screenshots/
        obs_001.png
      snapshots/
        obs_001.json
      downloads/
        export.csv
```

Each line is one `TraceEvent` JSON object.

---

## 3. TraceEvent base schema

```ts
type TraceEvent = {
  id: string;
  schemaVersion: "0.1";
  sessionId: string;
  tabId?: string;
  timestamp: string;
  type: TraceEventType;
  payload: Record<string, unknown>;
};
```

```ts
type TraceEventType =
  | "session.created"
  | "session.closed"
  | "tab.created"
  | "tab.selected"
  | "observe.started"
  | "observe.completed"
  | "observe.failed"
  | "action.started"
  | "action.completed"
  | "action.failed"
  | "checkpoint.created"
  | "handoff.started"
  | "handoff.resumed"
  | "handoff.cancelled"
  | "artifact.created"
  | "error.raised";
```

---

## 4. Session events

### session.created

```json
{
  "id": "trc_001",
  "schemaVersion": "0.1",
  "sessionId": "ses_001",
  "timestamp": "2026-06-30T00:00:00.000Z",
  "type": "session.created",
  "payload": {
    "session": {
      "id": "ses_001",
      "browser": "chromium",
      "profile": "default",
      "isolation": "strict",
      "headless": false
    },
    "startUrl": "http://localhost:3001"
  }
}
```

### session.closed

```json
{
  "id": "trc_002",
  "schemaVersion": "0.1",
  "sessionId": "ses_001",
  "timestamp": "2026-06-30T00:05:00.000Z",
  "type": "session.closed",
  "payload": {
    "reason": "user_requested"
  }
}
```

---

## 5. Observation events

### observe.started

Optional but useful for debugging slow observations.

```json
{
  "id": "trc_010",
  "schemaVersion": "0.1",
  "sessionId": "ses_001",
  "tabId": "tab_001",
  "timestamp": "2026-06-30T00:00:01.000Z",
  "type": "observe.started",
  "payload": {
    "options": {
      "includeScreenshot": true,
      "includeRawSnapshot": false
    }
  }
}
```

### observe.completed

```json
{
  "id": "trc_011",
  "schemaVersion": "0.1",
  "sessionId": "ses_001",
  "tabId": "tab_001",
  "timestamp": "2026-06-30T00:00:01.200Z",
  "type": "observe.completed",
  "payload": {
    "observationId": "obs_001",
    "page": {
      "url": "http://localhost:3001/orders",
      "title": "Mock Admin",
      "stable": true,
      "loading": false
    },
    "elementCount": 18,
    "artifacts": [
      {
        "id": "art_001",
        "type": "screenshot",
        "path": ".actos/artifacts/ses_001/screenshots/obs_001.png",
        "mimeType": "image/png"
      }
    ],
    "durationMs": 200
  }
}
```

### observe.failed

```json
{
  "id": "trc_012",
  "schemaVersion": "0.1",
  "sessionId": "ses_001",
  "tabId": "tab_001",
  "timestamp": "2026-06-30T00:00:01.200Z",
  "type": "observe.failed",
  "payload": {
    "error": {
      "id": "err_001",
      "code": "OBSERVATION_FAILED",
      "message": "Failed to collect page elements",
      "category": "observation",
      "recoverable": true
    },
    "durationMs": 200
  }
}
```

---

## 6. Action events

## 6.1 action.started

```json
{
  "id": "trc_020",
  "schemaVersion": "0.1",
  "sessionId": "ses_001",
  "tabId": "tab_001",
  "timestamp": "2026-06-30T00:00:02.000Z",
  "type": "action.started",
  "payload": {
    "actionId": "act_001",
    "action": {
      "type": "click",
      "target": {
        "role": "button",
        "name": "Search"
      }
    }
  }
}
```

## 6.2 action.completed

```json
{
  "id": "trc_021",
  "schemaVersion": "0.1",
  "sessionId": "ses_001",
  "tabId": "tab_001",
  "timestamp": "2026-06-30T00:00:02.800Z",
  "type": "action.completed",
  "payload": {
    "actionId": "act_001",
    "action": {
      "type": "click",
      "target": {
        "role": "button",
        "name": "Search"
      }
    },
    "observationBeforeId": "obs_001",
    "observationAfterId": "obs_002",
    "resolvedTarget": {
      "method": "roleName",
      "confidence": 0.95,
      "locatorDescription": "getByRole(button, { name: Search })",
      "bbox": { "x": 420, "y": 180, "width": 96, "height": 40 }
    },
    "execution": {
      "driver": "playwright",
      "operation": "locator.click",
      "durationMs": 180
    },
    "stability": {
      "stable": true,
      "durationMs": 400
    },
    "durationMs": 800
  }
}
```

## 6.3 action.failed

```json
{
  "id": "trc_022",
  "schemaVersion": "0.1",
  "sessionId": "ses_001",
  "tabId": "tab_001",
  "timestamp": "2026-06-30T00:00:02.800Z",
  "type": "action.failed",
  "payload": {
    "actionId": "act_002",
    "action": {
      "type": "click",
      "target": {
        "role": "button",
        "name": "Export"
      }
    },
    "observationBeforeId": "obs_002",
    "resolvedTarget": null,
    "error": {
      "id": "err_002",
      "code": "TARGET_NOT_FOUND",
      "message": "No visible element matched role=button name=Export",
      "category": "targeting",
      "recoverable": true,
      "details": {
        "target": {
          "role": "button",
          "name": "Export"
        }
      }
    },
    "artifacts": [
      {
        "id": "art_002",
        "type": "screenshot",
        "path": ".actos/artifacts/ses_001/screenshots/action_failed_act_002.png",
        "mimeType": "image/png"
      }
    ],
    "durationMs": 500
  }
}
```

---

## 7. Checkpoint events

```json
{
  "id": "trc_030",
  "schemaVersion": "0.1",
  "sessionId": "ses_001",
  "tabId": "tab_001",
  "timestamp": "2026-06-30T00:00:03.000Z",
  "type": "checkpoint.created",
  "payload": {
    "checkpoint": {
      "id": "chk_001",
      "label": "after-search",
      "observationId": "obs_002",
      "screenshotPath": ".actos/artifacts/ses_001/screenshots/chk_001.png"
    }
  }
}
```

---

## 8. Handoff events

## 8.1 handoff.started

```json
{
  "id": "trc_040",
  "schemaVersion": "0.1",
  "sessionId": "ses_001",
  "tabId": "tab_001",
  "timestamp": "2026-06-30T00:00:04.000Z",
  "type": "handoff.started",
  "payload": {
    "handoff": {
      "id": "hnd_001",
      "reason": "2FA required",
      "instructions": "Please complete the login challenge, then resume.",
      "riskLevel": "medium"
    },
    "observationId": "obs_003"
  }
}
```

## 8.2 handoff.resumed

```json
{
  "id": "trc_041",
  "schemaVersion": "0.1",
  "sessionId": "ses_001",
  "tabId": "tab_001",
  "timestamp": "2026-06-30T00:01:00.000Z",
  "type": "handoff.resumed",
  "payload": {
    "handoffId": "hnd_001",
    "durationMs": 56000,
    "observationAfterResumeId": "obs_004"
  }
}
```

---

## 9. Artifact events

```json
{
  "id": "trc_050",
  "schemaVersion": "0.1",
  "sessionId": "ses_001",
  "tabId": "tab_001",
  "timestamp": "2026-06-30T00:00:01.200Z",
  "type": "artifact.created",
  "payload": {
    "artifact": {
      "id": "art_001",
      "type": "screenshot",
      "path": ".actos/artifacts/ses_001/screenshots/obs_001.png",
      "mimeType": "image/png",
      "relatedObservationId": "obs_001"
    }
  }
}
```

---

## 10. Secret redaction

If an action has `secret: true`, trace must not store the raw value.

Input action:

```json
{
  "type": "fill",
  "target": { "label": "Password" },
  "value": "super-secret",
  "secret": true
}
```

Trace payload should store:

```json
{
  "type": "fill",
  "target": { "label": "Password" },
  "value": "[REDACTED]",
  "secret": true
}
```

---

## 11. Replay semantics v0

v0 replay does not need to re-execute browser actions.

v0 replay means:

- read trace events in order;
- show timeline;
- show observations and screenshots;
- show action results;
- show errors;
- show handoff intervals.

Future replay may support deterministic rerun.

---

## 12. Trace completeness rules

A trace is complete if:

1. every session has `session.created`;
2. every observe success has `observe.completed`;
3. every action has `action.started`;
4. every action has exactly one terminal event:
   - `action.completed`; or
   - `action.failed`;
5. every successful action has before and after observation IDs;
6. every failed action has a structured error;
7. every handoff has started and resumed/cancelled;
8. every artifact referenced by trace exists on disk.

---

## 13. Trace summary format

A helper can return:

```ts
type TraceSummary = {
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  actionCount: number;
  failedActionCount: number;
  observationCount: number;
  handoffCount: number;
  checkpointCount: number;
  artifactCount: number;
  finalUrl?: string;
  finalStatus: "running" | "paused" | "completed" | "failed" | "closed";
};
```

---

## 14. Minimum trace tests

Implement tests for:

```text
trace file is created on session creation
observe.completed event validates schema
action.completed includes before/after observation IDs
action.failed includes RuntimeError
secret fill action redacts value
handoff started/resumed appear in order
referenced screenshot artifact exists
```
