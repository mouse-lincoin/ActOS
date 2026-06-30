import { describe, expect, it } from "vitest";

import {
  SCHEMA_VERSION,
  ID_PREFIXES,
  createId,
  createTimestamp,
  hasIdPrefix,
} from "../src/index.js";

describe("ids", () => {
  it("exports schema version 0.1", () => {
    expect(SCHEMA_VERSION).toBe("0.1");
  });

  it("generates prefixed IDs", () => {
    const id = createId(ID_PREFIXES.session);
    expect(id.startsWith("ses_")).toBe(true);
    expect(id.length).toBeGreaterThan("ses_".length);
  });

  it("generates unique IDs", () => {
    const a = createId(ID_PREFIXES.observation);
    const b = createId(ID_PREFIXES.observation);
    expect(a).not.toBe(b);
  });

  it("validates ID prefix", () => {
    const id = createId(ID_PREFIXES.trace);
    expect(hasIdPrefix(id, ID_PREFIXES.trace)).toBe(true);
    expect(hasIdPrefix(id, ID_PREFIXES.session)).toBe(false);
  });

  it("creates ISO timestamps", () => {
    const date = new Date("2026-06-30T12:00:00.000Z");
    expect(createTimestamp(date)).toBe("2026-06-30T12:00:00.000Z");
  });
});

describe("placeholder", () => {
  it("core package test runner is wired", () => {
    expect(true).toBe(true);
  });
});
