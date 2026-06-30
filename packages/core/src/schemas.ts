import { z } from "zod";

import { SCHEMA_VERSION } from "./ids.js";

export const SchemaVersionSchema = z.literal(SCHEMA_VERSION);

export const BoundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

export const LocatorHintsSchema = z.object({
  role: z.string().optional(),
  name: z.string().optional(),
  text: z.string().optional(),
  label: z.string().optional(),
  placeholder: z.string().optional(),
  testId: z.string().optional(),
  selector: z.string().optional(),
});

export type LocatorHints = z.infer<typeof LocatorHintsSchema>;

export const RiskLevelSchema = z.enum(["low", "medium", "high", "blocked"]);

export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const RuntimeArtifactSchema = z.object({
  id: z.string(),
  type: z.string(),
  path: z.string(),
  mimeType: z.string(),
  relatedObservationId: z.string().optional(),
  relatedActionId: z.string().optional(),
});

export type RuntimeArtifact = z.infer<typeof RuntimeArtifactSchema>;
