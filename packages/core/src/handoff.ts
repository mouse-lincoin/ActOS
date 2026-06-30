import { z } from "zod";

import { RiskLevelSchema } from "./schemas.js";
import { ObservationSchema } from "./observation.js";

export const HandoffRequestSchema = z.object({
  reason: z.string().min(1),
  instructions: z.string().optional(),
  riskLevel: RiskLevelSchema.optional(),
});

export type HandoffRequest = z.infer<typeof HandoffRequestSchema>;

export const HandoffStateSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  status: z.enum(["requested", "paused", "resumed", "cancelled"]),
  reason: z.string(),
  instructions: z.string().optional(),
  startedAt: z.string().datetime(),
  resumedAt: z.string().datetime().optional(),
});

export type HandoffState = z.infer<typeof HandoffStateSchema>;

export const PauseHandoffResponseSchema = z.object({
  handoff: HandoffStateSchema,
});

export type PauseHandoffResponse = z.infer<typeof PauseHandoffResponseSchema>;

export const ResumeHandoffResponseSchema = z.object({
  handoff: HandoffStateSchema,
  observation: ObservationSchema,
});

export type ResumeHandoffResponse = z.infer<typeof ResumeHandoffResponseSchema>;
