import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";

import type { FastifyInstance } from "fastify";

import {
  CreateCheckpointResponseSchema,
  CreateSessionResponseSchema,
  GetTraceResponseSchema,
  ObserveResponseSchema,
  PauseHandoffResponseSchema,
  ResumeHandoffResponseSchema,
} from "@actos/core";
import { buildScreenshotPath } from "@actos/browser-playwright";

import { badRequest, toHttpError } from "./errors.js";
import type { ActOSRuntimeService } from "./runtime.js";
import { assertSessionExists } from "./runtime.js";
import {
  ActRequestBodySchema,
  ActResponseSchema,
  CreateCheckpointRequestSchema,
  CreateSessionRequestSchema,
  HandoffRequestSchema,
  ListSessionsResponseSchema,
  ObserveRequestSchema,
  SessionParamsSchema,
} from "./schemas.js";
import { z } from "zod";

function parseParams(params: unknown) {
  const parsed = SessionParamsSchema.safeParse(params);
  if (!parsed.success) {
    badRequest("Invalid session id", { issues: parsed.error.issues });
  }
  return parsed.data;
}

function parseBody<T>(schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: { issues: unknown } } }, body: unknown): T {
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) {
    badRequest("Invalid request body", { issues: parsed.error.issues });
  }
  return parsed.data;
}

export type RegisterRouteOptions = {
  artifactRoot: string;
};

function parseScreenshotParams(params: unknown) {
  const parsed = SessionParamsSchema.extend({
    observationId: z.string().min(1),
  }).safeParse(params);
  if (!parsed.success) {
    badRequest("Invalid screenshot params", { issues: parsed.error.issues });
  }
  return parsed.data;
}

export function registerRoutes(
  app: FastifyInstance,
  runtime: ActOSRuntimeService,
  options: RegisterRouteOptions,
): void {
  app.post("/sessions", async (request) => {
    const body = parseBody(CreateSessionRequestSchema, request.body);
    const handle = await runtime.createSession(body);
    return CreateSessionResponseSchema.parse({ session: handle.session });
  });

  app.get("/sessions", async () => {
    const sessions = runtime.listSessions();
    return ListSessionsResponseSchema.parse({ sessions });
  });

  app.get("/sessions/:sessionId", async (request) => {
    const { sessionId } = parseParams(request.params);
    try {
      assertSessionExists(runtime, sessionId);
      return { session: runtime.getSession(sessionId) };
    } catch (error) {
      throw toHttpError(error);
    }
  });

  app.delete("/sessions/:sessionId", async (request, reply) => {
    const { sessionId } = parseParams(request.params);
    try {
      assertSessionExists(runtime, sessionId);
      await runtime.closeSession(sessionId);
      return reply.status(204).send();
    } catch (error) {
      throw toHttpError(error);
    }
  });

  app.post("/sessions/:sessionId/observe", async (request) => {
    const { sessionId } = parseParams(request.params);
    const body = parseBody(ObserveRequestSchema, request.body);
    try {
      assertSessionExists(runtime, sessionId);
      const observation = await runtime.observe(sessionId, body);
      return ObserveResponseSchema.parse({ observation });
    } catch (error) {
      throw toHttpError(error);
    }
  });

  app.post("/sessions/:sessionId/act", async (request) => {
    const { sessionId } = parseParams(request.params);
    const body = parseBody(ActRequestBodySchema, request.body);
    try {
      assertSessionExists(runtime, sessionId);
      const result = await runtime.act(sessionId, body.action);
      return ActResponseSchema.parse({ result });
    } catch (error) {
      throw toHttpError(error);
    }
  });

  app.post("/sessions/:sessionId/checkpoints", async (request) => {
    const { sessionId } = parseParams(request.params);
    const body = parseBody(CreateCheckpointRequestSchema, request.body);
    try {
      assertSessionExists(runtime, sessionId);
      const checkpoint = await runtime.checkpoint(sessionId, body.label);
      return CreateCheckpointResponseSchema.parse({ checkpoint });
    } catch (error) {
      throw toHttpError(error);
    }
  });

  app.post("/sessions/:sessionId/handoff/pause", async (request) => {
    const { sessionId } = parseParams(request.params);
    const body = parseBody(HandoffRequestSchema, request.body);
    try {
      assertSessionExists(runtime, sessionId);
      const handoff = await runtime.pauseForHuman(sessionId, body);
      return PauseHandoffResponseSchema.parse({ handoff });
    } catch (error) {
      throw toHttpError(error);
    }
  });

  app.post("/sessions/:sessionId/handoff/resume", async (request) => {
    const { sessionId } = parseParams(request.params);
    try {
      assertSessionExists(runtime, sessionId);
      const response = await runtime.resume(sessionId);
      return ResumeHandoffResponseSchema.parse(response);
    } catch (error) {
      throw toHttpError(error);
    }
  });

  app.get("/sessions/:sessionId/trace", async (request) => {
    const { sessionId } = parseParams(request.params);
    try {
      assertSessionExists(runtime, sessionId);
      const events = await runtime.getTrace(sessionId);
      return GetTraceResponseSchema.parse({ events });
    } catch (error) {
      throw toHttpError(error);
    }
  });

  app.get("/sessions/:sessionId/artifacts/screenshot/:observationId", async (request, reply) => {
    const { sessionId, observationId } = parseScreenshotParams(request.params);
    try {
      assertSessionExists(runtime, sessionId);
      const screenshotPath = buildScreenshotPath(options.artifactRoot, sessionId, observationId);
      await access(screenshotPath);
      return reply.type("image/png").send(createReadStream(screenshotPath));
    } catch (error) {
      throw toHttpError(error);
    }
  });
}
