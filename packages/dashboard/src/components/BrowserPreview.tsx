import type { Observation } from "@actos/core";

import type { ActOSDashboardApi } from "../api.js";

type BrowserPreviewProps = {
  api: ActOSDashboardApi;
  sessionId: string | null;
  observation: Observation | null;
  observationId?: string;
  onObserve?: () => void;
  observeDisabled?: boolean;
};

export function BrowserPreview({
  api,
  sessionId,
  observation,
  observationId,
  onObserve,
  observeDisabled,
}: BrowserPreviewProps) {
  const screenshotId = observation?.id ?? observationId;
  const screenshotUrl =
    sessionId && screenshotId ? api.screenshotUrl(sessionId, screenshotId) : undefined;

  return (
    <section className="panel">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h2>Browser preview</h2>
        {onObserve ? (
          <button type="button" disabled={observeDisabled} onClick={onObserve}>
            Observe
          </button>
        ) : null}
      </div>
      {screenshotUrl ? (
        <img className="preview-image" src={screenshotUrl} alt="Latest session screenshot" />
      ) : (
        <div className="preview-image muted" style={{ display: "grid", placeItems: "center" }}>
          No screenshot yet
        </div>
      )}
      {observation ? (
        <p className="muted">
          {observation.page.title} — {observation.page.url}
        </p>
      ) : null}
    </section>
  );
}
