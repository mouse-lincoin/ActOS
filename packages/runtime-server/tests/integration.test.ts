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

    const resumeResponse = await fetch(`${baseUrl}/sessions/${session.id}/handoff/resume`, {
      method: "POST",
    });
    expect(resumeResponse.status).toBe(200);

    const finalTraceResponse = await fetch(`${baseUrl}/sessions/${session.id}/trace`);
    const finalTypes = ((await finalTraceResponse.json()) as { events: Array<{ type: string }> }).events.map(
      (event) => event.type,
    );
    expect(finalTypes).toContain("checkpoint.created");
    expect(finalTypes).toContain("handoff.started");
    expect(finalTypes).toContain("handoff.resumed");

    await fetch(`${baseUrl}/sessions/${session.id}`, { method: "DELETE" });
  });
});
