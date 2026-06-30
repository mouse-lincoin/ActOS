import { useState } from "react";

import type { Observation, Session } from "@actos/core";

import type { ActOSDashboardApi } from "../api.js";

type HandoffPanelProps = {
  api: ActOSDashboardApi;
  session: Session | null;
  disabled?: boolean;
  onChanged: () => Promise<void>;
  onResumed?: (observation: Observation) => void;
};

export function HandoffPanel({ api, session, disabled, onChanged, onResumed }: HandoffPanelProps) {
  const [reason, setReason] = useState("Manual intervention required");
  const [checkpointLabel, setCheckpointLabel] = useState("manual-checkpoint");
  const [message, setMessage] = useState<string | null>(null);

  if (!session) {
    return (
      <section className="panel">
        <h2>Handoff</h2>
        <p className="muted">Select a session to pause, resume, or checkpoint.</p>
      </section>
    );
  }

  const isPaused = session.status === "paused";

  return (
    <section className="panel">
      <h2>Handoff</h2>
      <p className="muted">
        Session status: <span className={`status-pill ${session.status}`}>{session.status}</span>
      </p>

      <div className="field">
        <label htmlFor="handoff-reason">Pause reason</label>
        <textarea
          id="handoff-reason"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>

      <div className="row">
        <button
          type="button"
          className="danger"
          disabled={disabled || isPaused}
          onClick={() => {
            void (async () => {
              await api.pauseForHuman(session.id, { reason });
              setMessage("Session paused for human handoff");
              await onChanged();
            })();
          }}
        >
          Pause
        </button>
        <button
          type="button"
          className="primary"
          disabled={disabled || !isPaused}
          onClick={() => {
            void (async () => {
              const resumed = await api.resume(session.id);
              setMessage(`Resumed with observation ${resumed.observation.id}`);
              onResumed?.(resumed.observation);
              await onChanged();
            })();
          }}
        >
          Resume
        </button>
      </div>

      <div className="field">
        <label htmlFor="checkpoint-label">Checkpoint label</label>
        <input
          id="checkpoint-label"
          value={checkpointLabel}
          onChange={(event) => setCheckpointLabel(event.target.value)}
        />
      </div>
      <button
        type="button"
        disabled={disabled || isPaused}
        onClick={() => {
          void (async () => {
            const checkpoint = await api.checkpoint(session.id, checkpointLabel);
            setMessage(`Checkpoint created: ${checkpoint.id}`);
            await onChanged();
          })();
        }}
      >
        Create checkpoint
      </button>

      {message ? <p className="muted">{message}</p> : null}
    </section>
  );
}
