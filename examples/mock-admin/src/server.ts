import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
};

export type MockAdminServer = {
  url: string;
  port: number;
  close: () => Promise<void>;
};

async function resolveWebRoot(): Promise<string> {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(currentDir, "..", "web"),
    path.join(currentDir, "..", "dist", "web"),
  ];

  for (const candidate of candidates) {
    try {
      await access(path.join(candidate, "index.html"));
      return candidate;
    } catch {
      // try next candidate
    }
  }

  throw new Error("mock-admin web build not found; run pnpm build");
}

async function resolveFilePath(webRoot: string, requestPath: string): Promise<string> {
  const normalized = requestPath === "/" ? "/index.html" : requestPath;
  const candidate = path.normalize(path.join(webRoot, normalized));
  if (!candidate.startsWith(webRoot)) {
    throw new Error("Invalid path");
  }

  try {
    const fileStat = await stat(candidate);
    if (fileStat.isFile()) {
      return candidate;
    }
  } catch {
    // fall through to SPA index
  }

  return path.join(webRoot, "index.html");
}

export async function startMockAdmin(options: { port?: number; host?: string } = {}): Promise<MockAdminServer> {
  const host = options.host ?? "127.0.0.1";
  const webRoot = await resolveWebRoot();

  const server: Server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
      const filePath = await resolveFilePath(webRoot, requestUrl.pathname);
      const extension = path.extname(filePath);
      response.writeHead(200, {
        "Content-Type": MIME_TYPES[extension] ?? "application/octet-stream",
      });
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Internal Server Error");
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 0, host, () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to resolve mock-admin listen address");
  }

  const url = `http://${host}:${address.port}`;
  return {
    url,
    port: address.port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}

const isMainModule =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  const port = Number(process.env.PORT ?? 3001);
  startMockAdmin({ port, host: process.env.HOST ?? "127.0.0.1" })
    .then(({ url }) => {
      console.log(`Mock Admin listening at ${url}`);
    })
    .catch((error) => {
      console.error("Failed to start Mock Admin", error);
      process.exit(1);
    });
}
