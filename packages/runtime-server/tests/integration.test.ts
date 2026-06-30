import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { BrowserRuntime } from "@actos/browser-playwright";
import { createActOSServer } from "../src/server.js";

const ACTION_FORM_HTML = `<!DOCTYPE html>
<html><head><title>API Test</title></head><body>
<label for="email">Email</label>
<input id="email" type="email" placeholder="Enter email" />
<button type="button" id="search-btn">Search</button>
</body></html>`;

describe("runtime-server integration", () => {
  let artifactRoot: string;
  let runtime: BrowserRuntime;
  let baseUrl: string;
  let app: Awaited<ReturnType<typeof createActOSServer>>["app"];

  beforeAll(async () => {
    artifactRoot = await mkdtemp(join(tmpdir(), "actos-api-"));
    runtime = new BrowserRuntime({ artifactRoot, headless: true });
    const server = await createActOSServer({ browserRuntime: runtime });
    app = server.app;
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    baseUrl = address;
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a session, acts, and returns trace events", async () => {
    const createResponse = await fetch(`${baseUrl}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headless: true }),
    });
    expect(createResponse.status).toBe(200);
    const { session } = (await createResponse.json()) as { session: { id: string } };

    const page = runtime.getDriver().getActivePage(session.id);
    await page.setContent(ACTION_FORM_HTML, { waitUntil: "domcontentloaded" });

    const actResponse = await fetch(`${baseUrl}/sessions/${session.id}/act`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: { type: "fill", target: { label: "Email" }, value: "api@example.com" },
      }),
    });
    expect(actResponse.status).toBe(200);
    const actBody = (await actResponse.json()) as {
      result: { status: string; observationBeforeId?: string; observationAfterId?: string };
    };
    expect(actBody.result.status).toBe("success");
    expect(actBody.result.observationBeforeId).toBeDefined();
    expect(actBody.result.observationAfterId).toBeDefined();

    const traceResponse = await fetch(`${baseUrl}/sessions/${session.id}/trace`);
    const traceBody = (await traceResponse.json()) as { events: Array<{ type: string }> };
    const types = traceBody.events.map((event) => event.type);
    expect(types).toContain("session.created");
    expect(types).toContain("action.started");
    expect(types).toContain("action.completed");

    const checkpointResponse = await fetch(`${baseUrl}/sessions/${session.id}/checkpoints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "api-checkpoint" }),
    });
    expect(checkpointResponse.status).toBe(200);

    const pauseResponse = await fetch(`${baseUrl}/sessions/${session.id}/handoff/pause`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "manual" }),
    });
    expect(pauseResponse.status).toBe(200);

    const pausedSessionResponse = await fetch(`${baseUrl}/sessions/${session.id}`);
    expect(pausedSessionResponse.status).toBe(200);
    const pausedSessionBody = (await pausedSessionResponse.json()) as { session: { status: string } };
    expect(pausedSessionBody.session.status).toBe("paused");

    const pausedObserveResponse = await fetch(`${baseUrl}/sessions/${session.id}/observe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includeScreenshot: false }),
    });
    expect(pausedObserveResponse.status).toBe(409);
    expect(
      ((await pausedObserveResponse.json()) as { error: { code: string } }).error.code,
    ).toBe("SESSION_PAUSED");

    const pausedActResponse = await fetch(`${baseUrl}/sessions/${session.id}/act`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: { type: "click", target: { role: "button", name: "Search" } },
      }),
    });
    expect(pausedActResponse.status).toBe(200);
    const pausedActBody = (await pausedActResponse.json()) as {
      result: { status: string; error?: { code: string } };
    };
    expect(pausedActBody.result.status).toBe("failed");
    expect(pausedActBody.result.error?.code).toBe("SESSION_PAUSED");

    const resumeResponse = await fetch(`${baseUrl}/sessions/${session.id}/handoff/resume`, {
      method: "POST",
    });
    expect(resumeResponse.status).toBe(200);

    const activeSessionResponse = await fetch(`${baseUrl}/sessions/${session.id}`);
    expect(
      ((await activeSessionResponse.json()) as { session: { status: string } }).session.status,
    ).toBe("active");

    const finalTraceResponse = await fetch(`${baseUrl}/sessions/${session.id}/trace`);
    const finalTypes = ((await finalTraceResponse.json()) as { events: Array<{ type: string }> }).events.map(
      (event) => event.type,
    );
    expect(finalTypes).toContain("checkpoint.created");
    expect(finalTypes).toContain("handoff.started");
    expect(finalTypes).toContain("handoff.resumed");
    expect(finalTypes).toContain("action.failed");

    const observeResponse = await fetch(`${baseUrl}/sessions/${session.id}/observe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includeScreenshot: true }),
    });
    expect(observeResponse.status).toBe(200);
    const observation = (await observeResponse.json()) as { observation: { id: string } };

    const screenshotResponse = await fetch(
      `${baseUrl}/sessions/${session.id}/artifacts/screenshot/${observation.observation.id}`,
    );
    expect(screenshotResponse.status).toBe(200);
    expect(screenshotResponse.headers.get("content-type")).toMatch(/image\/png/);

    await fetch(`${baseUrl}/sessions/${session.id}`, { method: "DELETE" });
  });
});
