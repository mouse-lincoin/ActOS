import { randomBytes } from "node:crypto";

/** ActOS schema version for all v0 contracts. */
export const SCHEMA_VERSION = "0.1" as const;

/** Opaque ID prefixes used across ActOS Runtime v0. */
export const ID_PREFIXES = {
  session: "ses_",
  observation: "obs_",
  element: "elm_",
  tab: "tab_",
  action: "act_",
  trace: "trc_",
  artifact: "art_",
  checkpoint: "chk_",
  handoff: "hnd_",
  error: "err_",
} as const;

export type IdPrefix = (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES];

/**
 * Generate an opaque prefixed ID.
 * The prefix must include the trailing underscore (e.g. `ses_`).
 */
export function createId(prefix: IdPrefix | string): string {
  const suffix = randomBytes(12).toString("hex");
  return `${prefix}${suffix}`;
}

/** Return an ISO-8601 timestamp for runtime events. */
export function createTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

/** Validate that an ID string starts with the expected prefix. */
export function hasIdPrefix(id: string, prefix: IdPrefix | string): boolean {
  return id.startsWith(prefix);
}
