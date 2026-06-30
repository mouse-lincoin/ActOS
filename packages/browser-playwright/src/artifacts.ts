import path from "node:path";

/** Default root directory for ActOS local artifacts and traces. */
export const DEFAULT_ARTIFACT_ROOT = ".actos";

export type ArtifactConfig = {
  artifactRoot?: string;
};

/** Resolve the artifact root, defaulting to `.actos`. */
export function getArtifactRoot(config?: ArtifactConfig): string {
  return config?.artifactRoot ?? DEFAULT_ARTIFACT_ROOT;
}

/** Build the session artifact directory: `.actos/artifacts/{sessionId}`. */
export function buildSessionArtifactDir(artifactRoot: string, sessionId: string): string {
  return path.join(artifactRoot, "artifacts", sessionId);
}

/** Build screenshot path: `.actos/artifacts/{sessionId}/screenshots/{observationId}.png`. */
export function buildScreenshotPath(
  artifactRoot: string,
  sessionId: string,
  observationId: string,
): string {
  return path.join(
    buildSessionArtifactDir(artifactRoot, sessionId),
    "screenshots",
    `${observationId}.png`,
  );
}

/** Build screenshot directory for a session. */
export function buildScreenshotDir(artifactRoot: string, sessionId: string): string {
  return path.join(buildSessionArtifactDir(artifactRoot, sessionId), "screenshots");
}
