import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveTarget, TargetResolverError } from "../src/locator.js";
import { observePage } from "../src/observe.js";
import { PlaywrightSessionDriver } from "../src/playwrightDriver.js";
import { ACTION_FORM_HTML } from "./fixtures/pages.js";

describe("resolveTarget", () => {
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

  async function setupPage() {
    const { session } = await driver.createSession();
    sessionId = session.id;
    const page = driver.getActivePage(session.id);
    await page.setContent(ACTION_FORM_HTML, { waitUntil: "domcontentloaded" });
    const tabId = session.activeTabId!;
    const observation = await observePage(page, {
      sessionId: session.id,
      tabId,
    });
    return { session, page, observation };
  }

  it("resolves button by role and name", async () => {
    const { page } = await setupPage();
    const resolved = await resolveTarget(page, { role: "button", name: "Search" });
    expect(resolved.resolved.method).toBe("roleName");
    expect(resolved.kind).toBe("locator");
  });

  it("resolves textbox by label", async () => {
    const { page } = await setupPage();
    const resolved = await resolveTarget(page, { label: "Email" });
    expect(resolved.resolved.method).toBe("label");
  });

  it("resolves textbox by placeholder", async () => {
    const { page } = await setupPage();
    const resolved = await resolveTarget(page, { placeholder: "Enter email" });
    expect(resolved.resolved.method).toBe("placeholder");
  });

  it("resolves element by testId", async () => {
    const { page } = await setupPage();
    const resolved = await resolveTarget(page, { testId: "email-input" });
    expect(resolved.resolved.method).toBe("testId");
  });

  it("resolves element by observed elementId", async () => {
    const { page, observation } = await setupPage();
    const email = observation.elements.find((element) => element.locatorHints.testId === "email-input");
    expect(email).toBeDefined();

    const resolved = await resolveTarget(page, { elementId: email!.id }, observation);
    expect(resolved.resolved.method).toBe("elementId");
  });

  it("returns TARGET_AMBIGUOUS for ambiguous text", async () => {
    const { page } = await setupPage();
    await expect(resolveTarget(page, { text: "Go" })).rejects.toBeInstanceOf(TargetResolverError);
    await expect(resolveTarget(page, { text: "Go" })).rejects.toMatchObject({
      runtimeError: expect.objectContaining({ code: "TARGET_AMBIGUOUS" }),
    });
  });

  it("returns TARGET_NOT_FOUND for missing target", async () => {
    const { page } = await setupPage();
    await expect(
      resolveTarget(page, { role: "button", name: "Missing" }),
    ).rejects.toMatchObject({
      runtimeError: expect.objectContaining({ code: "TARGET_NOT_FOUND" }),
    });
  });

  it("requires reason for coordinate fallback", async () => {
    const { page } = await setupPage();
    await expect(
      resolveTarget(page, { coordinates: { x: 10, y: 10, reason: "" } }),
    ).rejects.toMatchObject({
      runtimeError: expect.objectContaining({ code: "TARGET_NOT_FOUND" }),
    });
  });
});
