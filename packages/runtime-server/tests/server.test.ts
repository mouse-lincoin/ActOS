import { describe, expect, it } from "vitest";

import { createId, ID_PREFIXES, SCHEMA_VERSION } from "@actos/core";
import type { ActOSRuntimeService } from "../src/runtime.js";
import { createActOSServer } from "../src/server.js";

function createMockRuntime(overrides: Partial<ActOSRuntimeService> = {}): ActOSRuntimeService {
  const session = {
    id: "ses_test",
    status: "active" as const,
    browser: "chromium" as const,
    profile: "default",
    isolation: "strict" as const,
    headless: true,
    createdAt: "2026-06-30T00:00:00.000Z",
    updatedAt: "2026-06-30T00:00:00.000Z",
    activeTabId: "tab_test",
  };

  return {
    createSession: async () => ({ session, tabs: [] }),
    listSessions: () => [session],
    getSession: () => session,
    closeSession: async () => undefined,
    observe: async () => ({
      id: "obs_test",
      schemaVersion: SCHEMA_VERSION,
      sessionId: session.id,
      tabId: "tab_test",
      timestamp: "2026-06-30T00:00:01.000Z",
      page: {
        url: "about:blank",
        title: "Test",
        stable: true,
        loading: false,
        viewport: { width: 1280, height: 900 },
      },
      elements: [],
      warnings: [],
    }),
    act: async () => ({
      id: "act_test",
      sessionId: session.id,
      tabId: "tab_test",
      status: "success" as const,
      action: { type: "wait" as const, ms: 0 },
      timestamp: "2026-06-30T00:00:02.000Z",
    }),
    checkpoint: async () => ({
      id: "chk_test",
      sessionId: session.id,
      label: "test",
      timestamp: "2026-06-30T00:00:03.000Z",
    }),
    pauseForHuman: async () => ({
      id: "hnd_test",
      sessionId: session.id,
      status: "paused" as const,
      reason: "test",
      startedAt: "2026-06-30T00:00:04.000Z",
    }),
    resume: async () => ({
      handoff: {
        id: "hnd_test",
        sessionId: session.id,
        status: "resumed" as const,
        reason: "test",
        startedAt: "2026-06-30T00:00:04.000Z",
        resumedAt: "2026-06-30T00:00:05.000Z",
      },
      observation: {
        id: "obs_resume",
        schemaVersion: SCHEMA_VERSION,
        sessionId: session.id,
        tabId: "tab_test",
        timestamp: "2026-06-30T00:00:05.000Z",
        page: {
          url: "about:blank",
          title: "Test",
          stable: true,
          loading: false,
          viewport: { width: 1280, height: 900 },
        },
        elements: [],
        warnings: [],
      },
    }),
    getTrace: async () => [
      {
        id: createId(ID_PREFIXES.trace),
        schemaVersion: SCHEMA_VERSION,
        sessionId: session.id,
        timestamp: "2026-06-30T00:00:00.000Z",
        type: "session.created" as const,
        payload: {},
      },
    ],
    hasSession: (sessionId: string) => sessionId === session.id,
    ...overrides,
  };
}

describe("createActOSServer", () => {
  it("starts and serves session routes with schema-valid responses", async () => {
    const runtime = createMockRuntime();
    const { app } = await createActOSServer({ runtime });

    const createResponse = await app.inject({
      method: "POST",
      url: "/sessions",
      payload: { headless: true, browser: "chromium" },
    });
    expect(createResponse.statusCode).toBe(200);
    expect(createResponse.json().session.id).toBe("ses_test");

    const listResponse = await app.inject({ method: "GET", url: "/sessions" });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().sessions).toHaveLength(1);

    const traceResponse = await app.inject({
      method: "GET",
      url: "/sessions/ses_test/trace",
    });
    expect(traceResponse.statusCode).toBe(200);
    expect(traceResponse.json().events).toHaveLength(1);

    await app.close();
  });

  it("returns structured JSON for missing sessions", async () => {
    const runtime = createMockRuntime({ hasSession: () => false });
    const { app } = await createActOSServer({ runtime });

    const response = await app.inject({
      method: "GET",
      url: "/sessions/ses_missing",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("SESSION_NOT_FOUND");

    await app.close();
  });

  it("returns structured JSON for invalid request bodies", async () => {
    const runtime = createMockRuntime();
    const { app } = await createActOSServer({ runtime });

    const response = await app.inject({
      method: "POST",
      url: "/sessions/ses_test/act",
      payload: { action: { type: "click" } },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBeDefined();

    await app.close();
  });
});
