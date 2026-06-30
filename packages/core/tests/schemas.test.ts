import { describe, expect, it } from "vitest";

import {
  SCHEMA_VERSION,
  SessionSchema,
  ObservationSchema,
  AgentActionSchema,
  RuntimeErrorSchema,
  TraceEventSchema,
  ActionTargetSchema,
  CheckpointSchema,
  HandoffStateSchema,
  RuntimeArtifactSchema,
} from "../src/index.js";

const exampleSession = {
  id: "ses_abc123",
  status: "active" as const,
  browser: "chromium" as const,
  profile: "default",
  isolation: "strict" as const,
  headless: false,
  createdAt: "2026-06-30T00:00:00.000Z",
  updatedAt: "2026-06-30T00:00:00.000Z",
  activeTabId: "tab_abc123",
};

const exampleObservation = {
  id: "obs_001",
  schemaVersion: SCHEMA_VERSION,
  sessionId: "ses_abc123",
  tabId: "tab_001",
  timestamp: "2026-06-30T00:00:01.000Z",
  page: {
    url: "http://localhost:3001/orders",
    title: "Mock Admin",
    stable: true,
    loading: false,
    viewport: { width: 1280, height: 900 },
  },
  elements: [
    {
      id: "elm_001",
      role: "button",
      name: "Search",
      visible: true,
      enabled: true,
      locatorHints: { role: "button", name: "Search" },
      confidence: 0.95,
    },
  ],
  warnings: [],
};

const exampleActions = [
  { type: "navigate" as const, url: "http://localhost:3001" },
  { type: "click" as const, target: { role: "button", name: "Search" } },
  { type: "fill" as const, target: { label: "Email" }, value: "demo@example.com" },
  { type: "press" as const, key: "Enter" },
  { type: "select" as const, target: { label: "Status" }, value: "pending" },
  { type: "scroll" as const, direction: "down" as const, amount: "medium" as const },
  { type: "wait" as const, until: { type: "pageStable" as const } },
];

const exampleRuntimeError = {
  id: "err_001",
  code: "TARGET_NOT_FOUND" as const,
  message: "No matching element found",
  category: "targeting" as const,
  recoverable: true,
};

const exampleTraceEvent = {
  id: "trc_001",
  schemaVersion: SCHEMA_VERSION,
  sessionId: "ses_abc123",
  timestamp: "2026-06-30T00:00:00.000Z",
  type: "session.created" as const,
  payload: {
    session: {
      id: "ses_abc123",
      browser: "chromium",
      profile: "default",
      isolation: "strict",
      headless: false,
    },
    startUrl: "http://localhost:3001",
  },
};

describe("schemas", () => {
  it("parses a valid Session", () => {
    expect(SessionSchema.parse(exampleSession)).toEqual(exampleSession);
  });

  it("parses a valid Observation", () => {
    expect(ObservationSchema.parse(exampleObservation)).toEqual(exampleObservation);
  });

  it("parses all P0 action types", () => {
    for (const action of exampleActions) {
      expect(AgentActionSchema.parse(action)).toEqual(action);
    }
  });

  it("parses RuntimeError", () => {
    expect(RuntimeErrorSchema.parse(exampleRuntimeError)).toEqual(exampleRuntimeError);
  });

  it("parses TraceEvent", () => {
    expect(TraceEventSchema.parse(exampleTraceEvent)).toEqual(exampleTraceEvent);
  });

  it("parses Checkpoint", () => {
    const checkpoint = {
      id: "chk_001",
      sessionId: "ses_abc123",
      label: "after-search",
      timestamp: "2026-06-30T00:01:00.000Z",
    };
    expect(CheckpointSchema.parse(checkpoint)).toEqual(checkpoint);
  });

  it("parses HandoffState", () => {
    const handoff = {
      id: "hnd_001",
      sessionId: "ses_abc123",
      status: "paused" as const,
      reason: "Login required",
      startedAt: "2026-06-30T00:02:00.000Z",
    };
    expect(HandoffStateSchema.parse(handoff)).toEqual(handoff);
  });

  it("parses RuntimeArtifact", () => {
    const artifact = {
      id: "art_001",
      type: "screenshot",
      path: ".actos/artifacts/ses_abc123/screenshots/obs_001.png",
      mimeType: "image/png",
      relatedObservationId: "obs_001",
    };
    expect(RuntimeArtifactSchema.parse(artifact)).toEqual(artifact);
  });
});

describe("invalid schemas", () => {
  it("rejects coordinate target without reason", () => {
    const result = ActionTargetSchema.safeParse({
      coordinates: { x: 100, y: 200, reason: "" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects coordinate target with whitespace-only reason", () => {
    const result = ActionTargetSchema.safeParse({
      coordinates: { x: 100, y: 200, reason: "   " },
    });
    expect(result.success).toBe(false);
  });

  it("accepts coordinate target with explicit reason", () => {
    const result = ActionTargetSchema.safeParse({
      coordinates: { x: 100, y: 200, reason: "semantic targeting failed" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid session status", () => {
    const result = SessionSchema.safeParse({
      ...exampleSession,
      status: "invalid",
    });
    expect(result.success).toBe(false);
  });
});
