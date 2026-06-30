import {
  runtimeError,
  type ActionTarget,
  type LocatorHints,
  type Observation,
  type ResolvedTarget,
  type RuntimeError,
} from "@actos/core";
import type { Locator, Page } from "playwright";

export class TargetResolverError extends Error {
  readonly runtimeError: RuntimeError;

  constructor(runtimeError: RuntimeError) {
    super(runtimeError.message);
    this.name = "TargetResolverError";
    this.runtimeError = runtimeError;
  }
}

export type ExecutionTarget =
  | {
      kind: "locator";
      resolved: ResolvedTarget;
      locator: Locator;
    }
  | {
      kind: "coordinates";
      resolved: ResolvedTarget;
      x: number;
      y: number;
    };

function fail(code: "TARGET_NOT_FOUND" | "TARGET_AMBIGUOUS", message: string, details?: Record<string, unknown>): never {
  throw new TargetResolverError(runtimeError({ code, message, details }));
}

function hasTargetingFields(target: ActionTarget): boolean {
  return Boolean(
    target.elementId ||
      target.testId ||
      target.role ||
      target.name ||
      target.text ||
      target.label ||
      target.placeholder ||
      target.selector ||
      target.coordinates,
  );
}

function buildResolved(
  method: ResolvedTarget["method"],
  locatorDescription: string,
  confidence: number,
  element?: ResolvedTarget["element"],
  bbox?: ResolvedTarget["bbox"],
): ResolvedTarget {
  return {
    method,
    confidence,
    locatorDescription,
    ...(bbox ? { bbox } : {}),
    ...(element ? { element } : {}),
  };
}

async function assertResolvableLocator(
  locator: Locator,
  method: ResolvedTarget["method"],
  locatorDescription: string,
  confidence: number,
  element?: ResolvedTarget["element"],
): Promise<ExecutionTarget> {
  const count = await locator.count();
  if (count === 0) {
    fail("TARGET_NOT_FOUND", `No element matched ${locatorDescription}`, { method, locatorDescription });
  }
  if (count > 1) {
    fail("TARGET_AMBIGUOUS", `Multiple elements matched ${locatorDescription}`, {
      method,
      locatorDescription,
      matchCount: count,
    });
  }

  const box = await locator.first().boundingBox().catch(() => null);
  return {
    kind: "locator",
    resolved: buildResolved(
      method,
      locatorDescription,
      confidence,
      element,
      box ?? undefined,
    ),
    locator: locator.first(),
  };
}

function locatorFromHints(page: Page, hints: LocatorHints, role?: string): Locator | null {
  if (hints.testId) {
    return page.getByTestId(hints.testId);
  }
  if (hints.role && hints.name) {
    return page.getByRole(hints.role as Parameters<Page["getByRole"]>[0], {
      name: hints.name,
    });
  }
  if (role && hints.name) {
    return page.getByRole(role as Parameters<Page["getByRole"]>[0], { name: hints.name });
  }
  if (hints.label) {
    return page.getByLabel(hints.label);
  }
  if (hints.placeholder) {
    return page.getByPlaceholder(hints.placeholder);
  }
  if (hints.text) {
    return page.getByText(hints.text);
  }
  if (hints.selector) {
    return page.locator(hints.selector);
  }
  if (hints.role) {
    return page.getByRole(hints.role as Parameters<Page["getByRole"]>[0]);
  }
  return null;
}

function locatorDescriptionFromHints(method: ResolvedTarget["method"], hints: LocatorHints, role?: string): string {
  if (method === "testId" && hints.testId) return `getByTestId(${hints.testId})`;
  if (method === "roleName") return `getByRole(${hints.role ?? role}, { name: ${hints.name} })`;
  if (method === "label" && hints.label) return `getByLabel(${hints.label})`;
  if (method === "placeholder" && hints.placeholder) return `getByPlaceholder(${hints.placeholder})`;
  if (method === "text" && hints.text) return `getByText(${hints.text})`;
  if (method === "selector" && hints.selector) return `locator(${hints.selector})`;
  if (method === "elementId" && hints.selector) return `elementId -> ${hints.selector}`;
  return method;
}

