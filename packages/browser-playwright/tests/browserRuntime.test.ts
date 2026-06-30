import { access } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BrowserRuntime } from "../src/browserRuntime.js";
import { ACTION_FORM_HTML } from "./fixtures/pages.js";

describe("BrowserRuntime integration", () => {
  let runtime: BrowserRuntime;
  let artifactRoot: string;
  let sessionId: string | undefined;

  beforeEach(async () => {
    artifactRoot = await mkdtemp(join(tmpdir(), "actos-runtime-"));
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

  it("writes session.created and observe.completed events", async () => {
    const handle = await openSession();
    await runtime.observe(handle.session.id, { includeScreenshot: true });

    const trace = await runtime.getTrace(handle.session.id);
    expect(trace.some((event) => event.type === "session.created")).toBe(true);
    expect(trace.some((event) => event.type === "observe.completed")).toBe(true);
  });

  it("writes action.started and action.completed with observations", async () => {
    const handle = await openSession();

    const result = await runtime.act(handle.session.id, {
      type: "fill",
      target: { label: "Email" },
      value: "agent@example.com",
    });

    expect(result.status).toBe("success");
    expect(result.observationBeforeId).toBeDefined();
    expect(result.observationAfterId).toBeDefined();

    const trace = await runtime.getTrace(handle.session.id);
    const started = trace.find((event) => event.type === "action.started");
    const completed = trace.find((event) => event.type === "action.completed");

    expect(started).toBeDefined();
    expect(completed).toBeDefined();
    expect(completed?.payload.observationBeforeId).toBe(result.observationBeforeId);
    expect(completed?.payload.observationAfterId).toBe(result.observationAfterId);
  });

  it("writes action.failed and error.raised on failure", async () => {
    const handle = await openSession();

    const result = await runtime.act(handle.session.id, {
      type: "click",
      target: { role: "button", name: "Export" },
    });

    expect(result.status).toBe("failed");
    expect(result.error?.code).toBe("TARGET_NOT_FOUND");

    const trace = await runtime.getTrace(handle.session.id);
    expect(trace.some((event) => event.type === "action.failed")).toBe(true);
    expect(trace.some((event) => event.type === "error.raised")).toBe(true);
  });

  it("supports press, scroll, and checkpoint trace events", async () => {
    const handle = await openSession();

    await runtime.act(handle.session.id, {
      type: "fill",
      target: { label: "Email" },
      value: "demo@example.com",
    });

    const pressResult = await runtime.act(handle.session.id, {
      type: "press",
      target: { label: "Email" },
      key: "Tab",
    });
    expect(pressResult.status).toBe("success");

    const scrollResult = await runtime.act(handle.session.id, {
      type: "scroll",
      direction: "down",
      amount: "small",
    });
    expect(scrollResult.status).toBe("success");

    const checkpoint = await runtime.checkpoint(handle.session.id, "after-actions");
    expect(checkpoint.label).toBe("after-actions");

    const trace = await runtime.getTrace(handle.session.id);
    expect(trace.some((event) => event.type === "checkpoint.created")).toBe(true);
    if (checkpoint.screenshotPath) {
      await access(checkpoint.screenshotPath);
    }
  });

  it("redacts secret fill values in trace payloads", async () => {
    const handle = await openSession();

    await runtime.act(handle.session.id, {
      type: "fill",
      target: { label: "Email" },
      value: "super-secret",
      secret: true,
    });

    const trace = await runtime.getTrace(handle.session.id);
    const started = trace.find((event) => event.type === "action.started");
    const action = started?.payload.action as { value?: string; secret?: boolean };

    expect(action.secret).toBe(true);
    expect(action.value).toBe("[REDACTED]");
  });
});
