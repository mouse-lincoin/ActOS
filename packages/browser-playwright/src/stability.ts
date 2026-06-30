import { runtimeError, type RuntimeError } from "@actos/core";
import type { Page } from "playwright";

export const STABILITY_DEFAULTS = {
  timeoutMs: 5000,
  domQuietWindowMs: 300,
  networkIdleTimeoutMs: 1000,
} as const;

export type StabilityOptions = {
  timeoutMs?: number;
  domQuietWindowMs?: number;
  networkIdleTimeoutMs?: number;
};

export type StabilityResult =
  | { stable: true }
  | { stable: false; error: RuntimeError };

type DomSnapshot = {
  readyState: string;
  elementCount: number;
};

async function readDomSnapshot(page: Page): Promise<DomSnapshot> {
  return page.evaluate(() => ({
    readyState: document.readyState,
    elementCount: document.getElementsByTagName("*").length,
  }));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for the page to become reasonably stable using readyState,
 * optional network idle, and a short DOM quiet window.
 */
export async function waitForPageStability(
  page: Page,
  options: StabilityOptions = {},
): Promise<StabilityResult> {
  const timeoutMs = options.timeoutMs ?? STABILITY_DEFAULTS.timeoutMs;
  const domQuietWindowMs = options.domQuietWindowMs ?? STABILITY_DEFAULTS.domQuietWindowMs;
  const networkIdleTimeoutMs =
    options.networkIdleTimeoutMs ?? STABILITY_DEFAULTS.networkIdleTimeoutMs;

  const deadline = Date.now() + timeoutMs;

  try {
    await page.waitForLoadState("domcontentloaded", {
      timeout: Math.max(0, deadline - Date.now()),
    });
  } catch {
    // Continue with heuristic checks even if domcontentloaded times out.
  }

  try {
    await page.waitForLoadState("networkidle", {
      timeout: Math.min(networkIdleTimeoutMs, Math.max(0, deadline - Date.now())),
    });
  } catch {
    // networkidle is best-effort in v0.
  }

  let previous: DomSnapshot | undefined;
  while (Date.now() < deadline) {
    const snapshot = await readDomSnapshot(page);

    if (snapshot.readyState === "complete") {
      if (
        previous &&
        previous.elementCount === snapshot.elementCount &&
        previous.readyState === snapshot.readyState
      ) {
        await sleep(domQuietWindowMs);
        const afterQuiet = await readDomSnapshot(page);
        if (
          afterQuiet.elementCount === snapshot.elementCount &&
          afterQuiet.readyState === snapshot.readyState
        ) {
          return { stable: true };
        }
      }
    }

    previous = snapshot;
    await sleep(50);
  }

  return {
    stable: false,
    error: runtimeError({
      code: "STABILITY_TIMEOUT",
      message: `Page did not stabilize within ${timeoutMs}ms`,
      details: {
        timeoutMs,
        domQuietWindowMs,
        networkIdleTimeoutMs,
      },
    }),
  };
}

/** Quick check whether the page appears stable right now (no waiting). */
export async function isPageStable(page: Page): Promise<boolean> {
  const snapshot = await readDomSnapshot(page);
  return snapshot.readyState === "complete";
}