/** Map a structured ActionTarget to a Playwright locator or coordinate target. */
export async function resolveTarget(
  page: Page,
  target: ActionTarget,
  observation?: Observation,
): Promise<ExecutionTarget> {
  if (!hasTargetingFields(target)) {
    fail("TARGET_NOT_FOUND", "Action target is empty");
  }

  if (target.coordinates) {
    if (!target.coordinates.reason?.trim()) {
      fail("TARGET_NOT_FOUND", "Coordinate fallback requires a non-empty reason", {
        target,
      });
    }
    return {
      kind: "coordinates",
      resolved: buildResolved(
        "coordinates",
        `mouse.click(${target.coordinates.x}, ${target.coordinates.y})`,
        0.5,
        undefined,
        {
          x: target.coordinates.x,
          y: target.coordinates.y,
          width: 1,
          height: 1,
        },
      ),
      x: target.coordinates.x,
      y: target.coordinates.y,
    };
  }

  if (target.elementId) {
    const element = observation?.elements.find((item) => item.id === target.elementId);
    if (!element) {
      fail("TARGET_NOT_FOUND", `Observed element not found: ${target.elementId}`, {
        elementId: target.elementId,
      });
    }
    const locator = locatorFromHints(page, element.locatorHints, element.role);
    if (!locator) {
      fail("TARGET_NOT_FOUND", `Unable to build locator for element ${target.elementId}`, {
        elementId: target.elementId,
      });
    }
    return assertResolvableLocator(
      locator,
      "elementId",
      locatorDescriptionFromHints("elementId", element.locatorHints, element.role),
      element.confidence,
      element,
    );
  }

  if (target.testId) {
    return assertResolvableLocator(
      page.getByTestId(target.testId),
      "testId",
      `getByTestId(${target.testId})`,
      0.98,
    );
  }

  if (target.role && target.name) {
    return assertResolvableLocator(
      page.getByRole(target.role as Parameters<Page["getByRole"]>[0], { name: target.name }),
      "roleName",
      `getByRole(${target.role}, { name: ${target.name} })`,
      0.95,
    );
  }

  if (target.label) {
    return assertResolvableLocator(
      page.getByLabel(target.label),
      "label",
      `getByLabel(${target.label})`,
      0.9,
    );
  }

  if (target.placeholder) {
    return assertResolvableLocator(
      page.getByPlaceholder(target.placeholder),
      "placeholder",
      `getByPlaceholder(${target.placeholder})`,
      0.9,
    );
  }

  if (target.text) {
    return assertResolvableLocator(
      page.getByText(target.text),
      "text",
      `getByText(${target.text})`,
      0.85,
    );
  }

  if (target.selector) {
    return assertResolvableLocator(
      page.locator(target.selector),
      "selector",
      `locator(${target.selector})`,
      0.8,
    );
  }

  if (target.role) {
    return assertResolvableLocator(
      page.getByRole(target.role as Parameters<Page["getByRole"]>[0]),
      "roleName",
      `getByRole(${target.role})`,
      0.8,
    );
  }

  fail("TARGET_NOT_FOUND", "No resolvable target fields were provided", { target });
}

/** Verify that a resolved locator is visible and enabled before acting. */
export async function assertTargetActionable(execution: ExecutionTarget): Promise<void> {
  if (execution.kind === "coordinates") {
    return;
  }

  const visible = await execution.locator.isVisible();
  if (!visible) {
    throw new TargetResolverError(
      runtimeError({
        code: "ELEMENT_NOT_VISIBLE",
        message: `Element is not visible: ${execution.resolved.locatorDescription}`,
        details: { locatorDescription: execution.resolved.locatorDescription },
      }),
    );
  }

  const enabled = await execution.locator.isEnabled();
  if (!enabled) {
    throw new TargetResolverError(
      runtimeError({
        code: "ELEMENT_DISABLED",
        message: `Element is disabled: ${execution.resolved.locatorDescription}`,
        details: { locatorDescription: execution.resolved.locatorDescription },
      }),
    );
  }
}
