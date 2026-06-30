import { access } from "node:fs/promises";

import {
  buildScreenshotPath,
  buildTraceFilePath,
  DEFAULT_ARTIFACT_ROOT,
} from "@actos/browser-playwright";
import { ActOSClient } from "@actos/sdk";
import type { TraceEvent } from "@actos/core";

export type DemoSummary = {
  sessionId: string;
  tracePath: string;
  screenshotPath?: string;
  traceEventCount: number;
  observeCount: number;
  actionCount: number;
  eventTypes: string[];
};

export type RunDemoWorkflowOptions = {
  runtimeBaseUrl: string;
  mockAdminUrl: string;
  artifactRoot?: string;
};

export async function runDemoWorkflow(options: RunDemoWorkflowOptions): Promise<DemoSummary> {
  const client = new ActOSClient({ baseUrl: options.runtimeBaseUrl });
  const session = await client.createSession({
    startUrl: options.mockAdminUrl,
    headless: true,
    browser: "chromium",
  });

  try {
    await session.observe({ includeScreenshot: true });

    const emailFill = await session.act({
      type: "fill",
      target: { label: "Email" },
      value: "demo@example.com",
    });
    if (emailFill.status !== "success") {
      throw new Error(`Email fill failed: ${emailFill.error?.message ?? "unknown"}`);
    }

    const passwordFill = await session.act({
      type: "fill",
      target: { label: "Password" },
      value: "demo1234",
    });
    if (passwordFill.status !== "success") {
      throw new Error(`Password fill failed: ${passwordFill.error?.message ?? "unknown"}`);
    }

    const loginClick = await session.act({
      type: "click",
      target: { role: "button", name: "Login" },
    });
    if (loginClick.status !== "success") {
      throw new Error(`Login click failed: ${loginClick.error?.message ?? "unknown"}`);
    }

    await session.act({ type: "wait", ms: 600 });

    const searchFill = await session.act({
      type: "fill",
      target: { label: "Order search" },
      value: "ORD-1001",
    });
    if (searchFill.status !== "success") {
      throw new Error(`Search fill failed: ${searchFill.error?.message ?? "unknown"}`);
    }

    const searchClick = await session.act({
      type: "click",
      target: { role: "button", name: "Search" },
    });
    if (searchClick.status !== "success") {
      throw new Error(`Search click failed: ${searchClick.error?.message ?? "unknown"}`);
    }

    await session.act({ type: "wait", ms: 500 });

    const exportClick = await session.act({
      type: "click",
      target: { role: "button", name: "Export CSV" },
    });
    if (exportClick.status !== "success") {
      throw new Error(`Export click failed: ${exportClick.error?.message ?? "unknown"}`);
    }

    const confirmClick = await session.act({
      type: "click",
      target: { role: "button", name: "Confirm export" },
    });
    if (confirmClick.status !== "success") {
      throw new Error(`Confirm export failed: ${confirmClick.error?.message ?? "unknown"}`);
    }

    await session.checkpoint("after-export");

    const trace = await session.getTrace();
    return summarizeDemo(session.id, trace, options.artifactRoot ?? DEFAULT_ARTIFACT_ROOT);
  } finally {
    await session.close();
  }
}

export function summarizeDemo(sessionId: string, trace: TraceEvent[], artifactRoot: string): DemoSummary {
  const observeCount = trace.filter((event) => event.type === "observe.completed").length;
  const actionCount = trace.filter(
    (event) => event.type === "action.completed" || event.type === "action.failed",
  ).length;

  const lastObserve = [...trace].reverse().find((event) => event.type === "observe.completed");
  const observationId =
    lastObserve && typeof lastObserve.payload.observationId === "string"
      ? lastObserve.payload.observationId
      : undefined;

  return {
    sessionId,
    tracePath: buildTraceFilePath(artifactRoot, sessionId),
    screenshotPath:
      observationId !== undefined
        ? buildScreenshotPath(artifactRoot, sessionId, observationId)
        : undefined,
    traceEventCount: trace.length,
    observeCount,
    actionCount,
    eventTypes: trace.map((event) => event.type),
  };
}

export function printDemoSummary(summary: DemoSummary): void {
  console.log("ActOS demo summary");
  console.log(`- session: ${summary.sessionId}`);
  console.log(`- trace file: ${summary.tracePath}`);
  console.log(`- screenshot: ${summary.screenshotPath ?? "n/a"}`);
  console.log(`- trace events: ${summary.traceEventCount}`);
  console.log(`- observe.completed: ${summary.observeCount}`);
  console.log(`- actions: ${summary.actionCount}`);
  console.log(`- event types: ${summary.eventTypes.join(", ")}`);
}

export async function assertDemoArtifacts(summary: DemoSummary): Promise<void> {
  await access(summary.tracePath);
  if (summary.screenshotPath) {
    await access(summary.screenshotPath);
  }
}
