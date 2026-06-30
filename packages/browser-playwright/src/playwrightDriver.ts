import {
  createId,
  createTimestamp,
  ID_PREFIXES,
  runtimeError,
  type BrowserName,
  type BrowserTab,
  type CreateSessionRequest,
  type IsolationMode,
  type RuntimeError,
  type Session,
} from "@actos/core";
import {
  chromium,
  firefox,
  webkit,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";

import { getArtifactRoot, type ArtifactConfig } from "./artifacts.js";

export type PlaywrightDriverConfig = ArtifactConfig & {
  headless?: boolean;
};

export type BrowserSessionHandle = {
  session: Session;
  tabs: BrowserTab[];
};

type TabState = {
  tab: BrowserTab;
  page: Page;
};

type BrowserSessionState = {
  session: Session;
  browser: Browser;
  context: BrowserContext;
  tabs: Map<string, TabState>;
  activeTabId: string;
};

export class PlaywrightDriverError extends Error {
  readonly runtimeError: RuntimeError;

  constructor(runtimeError: RuntimeError) {
    super(runtimeError.message);
    this.name = "PlaywrightDriverError";
    this.runtimeError = runtimeError;
  }
}

function launchBrowserName(browser: BrowserName) {
  switch (browser) {
    case "firefox":
      return firefox;
    case "webkit":
      return webkit;
    case "chromium":
    default:
      return chromium;
  }
}

function toDriverError(error: unknown, fallbackCode: "BROWSER_LAUNCH_FAILED" | "NAVIGATION_FAILED" | "SESSION_NOT_FOUND"): never {
  if (error instanceof PlaywrightDriverError) {
    throw error;
  }

  const message = error instanceof Error ? error.message : String(error);
  throw new PlaywrightDriverError(
    runtimeError({
      code: fallbackCode,
      message,
      details: error instanceof Error ? { name: error.name } : undefined,
    }),
  );
}

export class PlaywrightSessionDriver {
  private readonly sessions = new Map<string, BrowserSessionState>();
  private readonly config: PlaywrightDriverConfig;

  constructor(config: PlaywrightDriverConfig = {}) {
    this.config = config;
  }

  getArtifactRoot(): string {
    return getArtifactRoot(this.config);
  }

  async createSession(request: CreateSessionRequest = {}): Promise<BrowserSessionHandle> {
    const sessionId = createId(ID_PREFIXES.session);
    const browserName = request.browser ?? "chromium";
    const headless = request.headless ?? this.config.headless ?? true;
    const profile = request.profile ?? "default";
    const isolation: IsolationMode = request.isolation ?? "strict";
    const now = createTimestamp();

    try {
      const browserType = launchBrowserName(browserName);
      const browser = await browserType.launch({ headless });

      const context = await browser.newContext({
        viewport: request.viewport ?? { width: 1280, height: 900 },
        ...(isolation === "strict" ? { storageState: undefined } : {}),
      });

      const page = await context.newPage();
      const tabId = createId(ID_PREFIXES.tab);

      if (request.startUrl) {
        await page.goto(request.startUrl, { waitUntil: "domcontentloaded" });
      }

      const tab: BrowserTab = {
        id: tabId,
        sessionId,
        url: page.url(),
        title: await page.title(),
        active: true,
      };

      const session: Session = {
        id: sessionId,
        status: "active",
        browser: browserName,
        profile,
        isolation,
        headless,
        createdAt: now,
        updatedAt: now,
        activeTabId: tabId,
      };

      const state: BrowserSessionState = {
        session,
        browser,
        context,
        tabs: new Map([[tabId, { tab, page }]]),
        activeTabId: tabId,
      };

      this.sessions.set(sessionId, state);
      return { session, tabs: [tab] };
    } catch (error) {
      toDriverError(error, "BROWSER_LAUNCH_FAILED");
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const state = this.getSessionState(sessionId);
    try {
      await state.context.close();
      await state.browser.close();
      state.session.status = "closed";
      state.session.updatedAt = createTimestamp();
      this.sessions.delete(sessionId);
    } catch (error) {
      toDriverError(error, "SESSION_NOT_FOUND");
    }
  }

  listTabs(sessionId: string): BrowserTab[] {
    const state = this.getSessionState(sessionId);
    return Array.from(state.tabs.values()).map(({ tab }) => ({
      ...tab,
      active: tab.id === state.activeTabId,
    }));
  }

  async createTab(sessionId: string, url?: string): Promise<BrowserTab> {
    const state = this.getSessionState(sessionId);
    try {
      const page = await state.context.newPage();
      if (url) {
        await page.goto(url, { waitUntil: "domcontentloaded" });
      }

      const tabId = createId(ID_PREFIXES.tab);
      const tab: BrowserTab = {
        id: tabId,
        sessionId,
        url: page.url(),
        title: await page.title(),
        active: false,
      };

      state.tabs.set(tabId, { tab, page });
      state.session.updatedAt = createTimestamp();
      return tab;
    } catch (error) {
      toDriverError(error, "NAVIGATION_FAILED");
    }
  }

  async selectTab(sessionId: string, tabId: string): Promise<BrowserTab> {
    const state = this.getSessionState(sessionId);
    const tabState = state.tabs.get(tabId);
    if (!tabState) {
      throw new PlaywrightDriverError(
        runtimeError({
          code: "SESSION_NOT_FOUND",
          message: `Tab not found: ${tabId}`,
          category: "session",
        }),
      );
    }

    await tabState.page.bringToFront();
    state.activeTabId = tabId;
    tabState.tab.active = true;
    tabState.tab.url = tabState.page.url();
    tabState.tab.title = await tabState.page.title();

    for (const [id, entry] of state.tabs) {
      entry.tab.active = id === tabId;
    }

    state.session.activeTabId = tabId;
    state.session.updatedAt = createTimestamp();
    return { ...tabState.tab, active: true };
  }

  getActivePage(sessionId: string): Page {
    const state = this.getSessionState(sessionId);
    const tabState = state.tabs.get(state.activeTabId);
    if (!tabState) {
      throw new PlaywrightDriverError(
        runtimeError({
          code: "SESSION_NOT_FOUND",
          message: `Active tab not found for session ${sessionId}`,
          category: "session",
        }),
      );
    }
    return tabState.page;
  }

  getSession(sessionId: string): Session {
    return { ...this.getSessionState(sessionId).session };
  }

  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  listSessions(): Session[] {
    return Array.from(this.sessions.values()).map((state) => ({ ...state.session }));
  }

  private getSessionState(sessionId: string): BrowserSessionState {
    const state = this.sessions.get(sessionId);
    if (!state) {
      throw new PlaywrightDriverError(
        runtimeError({
          code: "SESSION_NOT_FOUND",
          message: `Session not found: ${sessionId}`,
          category: "session",
        }),
      );
    }
    return state;
  }
}
