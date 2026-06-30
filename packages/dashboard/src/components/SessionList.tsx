import type { Session } from "@actos/core";

type SessionListProps = {
  sessions: Session[];
  selectedSessionId: string | null;
  onSelect: (sessionId: string) => void;
};

export function SessionList({ sessions, selectedSessionId, onSelect }: SessionListProps) {
  return (
    <section className="panel">
      <h2>Sessions</h2>
      {sessions.length === 0 ? <p className="muted">No sessions yet.</p> : null}
      <div className="stack">
        {sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            className={`session-item${selectedSessionId === session.id ? " active" : ""}`}
            onClick={() => onSelect(session.id)}
          >
            <strong>{session.id}</strong>
            <span className={`status-pill ${session.status}`}>{session.status}</span>
            <span className="muted">{session.activeTabId ?? "no active tab"}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
