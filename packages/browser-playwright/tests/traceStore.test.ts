import { access } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { SCHEMA_VERSION } from "@actos/core";
import { describe, expect, it } from "vitest";

import { JsonlTraceStore } from "../src/jsonlTraceStore.js";

describe("JsonlTraceStore", () => {
  it("appends and reads trace events in order", async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), "actos-trace-"));
    const store = new JsonlTraceStore({ artifactRoot });
    const sessionId = "ses_trace001";

    const first = store.createEvent(sessionId, "session.created", {
      session: { id: sessionId },
    });
    const second = store.createEvent(sessionId, "observe.completed", {
      observationId: "obs_001",
    }, "tab_001");

    await store.append(first);
    await store.append(second);

    const events = await store.getTrace(sessionId);
    expect(events).toHaveLength(2);
    expect(events[0]?.type).toBe("session.created");
    expect(events[1]?.type).toBe("observe.completed");
    expect(events[0]?.schemaVersion).toBe(SCHEMA_VERSION);
    await access(store.getTraceFilePath(sessionId));
  });

  it("returns empty trace for unknown session", async () => {
    const artifactRoot = await mkdtemp(join(tmpdir(), "actos-trace-empty-"));
    const store = new JsonlTraceStore({ artifactRoot });
    await expect(store.getTrace("ses_missing")).resolves.toEqual([]);
  });
});
