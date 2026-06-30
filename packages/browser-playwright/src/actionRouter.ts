import {
  createId,
  createTimestamp,
  fromUnknownError,
  ID_PREFIXES,
  runtimeError,
  type ActionResult,
  type AgentAction,
  type Observation,
  type ResolvedTarget,
  type RuntimeError,
} from "@actos/core";
import type { Page } from "playwright";

import { observePage } from "./observe.js";
import { assertTargetActionable, resolveTarget, TargetResolverError, type ExecutionTarget } from "./locator.js";
import { captureScreenshot } from "./screenshots.js";
import { waitForPageStability } from "./stability.js";

export type ActionRouterConfig = {
  artifactRoot: string;
  actionTimeoutMs?: number;
};

export type ActionExecutionContext = {
  page: Page;
  sessionId: string;
  tabId: string;
  action: AgentAction;
  actionId?: string;
};

export type ActionExecutionDetails = {
  result: ActionResult;
  observationBefore: Observation;
  observationAfter?: Observation;
  resolvedTarget?: ResolvedTarget;
  execution?: {
    driver: "playwright";
    operation: string;
    durationMs: number;
  };
  stability?: {
    stable: boolean;
    durationMs: number;
  };
  failureArtifactPath?: string;
};

const SCROLL_AMOUNTS = {
  small: 300,
  medium: 600,
  large: 1200,
} as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toRuntimeError(error: unknown): RuntimeError {
  if (error instanceof TargetResolverError) {
    return error.runtimeError;
  }
  return fromUnknownError(error);
}

function buildActionResult(input: {
  actionId?: string;
  sessionId: string;
  tabId: string;
  action: AgentAction;
  status: ActionResult["status"];
  observationBeforeId?: string;
  observationAfterId?: string;
  resolvedTarget?: ResolvedTarget;
  error?: RuntimeError;
  artifacts?: ActionResult["artifacts"];
}): ActionResult {
  return {
    id: input.actionId ?? createId(ID_PREFIXES.action),
    sessionId: input.sessionId,
    tabId: input.tabId,
    status: input.status,
    action: input.action,
    observationBeforeId: input.observationBeforeId,
    observationAfterId: input.observationAfterId,
    resolvedTarget: input.resolvedTarget,
    error: input.error,
    artifacts: input.artifacts,
    timestamp: createTimestamp(),
  };
}

async function executeLocatorAction(
  execution: ExecutionTarget & { kind: "locator" },
  action: AgentAction,
): Promise<string> {
  await assertTargetActionable(execution);

  switch (action.type) {
    case "click":
      await execution.locator.click();
      return "locator.click";
    case "fill":
      await execution.locator.fill(action.value);
      return "locator.fill";
    case "press":
      await execution.locator.press(action.key);
      return "locator.press";
    case "select":
      await execution.locator.selectOption(action.value);
      return "locator.selectOption";
    default:
      throw new Error(`Action ${action.type} does not use locator execution`);
  }
}

async function runWait(page: Page, action: Extract<AgentAction, { type: "wait" }>): Promise<string> {
  if (action.ms !== undefined) {
    await sleep(action.ms);
    return `wait(${action.ms})`;
  }

  if (!action.until) {
    await sleep(0);
    return "wait(0)";
  }

  switch (action.until.type) {
    case "pageStable": {
      const result = await waitForPageStability(page);
      if (!result.stable) {
        throw new TargetResolverError(result.error);
      }
      return "wait(pageStable)";
    }
    case "textVisible":
      await page.getByText(action.until.text).first().waitFor({ state: "visible" });
      return `wait(textVisible:${action.until.text})`;
    case "urlContains":
      await page.waitForFunction(
        (value) => window.location.href.includes(value),
        action.until.value,
      );
      return `wait(urlContains:${action.until.value})`;
    default:
      return "wait";
  }
}

/** Execute a structured agent action with before/after observations. */
export class ActionRouter {
  private readonly config: ActionRouterConfig;

  constructor(config: ActionRouterConfig) {
    this.config = config;
  }

