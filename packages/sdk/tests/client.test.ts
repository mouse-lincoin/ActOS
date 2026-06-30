import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createActOSServer } from "@actos/runtime-server";
import { ActOSClient } from "../src/client.js";

const ACTION_FORM_HTML = `<!DOCTYPE html>
<html><head><title>SDK Test</title></head><body>
<label for="email">Email</label>
<input id="email" type="email" placeholder="Enter email" />
<button type="button" id="search-btn">Search</button>
</body></html>`;

describe("ActOSClient", () => {
  let baseUrl: string;
  let app: Awaited<ReturnType<typeof createActOSServer>>["app"];
  let client: ActOSClient;

  beforeAll(async () => {
    const server = await createActOSServer({ headless: true });
    app = server.app;
    baseUrl = await app.listen({ port: 0, host: "127.0.0.1" });
    client = new ActOSClient({ baseUrl });
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a session wrapper", async () => {
    const session = await client.createSession({ headless: true });
    expect(session.id.startsWith("ses_")).toBe(true);

    const listed = await client.listSessions();
    expect(listed.some((item) => item.id === session.id)).toBe(true);

    await session.close();
  });

  it("observes, acts, and fetches trace through ActOSSession", async () => {
    const session = await client.createSession({
      headless: true,
      startUrl: `data:text/html,${encodeURIComponent(ACTION_FORM_HTML)}`,
    });

    const observation = await session.observe();
    expect(observation.elements.length).toBeGreaterThan(0);

    const result = await session.act({
      type: "fill",
      target: { label: "Email" },
      value: "sdk@example.com",
    });
    expect(result.status).toBe("success");
    expect(result.observationBeforeId).toBeDefined();
    expect(result.observationAfterId).toBeDefined();

    const trace = await session.getTrace();
    expect(trace.some((event) => event.type === "action.completed")).toBe(true);

    await session.close();
  });

  it("returns structured client errors for missing sessions", async () => {
    await expect(client.getSession("ses_missing")).rejects.toMatchObject({
      runtimeError: { code: "SESSION_NOT_FOUND" },
    });
  });
});
