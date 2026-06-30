import { describe, expect, it, vi } from "vitest";

import { SCHEMA_VERSION } from "../src/schemas.js";

import { ActOSDashboardApi, ActOSDashboardApiError, DEFAULT_API_BASE } from "../src/api.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("ActOSDashboardApi", () => {
  it("uses the default runtime base URL", () => {
    const api = new ActOSDashboardApi();
    expect(api.getBaseUrl()).toBe(DEFAULT_API_BASE);
    expect(api.screenshotUrl("ses_test", "obs_test")).toBe(
      `${DEFAULT_API_BASE}/sessions/ses_test/artifacts/screenshot/obs_test`,
    );
  });

  it("lists sessions and fetches trace", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.endsWith("/sessions")) {
        return jsonResponse({
          sessions: [
            {
              id: "ses_test",
              status: "active",
              browser: "chromium",
              profile: "default",
              isolation: "strict",
              headless: true,
              createdAt: "2026-06-30T00:00:00.000Z",
              updatedAt: "2026-06-30T00:00:00.000Z",
              activeTabId: "tab_test",
            },
          ],
        });
      }
      if (url.endsWith("/trace")) {
        return jsonResponse({
          events: [
            {
              id: "trc_test",
              schemaVersion: SCHEMA_VERSION,
              sessionId: "ses_test",
              timestamp: "2026-06-30T00:00:01.000Z",
              type: "session.created",
              payload: {},
            },
          ],
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const api = new ActOSDashboardApi({ baseUrl: "http://localhost:8787", fetchImpl });
    const sessions = await api.listSessions();
    expect(sessions).toHaveLength(1);
    const trace = await api.getTrace("ses_test");
    expect(trace[0]?.type).toBe("session.created");
  });

  it("maps runtime errors from failed requests", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(
        {
          error: {
            code: "SESSION_PAUSED",
            message: "Session is paused for human handoff",
            category: "session",
            recoverable: true,
          },
        },
        409,
      ),
    );

    const api = new ActOSDashboardApi({ fetchImpl });
    await expect(api.observe("ses_test")).rejects.toBeInstanceOf(ActOSDashboardApiError);
  });
});
