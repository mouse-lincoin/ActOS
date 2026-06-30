import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PlaywrightSessionDriver } from "../src/playwrightDriver.js";
import { waitForPageStability } from "../src/stability.js";
import { SIMPLE_FORM_HTML, UNSTABLE_PAGE_HTML } from "./fixtures/pages.js";

describe("waitForPageStability", () => {
  let driver: PlaywrightSessionDriver;
  let sessionId: string | undefined;

  beforeEach(() => {
    driver = new PlaywrightSessionDriver({ headless: true });
  });

  afterEach(async () => {
    if (sessionId && driver.hasSession(sessionId)) {
      await driver.closeSession(sessionId);
      sessionId = undefined;
    }
  });

  it("returns quickly for a stable page", async () => {
    const { session } = await driver.createSession();
    sessionId = session.id;
    const page = driver.getActivePage(session.id);
    await page.setContent(SIMPLE_FORM_HTML, { waitUntil: "domcontentloaded" });

    const started = Date.now();
    const result = await waitForPageStability(page, { timeoutMs: 3000 });
    const elapsed = Date.now() - started;

    expect(result.stable).toBe(true);
    expect(elapsed).toBeLessThan(3000);
  });

  it("returns STABILITY_TIMEOUT for continuously changing DOM", async () => {
    const { session } = await driver.createSession();
    sessionId = session.id;
    const page = driver.getActivePage(session.id);
    await page.setContent(UNSTABLE_PAGE_HTML, { waitUntil: "domcontentloaded" });

    const result = await waitForPageStability(page, {
      timeoutMs: 800,
      domQuietWindowMs: 200,
      networkIdleTimeoutMs: 100,
    });

    expect(result.stable).toBe(false);
    if (!result.stable) {
      expect(result.error.code).toBe("STABILITY_TIMEOUT");
      expect(result.error.category).toBe("stability");
      expect(result.error.recoverable).toBe(true);
    }
  });
});
