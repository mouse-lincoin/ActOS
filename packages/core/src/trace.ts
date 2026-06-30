import { z } from "zod";

import { SchemaVersionSchema } from "./schemas.js";

export const TraceEventTypeSchema = z.enum([
  "session.created",
  "session.closed",
  "tab.created",
  "tab.selected",
  "observe.started",
  "observe.completed",
  "observe.failed",
  "action.started",
  "action.completed",
  "action.failed",
  "checkpoint.created",
  "handoff.started",
  "handoff.resumed",
  "handoff.cancelled",
  "artifact.created",
  "error.raised",
]);

export type TraceEventType = z.infer<typeof TraceEventTypeSchema>;

export const TraceEventSchema = z.object({
  id: z.string(),
  schemaVersion: SchemaVersionSchema,
  sessionId: z.string(),
  tabId: z.string().optional(),
  timestamp: z.string().datetime(),
  type: TraceEventTypeSchema,
  payload: z.record(z.string(), z.unknown()),
});

export type TraceEvent = z.infer<typeof TraceEventSchema>;

export const GetTraceResponseSchema = z.object({
  events: z.array(TraceEventSchema),
});

export type GetTraceResponse = z.infer<typeof GetTraceResponseSchema>;
