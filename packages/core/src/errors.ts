import { z } from "zod";

import { createId, ID_PREFIXES } from "./ids.js";

export const ErrorCategorySchema = z.enum([
  "session",
  "browser",
  "observation",
  "targeting",
  "action",
  "stability",
  "policy",
  "handoff",
  "trace",
  "unknown",
]);

export type ErrorCategory = z.infer<typeof ErrorCategorySchema>;

export const ErrorCodeSchema = z.enum([
  "SESSION_NOT_FOUND",
  "SESSION_PAUSED",
  "BROWSER_LAUNCH_FAILED",
  "NAVIGATION_FAILED",
  "OBSERVATION_FAILED",
  "TARGET_NOT_FOUND",
  "TARGET_AMBIGUOUS",
  "ELEMENT_NOT_VISIBLE",
  "ELEMENT_DISABLED",
  "ACTION_TIMEOUT",
  "STABILITY_TIMEOUT",
  "POLICY_DENIED",
  "HUMAN_HANDOFF_REQUIRED",
  "TRACE_WRITE_FAILED",
  "UNKNOWN_RUNTIME_ERROR",
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const RuntimeErrorSchema = z.object({
  id: z.string(),
  code: ErrorCodeSchema,
  message: z.string(),
  category: ErrorCategorySchema,
  recoverable: z.boolean(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type RuntimeError = z.infer<typeof RuntimeErrorSchema>;

const DEFAULT_RECOVERABLE: Record<ErrorCode, boolean> = {
  SESSION_NOT_FOUND: false,
  SESSION_PAUSED: true,
  BROWSER_LAUNCH_FAILED: false,
  NAVIGATION_FAILED: true,
  OBSERVATION_FAILED: true,
  TARGET_NOT_FOUND: true,
  TARGET_AMBIGUOUS: true,
  ELEMENT_NOT_VISIBLE: true,
  ELEMENT_DISABLED: true,
  ACTION_TIMEOUT: true,
  STABILITY_TIMEOUT: true,
  POLICY_DENIED: false,
  HUMAN_HANDOFF_REQUIRED: true,
  TRACE_WRITE_FAILED: false,
  UNKNOWN_RUNTIME_ERROR: false,
};

const DEFAULT_CATEGORY: Record<ErrorCode, ErrorCategory> = {
  SESSION_NOT_FOUND: "session",
  SESSION_PAUSED: "session",
  BROWSER_LAUNCH_FAILED: "browser",
  NAVIGATION_FAILED: "browser",
  OBSERVATION_FAILED: "observation",
  TARGET_NOT_FOUND: "targeting",
  TARGET_AMBIGUOUS: "targeting",
  ELEMENT_NOT_VISIBLE: "targeting",
  ELEMENT_DISABLED: "targeting",
  ACTION_TIMEOUT: "action",
  STABILITY_TIMEOUT: "stability",
  POLICY_DENIED: "policy",
  HUMAN_HANDOFF_REQUIRED: "handoff",
  TRACE_WRITE_FAILED: "trace",
  UNKNOWN_RUNTIME_ERROR: "unknown",
};

export type RuntimeErrorInput = {
  code: ErrorCode;
  message: string;
  category?: ErrorCategory;
  recoverable?: boolean;
  details?: Record<string, unknown>;
  id?: string;
};

/** Create a structured runtime error with stable defaults for category and recoverability. */
export function runtimeError(input: RuntimeErrorInput): RuntimeError {
  const { code, message, details, id } = input;
  return {
    id: id ?? createId(ID_PREFIXES.error),
    code,
    message,
    category: input.category ?? DEFAULT_CATEGORY[code],
    recoverable: input.recoverable ?? DEFAULT_RECOVERABLE[code],
    ...(details !== undefined ? { details } : {}),
  };
}

/** Return true when the runtime error may be retried or recovered from. */
export function isRecoverableError(error: RuntimeError): boolean {
  return error.recoverable;
}

/** Convert a raw Error (or unknown value) into an UnknownRuntimeError. */
export function fromUnknownError(error: unknown, message?: string): RuntimeError {
  if (isRuntimeError(error)) {
    return error;
  }

  const resolvedMessage =
    message ??
    (error instanceof Error ? error.message : "An unknown runtime error occurred");

  const details: Record<string, unknown> = {};
  if (error instanceof Error && error.name) {
    details.name = error.name;
  }
  if (error instanceof Error && error.stack) {
    details.stack = error.stack;
  }

  return runtimeError({
    code: "UNKNOWN_RUNTIME_ERROR",
    message: resolvedMessage,
    details: Object.keys(details).length > 0 ? details : undefined,
  });
}

export function isRuntimeError(value: unknown): value is RuntimeError {
  return RuntimeErrorSchema.safeParse(value).success;
}
