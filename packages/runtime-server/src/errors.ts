import { fromUnknownError, runtimeError, type RuntimeError } from "@actos/core";
import { SessionPausedError } from "@actos/browser-playwright";

export class ActOSHttpError extends Error {
  readonly statusCode: number;
  readonly runtimeError: RuntimeError;

  constructor(statusCode: number, runtimeError: RuntimeError) {
    super(runtimeError.message);
    this.name = "ActOSHttpError";
    this.statusCode = statusCode;
    this.runtimeError = runtimeError;
  }
}

export function notFound(message: string, details?: Record<string, unknown>): never {
  throw new ActOSHttpError(
    404,
    runtimeError({
      code: "SESSION_NOT_FOUND",
      message,
      details,
    }),
  );
}

export function badRequest(message: string, details?: Record<string, unknown>): never {
  throw new ActOSHttpError(
    400,
    runtimeError({
      code: "UNKNOWN_RUNTIME_ERROR",
      message,
      category: "unknown",
      recoverable: true,
      details,
    }),
  );
}

export function toHttpError(error: unknown): ActOSHttpError {
  if (error instanceof ActOSHttpError) {
    return error;
  }

  if (error instanceof SessionPausedError) {
    return new ActOSHttpError(409, error.runtimeError);
  }

  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Session not found")) {
    return new ActOSHttpError(404, runtimeError({ code: "SESSION_NOT_FOUND", message }));
  }

  const runtimeErr = fromUnknownError(error, message);
  return new ActOSHttpError(500, runtimeErr);
}

export type ErrorResponse = {
  error: RuntimeError;
};

export function errorResponse(error: RuntimeError): ErrorResponse {
  return { error };
}
