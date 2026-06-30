import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  createId,
  createTimestamp,
  ID_PREFIXES,
  SCHEMA_VERSION,
  runtimeError,
  TraceEventSchema,
  type TraceEvent,
  type TraceEventType,
} from "@actos/core";

import { DEFAULT_ARTIFACT_ROOT, getArtifactRoot, type ArtifactConfig } from "./artifacts.js";

export type TraceStoreConfig = ArtifactConfig;

export function buildTraceDir(artifactRoot: string): string {
  return path.join(artifactRoot, "traces");
}

export function buildTraceFilePath(artifactRoot: string, sessionId: string): string {
  return path.join(buildTraceDir(artifactRoot), `${sessionId}.jsonl`);
}

export class TraceStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TraceStoreError";
  }
}

/** Append-only JSONL trace store for ActOS Runtime v0. */
export class JsonlTraceStore {
  private readonly artifactRoot: string;

  constructor(config: TraceStoreConfig = {}) {
    this.artifactRoot = getArtifactRoot(config);
  }

  getTraceFilePath(sessionId: string): string {
    return buildTraceFilePath(this.artifactRoot, sessionId);
  }

  createEvent(
    sessionId: string,
    type: TraceEventType,
    payload: Record<string, unknown>,
    tabId?: string,
  ): TraceEvent {
    return {
      id: createId(ID_PREFIXES.trace),
      schemaVersion: SCHEMA_VERSION,
      sessionId,
      tabId,
      timestamp: createTimestamp(),
      type,
      payload,
    };
  }

  async append(event: TraceEvent): Promise<void> {
    const parsed = TraceEventSchema.safeParse(event);
    if (!parsed.success) {
      throw new TraceStoreError(`Invalid trace event: ${parsed.error.message}`);
    }

    const filePath = this.getTraceFilePath(event.sessionId);
    await mkdir(path.dirname(filePath), { recursive: true });

    try {
      await appendFile(filePath, `${JSON.stringify(parsed.data)}\n`, "utf8");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new TraceStoreError(
        runtimeError({
          code: "TRACE_WRITE_FAILED",
          message: `Failed to write trace event: ${message}`,
        }).message,
      );
    }
  }

  async getTrace(sessionId: string): Promise<TraceEvent[]> {
    const filePath = this.getTraceFilePath(sessionId);

    try {
      const content = await readFile(filePath, "utf8");
      if (!content.trim()) {
        return [];
      }

      return content
        .trim()
        .split("\n")
        .map((line, index) => {
          try {
            return TraceEventSchema.parse(JSON.parse(line));
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new TraceStoreError(`Invalid trace line ${index + 1}: ${message}`);
          }
        });
    } catch (error) {
      if (isENOENT(error)) {
        return [];
      }
      throw error;
    }
  }
}

function isENOENT(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

export { DEFAULT_ARTIFACT_ROOT };
