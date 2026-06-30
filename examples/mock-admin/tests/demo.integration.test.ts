import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createActOSServer } from "@actos/runtime-server";

import { startMockAdmin } from "../src/server.js";
import { assertDemoArtifacts, runDemoWorkflow } from "../scripts/demoWorkflow.js";

describe("automated demo workflow", () => {
  let artifactRoot: string;
  let mockAdmin: Awaited<ReturnType<typeof startMockAdmin>>;
  let runtimeUrl: string;
  let app: Awaited<ReturnType<typeof createActOSServer>>["app"];

  beforeAll(async () => {
    artifactRoot = await mkdtemp(join(tmpdir(), "actos-demo-test-"));
    mockAdmin = await startMockAdmin({ host: "127.0.0.1" });
    const server = await createActOSServer({ artifactRoot, headless: true });
    app = server.app;
    runtimeUrl = await app.listen({ port: 0, host: "127.0.0.1" });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (mockAdmin) {
      await mockAdmin.close();
    }
  });

  it("completes login, search, export, checkpoint, and writes trace artifacts", async () => {
    const summary = await runDemoWorkflow({
      runtimeBaseUrl: runtimeUrl,
      mockAdminUrl: mockAdmin.url,
      artifactRoot,
    });

    await assertDemoArtifacts(summary);

    expect(summary.observeCount).toBeGreaterThanOrEqual(1);
    expect(summary.actionCount).toBeGreaterThanOrEqual(3);
    expect(summary.eventTypes).toContain("session.created");
    expect(summary.eventTypes).toContain("action.completed");
    expect(summary.eventTypes).toContain("checkpoint.created");
    expect(summary.screenshotPath).toBeDefined();
  });
});
