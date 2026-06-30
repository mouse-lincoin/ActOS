export {
  DEFAULT_ARTIFACT_ROOT,
  getArtifactRoot,
  buildSessionArtifactDir,
  buildScreenshotPath,
  buildScreenshotDir,
  type ArtifactConfig,
} from "./artifacts.js";

export { captureScreenshot, type CaptureScreenshotOptions } from "./screenshots.js";

export {
  STABILITY_DEFAULTS,
  waitForPageStability,
  isPageStable,
  type StabilityOptions,
  type StabilityResult,
} from "./stability.js";

export { observePage, type ObservePageOptions } from "./observe.js";

export {
  PlaywrightSessionDriver,
  PlaywrightDriverError,
  type PlaywrightDriverConfig,
  type BrowserSessionHandle,
} from "./playwrightDriver.js";

export {
  resolveTarget,
  assertTargetActionable,
  TargetResolverError,
  type ExecutionTarget,
} from "./locator.js";

export {
  JsonlTraceStore,
  TraceStoreError,
  buildTraceDir,
  buildTraceFilePath,
  type TraceStoreConfig,
} from "./jsonlTraceStore.js";

export {
  ActionRouter,
  redactActionForTrace,
  type ActionRouterConfig,
  type ActionExecutionContext,
  type ActionExecutionDetails,
} from "./actionRouter.js";

export { BrowserRuntime, type BrowserRuntimeConfig } from "./browserRuntime.js";
