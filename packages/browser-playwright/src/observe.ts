import {
  createId,
  createTimestamp,
  ID_PREFIXES,
  SCHEMA_VERSION,
  type Observation,
  type ObserveRequest,
  type ObservedElement,
  type ObservationWarning,
} from "@actos/core";
import type { Page } from "playwright";

import { getArtifactRoot } from "./artifacts.js";
import { captureScreenshot } from "./screenshots.js";
import { isPageStable } from "./stability.js";

export type ObservePageOptions = ObserveRequest & {
  sessionId: string;
  tabId: string;
  artifactRoot?: string;
};

type RawElement = {
  role: string;
  name?: string;
  text?: string;
  label?: string;
  placeholder?: string;
  testId?: string;
  selector?: string;
  visible: boolean;
  enabled: boolean;
  checked?: boolean;
  selected?: boolean;
  value?: string;
  bbox?: { x: number; y: number; width: number; height: number };
};

const INTERACTIVE_SELECTOR = [
  "button",
  "input:not([type='hidden'])",
  "textarea",
  "select",
  "a[href]",
  "[role='button']",
  "[role='link']",
  "[role='checkbox']",
  "[role='textbox']",
  "[role='combobox']",
  "[role='menuitem']",
  "[role='tab']",
].join(", ");

function confidenceForElement(raw: RawElement): number {
  if (raw.testId) return 0.98;
  if (raw.role && raw.name) return 0.95;
  if (raw.label || raw.placeholder) return 0.9;
  if (raw.text) return 0.85;
  return 0.75;
}

function toObservedElement(raw: RawElement): ObservedElement {
  const id = createId(ID_PREFIXES.element);
  return {
    id,
    role: raw.role,
    name: raw.name,
    text: raw.text,
    bbox: raw.bbox,
    visible: raw.visible,
    enabled: raw.enabled,
    checked: raw.checked,
    selected: raw.selected,
    value: raw.value,
    locatorHints: {
      role: raw.role,
      name: raw.name,
      text: raw.text,
      label: raw.label,
      placeholder: raw.placeholder,
      testId: raw.testId,
      selector: raw.selector,
    },
    confidence: confidenceForElement(raw),
  };
}

async function extractElements(page: Page, maxElements?: number): Promise<RawElement[]> {
  const limit = maxElements ?? 200;
  return page.evaluate(
    ({ selector, limit: elementLimit }) => {
      const nodes = Array.from(document.querySelectorAll(selector)).slice(0, elementLimit);

      function getLabel(el: Element): string | undefined {
        const id = el.getAttribute("id");
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          if (label?.textContent?.trim()) return label.textContent.trim();
        }
        const ariaLabel = el.getAttribute("aria-label");
        if (ariaLabel?.trim()) return ariaLabel.trim();
        const labelledBy = el.getAttribute("aria-labelledby");
        if (labelledBy) {
          const labelEl = document.getElementById(labelledBy);
          if (labelEl?.textContent?.trim()) return labelEl.textContent.trim();
        }
        return undefined;
      }

      function getRole(el: Element): string {
        const explicit = el.getAttribute("role");
        if (explicit) return explicit;
        const tag = el.tagName.toLowerCase();
        if (tag === "button") return "button";
        if (tag === "a") return "link";
        if (tag === "select") return "combobox";
        if (tag === "textarea") return "textbox";
        if (tag === "input") {
          const type = (el.getAttribute("type") ?? "text").toLowerCase();
          if (type === "checkbox") return "checkbox";
          if (type === "radio") return "radio";
          return "textbox";
        }
        return tag;
      }

      function getName(el: Element): string | undefined {
        const aria = el.getAttribute("aria-label");
        if (aria?.trim()) return aria.trim();
        const label = getLabel(el);
        if (label) return label;
        const placeholder = el.getAttribute("placeholder");
        if (placeholder?.trim()) return placeholder.trim();
        const text = (el.textContent ?? "").trim();
        if (text) return text.slice(0, 120);
        const value = (el as HTMLInputElement).value;
        if (value?.trim()) return value.trim();
        return el.getAttribute("name") ?? undefined;
      }

      function isVisible(el: Element): boolean {
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
          return false;
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }

      function isEnabled(el: Element): boolean {
        if ("disabled" in el && (el as HTMLInputElement).disabled) return false;
        const ariaDisabled = el.getAttribute("aria-disabled");
        return ariaDisabled !== "true";
      }

      return nodes.map((el, index) => {
        const htmlEl = el as HTMLElement;
        const rect = htmlEl.getBoundingClientRect();
        const input = el as HTMLInputElement;
        const select = el as HTMLSelectElement;

        const role = getRole(el);
        const label = getLabel(el);
        const placeholder = el.getAttribute("placeholder") ?? undefined;
        const testId = el.getAttribute("data-testid") ?? undefined;
        const text = (el.textContent ?? "").trim() || undefined;

        let selectorHint: string | undefined;
        if (testId) {
          selectorHint = `[data-testid="${testId}"]`;
        } else if (el.id) {
          selectorHint = `#${el.id}`;
        } else {
          selectorHint = `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
        }

        const bbox =
          rect.width > 0 && rect.height > 0
            ? {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
              }
            : undefined;

        return {
          role,
          name: getName(el),
          text,
          label,
          placeholder,
          testId,
          selector: selectorHint,
          visible: isVisible(el),
          enabled: isEnabled(el),
          checked: input.checked ?? undefined,
          selected: select.selectedIndex >= 0 ? select.selectedIndex > -1 : undefined,
          value: input.value || select.value || undefined,
          bbox,
        };
      });
    },
    { selector: INTERACTIVE_SELECTOR, limit },
  );
}

/** Collect a schema-compliant semantic observation from the current page. */
export async function observePage(page: Page, options: ObservePageOptions): Promise<Observation> {
  const observationId = createId(ID_PREFIXES.observation);
  const artifactRoot = getArtifactRoot({ artifactRoot: options.artifactRoot });
  const warnings: ObservationWarning[] = [];

  const [title, url, viewport, loading, stable, rawElements] = await Promise.all([
    page.title(),
    page.url(),
    page.viewportSize(),
    page.evaluate(() => document.readyState !== "complete"),
    isPageStable(page),
    extractElements(page, options.maxElements),
  ]);

  if (!viewport) {
    warnings.push({
      code: "VIEWPORT_UNAVAILABLE",
      message: "Page viewport size is unavailable",
      severity: "warning",
    });
  }

  const elements = rawElements.map(toObservedElement);

  let screenshotPath: string | undefined;
  if (options.includeScreenshot) {
    const { screenshotPath: capturedPath } = await captureScreenshot(page, {
      artifactRoot,
      sessionId: options.sessionId,
      observationId,
    });
    screenshotPath = capturedPath;
  }

  const observation: Observation = {
    id: observationId,
    schemaVersion: SCHEMA_VERSION,
    sessionId: options.sessionId,
    tabId: options.tabId,
    timestamp: createTimestamp(),
    page: {
      url,
      title,
      stable,
      loading,
      viewport: viewport ?? { width: 1280, height: 720 },
    },
    elements,
    warnings,
    ...(screenshotPath ? { artifacts: { screenshotPath } } : {}),
    ...(options.includeRawSnapshot
      ? {
          raw: {
            accessibilitySnapshot: await page.content(),
          },
        }
      : {}),
  };

  return observation;
}
