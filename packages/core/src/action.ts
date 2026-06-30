import { z } from "zod";

import { ObservedElementSchema } from "./observation.js";
import { RuntimeErrorSchema } from "./errors.js";
import { BoundingBoxSchema, RuntimeArtifactSchema } from "./schemas.js";

const CoordinatesSchema = z.object({
  x: z.number(),
  y: z.number(),
  reason: z.string().min(1, "coordinates.reason is required"),
});

export const ActionTargetSchema = z
  .object({
    elementId: z.string().optional(),
    role: z.string().optional(),
    name: z.string().optional(),
    text: z.string().optional(),
    label: z.string().optional(),
    placeholder: z.string().optional(),
    testId: z.string().optional(),
    selector: z.string().optional(),
    coordinates: CoordinatesSchema.optional(),
  })
  .superRefine((target, ctx) => {
    if (target.coordinates !== undefined && target.coordinates.reason.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "coordinates.reason must be non-empty",
        path: ["coordinates", "reason"],
      });
    }
  });

export type ActionTarget = z.infer<typeof ActionTargetSchema>;

export const WaitConditionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("pageStable") }),
  z.object({ type: z.literal("textVisible"), text: z.string() }),
  z.object({ type: z.literal("urlContains"), value: z.string() }),
]);

export type WaitCondition = z.infer<typeof WaitConditionSchema>;

export const NavigateActionSchema = z.object({
  type: z.literal("navigate"),
  url: z.string(),
});

export const ClickActionSchema = z.object({
  type: z.literal("click"),
  target: ActionTargetSchema,
});

export const FillActionSchema = z.object({
  type: z.literal("fill"),
  target: ActionTargetSchema,
  value: z.string(),
  secret: z.boolean().optional(),
});

export const PressActionSchema = z.object({
  type: z.literal("press"),
  target: ActionTargetSchema.optional(),
  key: z.string(),
});

export const SelectActionSchema = z.object({
  type: z.literal("select"),
  target: ActionTargetSchema,
  value: z.union([z.string(), z.array(z.string())]),
});

export const ScrollActionSchema = z.object({
  type: z.literal("scroll"),
  direction: z.enum(["up", "down"]),
  amount: z.enum(["small", "medium", "large"]).optional(),
});

export const WaitActionSchema = z.object({
  type: z.literal("wait"),
  ms: z.number().nonnegative().optional(),
  until: WaitConditionSchema.optional(),
});

export const AgentActionSchema = z.discriminatedUnion("type", [
  NavigateActionSchema,
  ClickActionSchema,
  FillActionSchema,
  PressActionSchema,
  SelectActionSchema,
  ScrollActionSchema,
  WaitActionSchema,
]);

export type AgentAction = z.infer<typeof AgentActionSchema>;
export type NavigateAction = z.infer<typeof NavigateActionSchema>;
export type ClickAction = z.infer<typeof ClickActionSchema>;
export type FillAction = z.infer<typeof FillActionSchema>;
export type PressAction = z.infer<typeof PressActionSchema>;
export type SelectAction = z.infer<typeof SelectActionSchema>;
export type ScrollAction = z.infer<typeof ScrollActionSchema>;
export type WaitAction = z.infer<typeof WaitActionSchema>;

export const ResolvedTargetSchema = z.object({
  method: z.enum([
    "elementId",
    "testId",
    "roleName",
    "label",
    "placeholder",
    "text",
    "selector",
    "coordinates",
  ]),
  confidence: z.number().min(0).max(1),
  locatorDescription: z.string(),
  bbox: BoundingBoxSchema.optional(),
  element: ObservedElementSchema.optional(),
});

export type ResolvedTarget = z.infer<typeof ResolvedTargetSchema>;

export const ActionResultSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  tabId: z.string(),
  status: z.enum(["success", "failed", "needs_human"]),
  action: AgentActionSchema,
  observationBeforeId: z.string().optional(),
  observationAfterId: z.string().optional(),
  resolvedTarget: ResolvedTargetSchema.optional(),
  error: RuntimeErrorSchema.optional(),
  artifacts: z.array(RuntimeArtifactSchema).optional(),
  timestamp: z.string().datetime(),
});

export type ActionResult = z.infer<typeof ActionResultSchema>;
