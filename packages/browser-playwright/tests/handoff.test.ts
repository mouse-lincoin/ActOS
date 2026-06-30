import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SessionPausedError } from "../src/handoffErrors.js";
import { BrowserRuntime } from "../src/browserRuntime.js";
import { ACTION_FORM_HTML } from "./fixtures/pages.js";

describe("human handoff v0", () => {
  let runtime: BrowserRuntime;
  let artifactRoot: string;
  let sessionId: string | undefined;

  beforeEach(async () => {
    artifactRoot = await mkdtemp(join(tmpdir(), "actos-handoff-"));
    runtime = new BrowserRuntime({ artifactRoot, headless: true });
  });

  afterEach(async () => {
    if (sessionId && runtime.getDriver().hasSession(sessionId)) {
      await runtime.closeSession(sessionId);
      sessionId = undefined;
    }
  });

  async function openSession() {
    const handle = await runtime.createSession();
    sessionId = handle.session.id;
    const page = runtime.getDriver().getActivePage(handle.session.id);
    await page.setContent(ACTION_FORM_HTML, { waitUntil: "domcontentloaded" });
    return handle;
  }

  it("pause changes session status to paused", async () => {
    const handle = await openSession();
    const handoff = await runtime.pauseForHuman(handle.session.id, {
      reason: "Login required",
    });

    expect(handoff.status).toBe("paused");
    expect(runtime.getSession(handle.session.id).status).toBe("paused");
  });

  it("act while paused returns SESSION_PAUSED and writes trace", async () => {
    const handle = await openSession();
    await runtime.pauseForHuman(handle.session.id, { reason: "manual" });

    const result = await runtime.act(handle.session.id, {
      type: "click",
      target: { role: "button", name: "Search" },
    });

    expect(result.status).toBe("failed");
    expect(result.error?.code).toBe("SESSION_PAUSED");

    const trace = await runtime.getTrace(handle.session.id);
    expect(trace.some((event) => event.type === "handoff.started")).toBe(true);
    expect(trace.some((event) => event.type === "action.failed")).toBe(true);

    await runtime.resume(handle.session.id);
  });

  it("observe while paused is rejected", async () => {
    const handle = await openSession();
    await runtime.pauseForHuman(handle.session.id, { reason: "manual" });

    await expect(runtime.observe(handle.session.id)).rejects.toBeInstanceOf(SessionPausedError);

    await runtime.resume(handle.session.id);
  });

  it("resume changes status to active and returns fresh observation", async () => {
    const handle = await openSession();
    await runtime.pauseForHuman(handle.session.id, { reason: "2FA" });

    const resumed = await runtime.resume(handle.session.id);

    expect(resumed.handoff.status).toBe("resumed");
    expect(runtime.getSession(handle.session.id).status).toBe("active");
    expect(resumed.observation.id.startsWith("obs_")).toBe(true);

    const trace = await runtime.getTrace(handle.session.id);
    expect(trace.some((event) => event.type === "handoff.resumed")).toBe(true);
    expect(trace.some((event) => event.type === "observe.completed")).toBe(true);
  });
});
