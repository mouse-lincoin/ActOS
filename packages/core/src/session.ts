import { z } from "zod";

export const BrowserNameSchema = z.enum(["chromium", "firefox", "webkit"]);
export const SessionStatusSchema = z.enum(["active", "paused", "closed", "failed"]);
export const IsolationModeSchema = z.enum(["strict", "shared"]);

export type BrowserName = z.infer<typeof BrowserNameSchema>;
export type SessionStatus = z.infer<typeof SessionStatusSchema>;
export type IsolationMode = z.infer<typeof IsolationModeSchema>;

export const SessionSchema = z.object({
  id: z.string(),
  status: SessionStatusSchema,
  browser: BrowserNameSchema,
  profile: z.string(),
  isolation: IsolationModeSchema,
  headless: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  activeTabId: z.string().optional(),
});

export type Session = z.infer<typeof SessionSchema>;

export const CreateSessionRequestSchema = z.object({
  startUrl: z.string().url().optional(),
  browser: BrowserNameSchema.optional(),
  headless: z.boolean().optional(),
  profile: z.string().optional(),
  isolation: IsolationModeSchema.optional(),
  viewport: z
    .object({
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
});

export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

export const CreateSessionResponseSchema = z.object({
  session: SessionSchema,
});

export type CreateSessionResponse = z.infer<typeof CreateSessionResponseSchema>;

export const BrowserTabSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  url: z.string(),
  title: z.string(),
  active: z.boolean(),
});

export type BrowserTab = z.infer<typeof BrowserTabSchema>;
