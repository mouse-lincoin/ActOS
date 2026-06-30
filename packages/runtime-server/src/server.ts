import Fastify, { type FastifyInstance } from "fastify";

import { fromUnknownError, runtimeError } from "@actos/core";
import { BrowserRuntime } from "@actos/browser-playwright";

import { ActOSHttpError, errorResponse } from "./errors.js";
import { asRuntimeService, type ActOSRuntimeService } from "./runtime.js";
import { registerRoutes } from "./routes.js";

export type CreateActOSServerOptions = {
  runtime?: ActOSRuntimeService;
  browserRuntime?: BrowserRuntime;
  artifactRoot?: string;
  headless?: boolean;
  logger?: boolean;
};

export type ActOSServer = {
  app: FastifyInstance;
  runtime: ActOSRuntimeService;
};

export async function createActOSServer(options: CreateActOSServerOptions = {}): Promise<ActOSServer> {
  const browserRuntime =
    options.browserRuntime ??
    new BrowserRuntime({
      artifactRoot: options.artifactRoot,
      headless: options.headless ?? true,
    });

  const runtime = options.runtime ?? asRuntimeService(browserRuntime);

  const app = Fastify({
    logger: options.logger ?? false,
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ActOSHttpError) {
      return reply.status(error.statusCode).send(errorResponse(error.runtimeError));
    }

    if (error && typeof error === "object" && "validation" in error) {
      const validationError = new ActOSHttpError(
        400,
        runtimeError({
          code: "UNKNOWN_RUNTIME_ERROR",
          message: "Request validation failed",
          category: "unknown",
          recoverable: true,
          details: { validation: (error as { validation?: unknown }).validation },
        }),
      );
      return reply.status(validationError.statusCode).send(errorResponse(validationError.runtimeError));
    }

    const httpError =
      error instanceof Error && error.message.includes("Session not found")
        ? new ActOSHttpError(
            404,
            runtimeError({
              code: "SESSION_NOT_FOUND",
              message: error.message,
            }),
          )
        : new ActOSHttpError(500, fromUnknownError(error));

    return reply.status(httpError.statusCode).send(errorResponse(httpError.runtimeError));
  });

  registerRoutes(app, runtime);

  return { app, runtime };
}

export type StartActOSServerOptions = CreateActOSServerOptions & {
  host?: string;
  port?: number;
};

export async function startActOSServer(options: StartActOSServerOptions = {}): Promise<ActOSServer & { url: string }> {
  const { app, runtime } = await createActOSServer(options);
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 8787;
  const url = await app.listen({ host, port });
  return { app, runtime, url };
}
