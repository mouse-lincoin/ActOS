import { access } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildScreenshotPath } from "../src/artifacts.js";
import { captureScreenshot } from "../src/screenshots.js";
import { PlaywrightSessionDriver } from "../src/playwrightDriver.js";
import { SIMPLE_FORM_HTML } from "./fixtures/pages.js";

describe("screenshots", () => {
  let driver: PlaywrightSessionDriver;
  let artifactRoot: string;
  let sessionId: string | undefined;

  beforeEach(async () => {
    artifactRoot = await mkdtemp(join(tmpdir(), "actos-screenshot-"));
    driver = new PlaywrightSessionDriver({ artifactRoot, headless: true });
  });

  afterEach(async () => {
    if (sessionId && driver.hasSession(sessionId)) {
      await driver.closeSession(sessionId);
      sessionId = undefined;
    }
  });

  it("writes screenshot file with session-scoped path and metadata", async () => {
    const { session } = await driver.createSession();
    sessionId = session.id;
    const page = driver.getActivePage(session.id);
    await page.setContent(SIMPLE_FORM_HTML, { waitUntil: "domcontentloaded" });

    const observationId = "obs_test123";
    const { artifact, screenshotPath } = await captureScreenshot(page, {
      artifactRoot,
      sessionId: session.id,
      observationId,
    });

    expect(screenshotPath).toBe(
      buildScreenshotPath(artifactRoot, session.id, observationId),
    );
    expect(screenshotPath).toContain(session.id);
    expect(artifact.type).toBe("screenshot");
    expect(artifact.mimeType).toBe("image/png");
    expect(artifact.path).toBe(screenshotPath);
    await access(screenshotPath);
  });
});
