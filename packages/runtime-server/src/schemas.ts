import { z } from "zod";

import {
  ActionResultSchema,
  AgentActionSchema,
  CreateCheckpointRequestSchema,
  CreateSessionRequestSchema,
  CreateSessionResponseSchema,
  HandoffRequestSchema,
  ObserveRequestSchema,
  ObserveResponseSchema,
  PauseHandoffResponseSchema,
  ResumeHandoffResponseSchema,
  SessionSchema,
  GetTraceResponseSchema,
} from "@actos/core";

export const ActRequestBodySchema = z.object({
  action: AgentActionSchema,
});

export type ActRequestBody = z.infer<typeof ActRequestBodySchema>;

export const ActResponseSchema = z.object({
  result: ActionResultSchema,
});

export const ListSessionsResponseSchema = z.object({
  sessions: z.array(SessionSchema),
});

export const SessionParamsSchema = z.object({
  sessionId: z.string().min(1),
});

export {
  CreateSessionRequestSchema,
  CreateSessionResponseSchema,
  ObserveRequestSchema,
  ObserveResponseSchema,
  CreateCheckpointRequestSchema,
  HandoffRequestSchema,
  PauseHandoffResponseSchema,
  ResumeHandoffResponseSchema,
  GetTraceResponseSchema,
};
