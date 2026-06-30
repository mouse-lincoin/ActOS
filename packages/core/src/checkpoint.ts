import { z } from "zod";

export const CheckpointSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  label: z.string(),
  timestamp: z.string().datetime(),
  observationId: z.string().optional(),
  screenshotPath: z.string().optional(),
});

export type Checkpoint = z.infer<typeof CheckpointSchema>;

export const CreateCheckpointRequestSchema = z.object({
  label: z.string().min(1),
});

export type CreateCheckpointRequest = z.infer<typeof CreateCheckpointRequestSchema>;

export const CreateCheckpointResponseSchema = z.object({
  checkpoint: CheckpointSchema,
});

export type CreateCheckpointResponse = z.infer<typeof CreateCheckpointResponseSchema>;
