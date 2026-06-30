import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ActionRouter } from "../src/actionRouter.js";
import { PlaywrightSessionDriver } from "../src/playwrightDriver.js";
import { ACTION_FORM_HTML } from "./fixtures/pages.js";

describe("ActionRouter", () => {
  let driver: PlaywrightSessionDriver;
  let artifactRoot: string;
  let sessionId: string | undefined;

  beforeEach(async () => {
    artifactRoot = await mkdtemp(join(tmpdir(), "actos-action-"));
    driver = new PlaywrightSessionDriver({ artifactRoot, headless: true });
  });

  afterEach(async () => {
    if (sessionId && driver.hasSession(sessionId)) {
      await driver.closeSession(sessionId);
      sessionId = undefined;
    }
  });

  async function openActionPage() {
    const { session } = await driver.createSession();
    sessionId = session.id;
    const page = driver.getActivePage(session.id);
    await page.setContent(ACTION_FORM_HTML, { waitUntil: "domcontentloaded" });
    return {
      session,
      page,
      tabId: session.activeTabId!,
    };
  }

  it("clicks a button with before/after observations", async () => {
    const { session, page, tabId } = await openActionPage();
    const router = new ActionRouter({ artifactRoot });

    const outcome = await router.execute({
      page,
      sessionId: session.id,
      tabId,
      action: { type: "click", target: { role: "button", name: "Search" } },
    });

    expect(outcome.result.status).toBe("success");
    expect(outcome.result.observationBeforeId).toBeDefined();
    expect(outcome.result.observationAfterId).toBeDefined();
    expect(outcome.result.resolvedTarget?.method).toBe("roleName");
    expect(await page.locator("#result").textContent()).toBe("searched");
  });

  it("fills an input field", async () => {
    const { session, page, tabId } = await openActionPage();
    const router = new ActionRouter({ artifactRoot });

    const outcome = await router.execute({
      page,
      sessionId: session.id,
      tabId,
      action: { type: "fill", target: { label: "Email" }, value: "demo@example.com" },
    });

    expect(outcome.result.status).toBe("success");
    expect(await page.locator("#email").inputValue()).toBe("demo@example.com");
  });

  it("selects a dropdown option", async () => {
    const { session, page, tabId } = await openActionPage();
    const router = new ActionRouter({ artifactRoot });

    const outcome = await router.execute({
      page,
      sessionId: session.id,
      tabId,
      action: { type: "select", target: { label: "Status" }, value: "done" },
    });

    expect(outcome.result.status).toBe("success");
    expect(await page.locator("#status").inputValue()).toBe("done");
  });

  it("navigates to a URL", async () => {
    const { session, page, tabId } = await openActionPage();
    const router = new ActionRouter({ artifactRoot });
    const targetUrl = "https://example.com";

    const outcome = await router.execute({
      page,
      sessionId: session.id,
      tabId,
      action: { type: "navigate", url: targetUrl },
    });

    expect(outcome.result.status).toBe("success");
    expect(page.url()).toContain("example.com");
  });

  it("waits for page stability", async () => {
    const { session, page, tabId } = await openActionPage();
    const router = new ActionRouter({ artifactRoot });

    const outcome = await router.execute({
      page,
      sessionId: session.id,
      tabId,
      action: { type: "wait", until: { type: "pageStable" } },
    });

    expect(outcome.result.status).toBe("success");
    expect(outcome.result.observationBeforeId).toBeDefined();
    expect(outcome.result.observationAfterId).toBeDefined();
  });

  it("returns structured failure for missing target", async () => {
    const { session, page, tabId } = await openActionPage();
    const router = new ActionRouter({ artifactRoot });

    const outcome = await router.execute({
      page,
      sessionId: session.id,
      tabId,
      action: { type: "click", target: { role: "button", name: "Export" } },
    });

    expect(outcome.result.status).toBe("failed");
    expect(outcome.result.error?.code).toBe("TARGET_NOT_FOUND");
    expect(outcome.result.observationBeforeId).toBeDefined();
    expect(outcome.result.observationAfterId).toBeUndefined();
  });
});
