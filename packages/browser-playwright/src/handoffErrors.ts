import { runtimeError, type RuntimeError } from "@actos/core";

export class SessionPausedError extends Error {
  readonly runtimeError: RuntimeError;

  constructor(message = "Session is paused for human handoff") {
    const runtimeErr = runtimeError({
      code: "SESSION_PAUSED",
      message,
    });
    super(runtimeErr.message);
    this.name = "SessionPausedError";
    this.runtimeError = runtimeErr;
  }
}
