import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { startActOSServer } from "@actos/runtime-server";

import { startMockAdmin } from "../src/server.js";
import {
  assertDemoArtifacts,
  printDemoSummary,
  runDemoWorkflow,
} from "./demoWorkflow.js";

async function main() {
  const artifactRoot = await mkdtemp(join(tmpdir(), "actos-demo-"));
  const mockAdmin = await startMockAdmin({ port: 3001, host: "127.0.0.1" });
  const { app, url: runtimeUrl } = await startActOSServer({
    artifactRoot,
    headless: true,
    port: 8787,
    host: "127.0.0.1",
  });

  try {
    const summary = await runDemoWorkflow({
      runtimeBaseUrl: runtimeUrl,
      mockAdminUrl: mockAdmin.url,
      artifactRoot,
    });
    await assertDemoArtifacts(summary);
    printDemoSummary(summary);
  } finally {
    await app.close();
    await mockAdmin.close();
  }
}

main().catch((error) => {
  console.error("Demo failed", error);
  process.exit(1);
});
