import { access } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ObservationSchema } from "@actos/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { observePage } from "../src/observe.js";
import { PlaywrightSessionDriver } from "../src/playwrightDriver.js";
import { SIMPLE_FORM_HTML } from "./fixtures/pages.js";

describe("observePage", () => {
  let driver: PlaywrightSessionDriver;
  let artifactRoot: string;
  const sessionsToClose: string[] = [];

  beforeEach(async () => {
    artifactRoot = await mkdtemp(join(tmpdir(), "actos-observe-"));
    driver = new PlaywrightSessionDriver({ artifactRoot, headless: true });
  });

  afterEach(async () => {
    while (sessionsToClose.length > 0) {
      const sessionId = sessionsToClose.pop();
      if (sessionId && driver.hasSession(sessionId)) {
        await driver.closeSession(sessionId);
      }
    }
  });

  async function openFormPage() {
    const { session, tabs } = await driver.createSession();
    sessionsToClose.push(session.id);
    const page = driver.getActivePage(session.id);
    await page.setContent(SIMPLE_FORM_HTML, { waitUntil: "domcontentloaded" });
    return { session, tab: tabs[0]!, page };
  }

  it("returns an Observation schema-compliant object", async () => {
    const { session, tab } = await openFormPage();
    const page = driver.getActivePage(session.id);

    const observation = await observePage(page, {
      sessionId: session.id,
      tabId: tab.id,
      artifactRoot,
    });

    expect(() => ObservationSchema.parse(observation)).not.toThrow();
    expect(observation.warnings).toEqual([]);
    expect(observation.page.title).toBe("Test Page");
  });

  it("detects button, input, link, and select elements", async () => {
    const { session, tab } = await openFormPage();
    const page = driver.getActivePage(session.id);

    const observation = await observePage(page, {
      sessionId: session.id,
      tabId: tab.id,
      artifactRoot,
    });

    const roles = observation.elements.map((element) => element.role);
    expect(roles).toContain("button");
    expect(roles).toContain("textbox");
    expect(roles).toContain("link");
    expect(roles).toContain("combobox");
    expect(roles).toContain("checkbox");

    const searchButton = observation.elements.find(
      (element) => element.role === "button" && element.name === "Search",
    );
    expect(searchButton).toBeDefined();
    expect(searchButton?.bbox).toBeDefined();

    const emailInput = observation.elements.find(
      (element) =>
        element.role === "textbox" &&
        (element.locatorHints.label === "Email" || element.locatorHints.placeholder === "Enter email"),
    );
    expect(emailInput).toBeDefined();
  });

  it("includes screenshot path when requested", async () => {
    const { session, tab } = await openFormPage();
    const page = driver.getActivePage(session.id);

    const observation = await observePage(page, {
      sessionId: session.id,
      tabId: tab.id,
      artifactRoot,
      includeScreenshot: true,
    });

    expect(observation.artifacts?.screenshotPath).toBeDefined();
    expect(observation.artifacts?.screenshotPath).toContain(session.id);
    await access(observation.artifacts!.screenshotPath!);
  });
});
