import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PlaywrightSessionDriver } from "../src/playwrightDriver.js";
import { SIMPLE_FORM_HTML } from "./fixtures/pages.js";

describe("PlaywrightSessionDriver", () => {
  let driver: PlaywrightSessionDriver;
  let artifactRoot: string;
  const sessionsToClose: string[] = [];

  beforeEach(async () => {
    artifactRoot = await mkdtemp(join(tmpdir(), "actos-session-"));
    driver = new PlaywrightSessionDriver({ artifactRoot, headless: true });
  });

  afterEach(async () => {
    while (sessionsToClose.length > 0) {
      const id = sessionsToClose.pop();
      if (id && driver.hasSession(id)) {
        await driver.closeSession(id);
      }
    }
  });

  it("creates a session with an active tab", async () => {
    const { session, tabs } = await driver.createSession();
    sessionsToClose.push(session.id);

    expect(session.id.startsWith("ses_")).toBe(true);
    expect(session.status).toBe("active");
    expect(tabs).toHaveLength(1);
    expect(tabs[0]?.active).toBe(true);
    expect(driver.listTabs(session.id)).toHaveLength(1);
  });

  it("navigates to startUrl and reads page title", async () => {
    const dataUrl = `data:text/html,${encodeURIComponent(SIMPLE_FORM_HTML)}`;
    const { session } = await driver.createSession({ startUrl: dataUrl });
    sessionsToClose.push(session.id);

    const page = driver.getActivePage(session.id);
    await page.waitForLoadState("domcontentloaded");

    expect(await page.title()).toBe("Test Page");
    expect(page.url()).toContain("data:text/html");
  });

  it("creates and selects additional tabs", async () => {
    const { session } = await driver.createSession();
    sessionsToClose.push(session.id);
    const page = driver.getActivePage(session.id);
    await page.setContent(SIMPLE_FORM_HTML);

    const secondTab = await driver.createTab(session.id);
    expect(driver.listTabs(session.id)).toHaveLength(2);

    const selected = await driver.selectTab(session.id, secondTab.id);
    expect(selected.active).toBe(true);
    expect(driver.getSession(session.id).activeTabId).toBe(secondTab.id);
  });

  it("closes session and releases resources", async () => {
    const { session } = await driver.createSession();
    const page = driver.getActivePage(session.id);
    await page.setContent(SIMPLE_FORM_HTML);

    await driver.closeSession(session.id);
    expect(driver.hasSession(session.id)).toBe(false);
    expect(() => driver.getActivePage(session.id)).toThrow();
  });

  it("throws structured error for missing session", () => {
    expect(() => driver.getActivePage("ses_missing")).toThrowError(/Session not found/);
  });
});
