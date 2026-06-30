import { z } from "zod";

import { BoundingBoxSchema, LocatorHintsSchema, SchemaVersionSchema } from "./schemas.js";

export const ObservedPageSchema = z.object({
  url: z.string(),
  title: z.string(),
  stable: z.boolean(),
  loading: z.boolean(),
  viewport: z.object({
    width: z.number(),
    height: z.number(),
  }),
});

export type ObservedPage = z.infer<typeof ObservedPageSchema>;

export const ObservationWarningSchema = z.object({
  code: z.string(),
  message: z.string(),
  severity: z.enum(["info", "warning", "error"]),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ObservationWarning = z.infer<typeof ObservationWarningSchema>;

export const ObservationArtifactsSchema = z.object({
  screenshotPath: z.string().optional(),
  snapshotPath: z.string().optional(),
});

export type ObservationArtifacts = z.infer<typeof ObservationArtifactsSchema>;

export const ObservedElementSchema = z.object({
  id: z.string(),
  role: z.string(),
  name: z.string().optional(),
  text: z.string().optional(),
  bbox: BoundingBoxSchema.optional(),
  visible: z.boolean(),
  enabled: z.boolean(),
  checked: z.boolean().optional(),
  selected: z.boolean().optional(),
  value: z.string().optional(),
  locatorHints: LocatorHintsSchema,
  confidence: z.number().min(0).max(1),
});

export type ObservedElement = z.infer<typeof ObservedElementSchema>;

export const ObservationSchema = z.object({
  id: z.string(),
  schemaVersion: SchemaVersionSchema,
  sessionId: z.string(),
  tabId: z.string(),
  timestamp: z.string().datetime(),
  page: ObservedPageSchema,
  elements: z.array(ObservedElementSchema),
  warnings: z.array(ObservationWarningSchema),
  artifacts: ObservationArtifactsSchema.optional(),
  raw: z
    .object({
      accessibilitySnapshot: z.unknown().optional(),
    })
    .optional(),
});

export type Observation = z.infer<typeof ObservationSchema>;

export const ObserveRequestSchema = z.object({
  includeScreenshot: z.boolean().optional(),
  includeRawSnapshot: z.boolean().optional(),
  maxElements: z.number().positive().optional(),
});

export type ObserveRequest = z.infer<typeof ObserveRequestSchema>;

export const ObserveResponseSchema = z.object({
  observation: ObservationSchema,
});

export type ObserveResponse = z.infer<typeof ObserveResponseSchema>;