  async execute(context: ActionExecutionContext): Promise<ActionExecutionDetails> {
    const { page, sessionId, tabId, action } = context;
    const actionId = context.actionId ?? createId(ID_PREFIXES.action);

    const observationBefore = await observePage(page, {
      sessionId,
      tabId,
      artifactRoot: this.config.artifactRoot,
    });

    const startedAt = Date.now();
    let resolvedTarget: ResolvedTarget | undefined;
    let operation: string = action.type;
    let executionStartedAt = startedAt;

    try {
      switch (action.type) {
        case "navigate": {
          executionStartedAt = Date.now();
          await page.goto(action.url, { waitUntil: "domcontentloaded" });
          operation = "page.goto";
          break;
        }
        case "scroll": {
          executionStartedAt = Date.now();
          const amount = SCROLL_AMOUNTS[action.amount ?? "medium"];
          const delta = action.direction === "down" ? amount : -amount;
          await page.evaluate((scrollDelta) => window.scrollBy(0, scrollDelta), delta);
          operation = "page.scroll";
          break;
        }
        case "wait": {
          executionStartedAt = Date.now();
          operation = await runWait(page, action);
          break;
        }
        case "press": {
          if (action.target) {
            const execution = await resolveTarget(page, action.target, observationBefore);
            resolvedTarget = execution.resolved;
            executionStartedAt = Date.now();
            operation = await executeLocatorAction(execution as ExecutionTarget & { kind: "locator" }, action);
          } else {
            executionStartedAt = Date.now();
            await page.keyboard.press(action.key);
            operation = "keyboard.press";
          }
          break;
        }
        case "click":
        case "fill":
        case "select": {
          const execution = await resolveTarget(page, action.target, observationBefore);
          resolvedTarget = execution.resolved;
          executionStartedAt = Date.now();
          if (execution.kind === "coordinates") {
            await page.mouse.click(execution.x, execution.y);
            operation = "mouse.click";
          } else {
            operation = await executeLocatorAction(execution, action);
          }
          break;
        }
        default: {
          const exhaustive: never = action;
          throw new Error(`Unsupported action type: ${(exhaustive as AgentAction).type}`);
        }
      }

      const executionDurationMs = Date.now() - executionStartedAt;
      const stabilityStartedAt = Date.now();
      const stabilityResult = await waitForPageStability(page);
      const stabilityDurationMs = Date.now() - stabilityStartedAt;

      const observationAfter = await observePage(page, {
        sessionId,
        tabId,
        artifactRoot: this.config.artifactRoot,
      });

      return {
        result: buildActionResult({
          actionId,
          sessionId,
          tabId,
          action,
          status: "success",
          observationBeforeId: observationBefore.id,
          observationAfterId: observationAfter.id,
          resolvedTarget,
        }),
        observationBefore,
        observationAfter,
        resolvedTarget,
        execution: {
          driver: "playwright",
          operation,
          durationMs: executionDurationMs,
        },
        stability: {
          stable: stabilityResult.stable,
          durationMs: stabilityDurationMs,
        },
      };
    } catch (error) {
      const runtimeErr = toRuntimeError(error);
      let failureArtifactPath: string | undefined;
      let artifacts: ActionResult["artifacts"];

      try {
        const capture = await captureScreenshot(page, {
          artifactRoot: this.config.artifactRoot,
          sessionId,
          observationId: `action_failed_${actionId}`,
        });
        failureArtifactPath = capture.screenshotPath;
        artifacts = [capture.artifact];
      } catch {
        // Best-effort failure artifact.
      }

      return {
        result: buildActionResult({
          actionId,
          sessionId,
          tabId,
          action,
          status: "failed",
          observationBeforeId: observationBefore.id,
          resolvedTarget,
          error: runtimeErr,
          artifacts,
        }),
        observationBefore,
        resolvedTarget,
        failureArtifactPath,
        execution: {
          driver: "playwright",
          operation,
          durationMs: Math.max(0, Date.now() - executionStartedAt),
        },
      };
    }
  }
}

export function redactActionForTrace(action: AgentAction): AgentAction {
  if (action.type === "fill" && action.secret) {
    return {
      ...action,
      value: "[REDACTED]",
    };
  }
  return action;
}

export function mapNavigateError(error: unknown): RuntimeError {
  if (error instanceof TargetResolverError) {
    return error.runtimeError;
  }
  return runtimeError({
    code: "NAVIGATION_FAILED",
    message: error instanceof Error ? error.message : "Navigation failed",
  });
}
