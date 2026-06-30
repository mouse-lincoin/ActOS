import { mkdir } from "node:fs/promises";
import path from "node:path";

import {
  createId,
  ID_PREFIXES,
  type RuntimeArtifact,
} from "@actos/core";
import type { Page } from "playwright";

import { buildScreenshotDir } from "./artifacts.js";

export type CaptureScreenshotOptions = {
  artifactRoot: string;
  sessionId: string;
  observationId: string;
  relatedObservationId?: string;
};

/** Capture a PNG screenshot and return trace-compatible artifact metadata. */
export async function captureScreenshot(
  page: Page,
  options: CaptureScreenshotOptions,
): Promise<{ artifact: RuntimeArtifact; screenshotPath: string }> {
  const screenshotDir = buildScreenshotDir(options.artifactRoot, options.sessionId);
  await mkdir(screenshotDir, { recursive: true });

  const screenshotPath = path.join(screenshotDir, `${options.observationId}.png`);
  await page.screenshot({ path: screenshotPath, type: "png", fullPage: false });

  const artifact: RuntimeArtifact = {
    id: createId(ID_PREFIXES.artifact),
    type: "screenshot",
    path: screenshotPath,
    mimeType: "image/png",
    relatedObservationId: options.relatedObservationId ?? options.observationId,
  };

  return { artifact, screenshotPath };
}
