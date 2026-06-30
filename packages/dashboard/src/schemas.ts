import { z } from "zod";

export const SCHEMA_VERSION = "0.1";

const SessionSchema = z.object({
  id: z.string(),
  status: z.enum(["active", "paused", "closed"]),
  browser: z.enum(["chromium", "firefox", "webkit"]),
  profile: z.string(),
  isolation: z.enum(["strict", "shared"]),
  headless: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  activeTabId: z.string().optional(),
});

const ObservedPageSchema = z.object({
  url: z.string(),
  title: z.string(),
  stable: z.boolean(),
  loading: z.boolean(),
  viewport: z.object({
    width: z.number(),
    height: z.number(),
  }),
});

const ObservationSchema = z.object({
  id: z.string(),
  schemaVersion: z.string(),
  sessionId: z.string(),
  tabId: z.string(),
  timestamp: z.string(),
  page: ObservedPageSchema,
  elements: z.array(z.record(z.string(), z.unknown())),
  warnings: z.array(z.record(z.string(), z.unknown())),
  artifacts: z
    .object({
      screenshotPath: z.string().optional(),
    })
    .optional(),
});

const ActionTargetSchema = z.object({
  role: z.string().optional(),
  name: z.string().optional(),
  label: z.string().optional(),
  placeholder: z.string().optional(),
  testId: z.string().optional(),
  selector: z.string().optional(),
  coordinates: z
    .object({
      x: z.number(),
      y: z.number(),
      reason: z.string(),
    })
    .optional(),
});

const AgentActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("navigate"), url: z.string() }),
  z.object({ type: z.literal("click"), target: ActionTargetSchema }),
  z.object({ type: z.literal("fill"), target: ActionTargetSchema, value: z.string() }),
  z.object({ type: z.literal("press"), key: z.string() }),
  z.object({ type: z.literal("select"), target: ActionTargetSchema, value: z.string() }),
  z.object({ type: z.literal("scroll"), direction: z.enum(["up", "down", "left", "right"]), amount: z.number() }),
  z.object({ type: z.literal("wait"), ms: z.number().optional(), condition: z.string().optional() }),
]);

const RuntimeErrorSchema = z.object({
  id: z.string(),
  code: z.string(),
  message: z.string(),
  category: z.string(),
  recoverable: z.boolean(),
  details: z.record(z.string(), z.unknown()).optional(),
});

const ActionResultSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  tabId: z.string(),
  status: z.enum(["success", "failed"]),
  action: AgentActionSchema,
  timestamp: z.string(),
  error: RuntimeErrorSchema.optional(),
  observationBeforeId: z.string().optional(),
  observationAfterId: z.string().optional(),
});

const TraceEventSchema = z.object({
  id: z.string(),
  schemaVersion: z.string(),
  sessionId: z.string(),
  timestamp: z.string(),
  type: z.string(),
  payload: z.record(z.string(), z.unknown()),
  tabId: z.string().optional(),
});

const HandoffStateSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  status: z.enum(["paused", "resumed"]),
  reason: z.string(),
  instructions: z.string().optional(),
  startedAt: z.string(),
  resumedAt: z.string().optional(),
});

const CheckpointSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  label: z.string(),
  timestamp: z.string(),
  observationId: z.string().optional(),
  screenshotPath: z.string().optional(),
});

export const CreateSessionRequestSchema = z.object({
  startUrl: z.string().optional(),
  headless: z.boolean().optional(),
  browser: z.enum(["chromium", "firefox", "webkit"]).optional(),
});

export const CreateSessionResponseSchema = z.object({
  session: SessionSchema,
});

export const ListSessionsResponseSchema = z.object({
  sessions: z.array(SessionSchema),
});

export const GetSessionResponseSchema = z.object({
  session: SessionSchema,
});

export const ObserveResponseSchema = z.object({
  observation: ObservationSchema,
});

export const ActResponseSchema = z.object({
  result: ActionResultSchema,
});

export const CreateCheckpointResponseSchema = z.object({
  checkpoint: CheckpointSchema,
});

export const PauseHandoffResponseSchema = z.object({
  handoff: HandoffStateSchema,
});

export const ResumeHandoffResponseSchema = z.object({
  handoff: HandoffStateSchema,
  observation: ObservationSchema,
});

export const GetTraceResponseSchema = z.object({
  events: z.array(TraceEventSchema),
});

export { RuntimeErrorSchema };

export function fallbackRuntimeError(message: string): z.infer<typeof RuntimeErrorSchema> {
  return {
    id: "err_dashboard_fallback",
    code: "UNKNOWN_RUNTIME_ERROR",
    message,
    category: "unknown",
    recoverable: true,
  };
}
