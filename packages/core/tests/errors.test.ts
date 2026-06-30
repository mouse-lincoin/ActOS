import { describe, expect, it } from "vitest";

import {
  ErrorCodeSchema,
  ErrorCategorySchema,
  fromUnknownError,
  isRecoverableError,
  isRuntimeError,
  runtimeError,
} from "../src/index.js";

describe("errors", () => {
  it("exports error code enum values", () => {
    expect(ErrorCodeSchema.options).toContain("TARGET_NOT_FOUND");
    expect(ErrorCodeSchema.options).toContain("UNKNOWN_RUNTIME_ERROR");
  });

  it("exports error category enum values", () => {
    expect(ErrorCategorySchema.options).toContain("targeting");
    expect(ErrorCategorySchema.options).toContain("unknown");
  });

  it("creates structured runtime errors with defaults", () => {
    const error = runtimeError({
      code: "TARGET_NOT_FOUND",
      message: "Button not found",
    });

    expect(error.code).toBe("TARGET_NOT_FOUND");
    expect(error.message).toBe("Button not found");
    expect(error.category).toBe("targeting");
    expect(error.recoverable).toBe(true);
    expect(error.id.startsWith("err_")).toBe(true);
  });

  it("allows overriding category and recoverable", () => {
    const error = runtimeError({
      code: "SESSION_NOT_FOUND",
      message: "Missing session",
      category: "session",
      recoverable: false,
    });

    expect(error.category).toBe("session");
    expect(error.recoverable).toBe(false);
  });

  it("identifies recoverable errors", () => {
    const recoverable = runtimeError({
      code: "STABILITY_TIMEOUT",
      message: "Page did not stabilize",
    });
    const fatal = runtimeError({
      code: "BROWSER_LAUNCH_FAILED",
      message: "Browser failed to launch",
    });

    expect(isRecoverableError(recoverable)).toBe(true);
    expect(isRecoverableError(fatal)).toBe(false);
  });

  it("converts raw Error into UnknownRuntimeError", () => {
    const raw = new Error("Something broke");
    const error = fromUnknownError(raw);

    expect(error.code).toBe("UNKNOWN_RUNTIME_ERROR");
    expect(error.category).toBe("unknown");
    expect(error.recoverable).toBe(false);
    expect(error.message).toBe("Something broke");
    expect(error.details?.name).toBe("Error");
  });

  it("converts unknown values into UnknownRuntimeError", () => {
    const error = fromUnknownError("unexpected failure", "Wrapped failure");

    expect(error.code).toBe("UNKNOWN_RUNTIME_ERROR");
    expect(error.message).toBe("Wrapped failure");
  });

  it("returns existing RuntimeError unchanged", () => {
    const existing = runtimeError({
      code: "SESSION_PAUSED",
      message: "Session is paused",
    });

    expect(fromUnknownError(existing)).toBe(existing);
    expect(isRuntimeError(existing)).toBe(true);
  });
});
