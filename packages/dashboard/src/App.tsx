import { useCallback, useEffect, useMemo, useState } from "react";

import type { Observation, Session, TraceEvent } from "@actos/core";

import { ActOSDashboardApi, DEFAULT_API_BASE } from "./api.js";
import { ActionPanel } from "./components/ActionPanel.js";
import { BrowserPreview } from "./components/BrowserPreview.js";
import { HandoffPanel } from "./components/HandoffPanel.js";
import { ObservationPanel } from "./components/ObservationPanel.js";
import { SessionList } from "./components/SessionList.js";
import { Timeline } from "./components/Timeline.js";

function findLastObservationId(events: TraceEvent[]): string | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.type === "observe.completed" && typeof event.payload.observationId === "string") {
      return event.payload.observationId;
    }
  }
  return undefined;
}

export function App() {
  const api = useMemo(() => new ActOSDashboardApi(), []);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [observation, setObservation] = useState<Observation | null>(null);
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [lastObservationId, setLastObservationId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshSessions = useCallback(async () => {
    const nextSessions = await api.listSessions();
    setSessions(nextSessions);
    setSelectedSessionId((current) => current ?? nextSessions[0]?.id ?? null);
  }, [api]);

  const refreshSessionDetails = useCallback(async () => {
    if (!selectedSessionId) {
      setSelectedSession(null);
      setObservation(null);
      setTrace([]);
      setLastObservationId(undefined);
      return;
    }

    const [session, events] = await Promise.all([
      api.getSession(selectedSessionId),
      api.getTrace(selectedSessionId),
    ]);
    setSelectedSession(session);
    setTrace(events);
    setLastObservationId(findLastObservationId(events));
  }, [api, selectedSessionId]);

  const runWithStatus = useCallback(async (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void runWithStatus(refreshSessions);
  }, [refreshSessions, runWithStatus]);

  useEffect(() => {
    void runWithStatus(refreshSessionDetails);
  }, [refreshSessionDetails, runWithStatus]);

  const observeCurrentSession = useCallback(async () => {
    if (!selectedSessionId) {
      return;
    }
    const nextObservation = await api.observe(selectedSessionId, { includeScreenshot: true });
    setObservation(nextObservation);
    setLastObservationId(nextObservation.id);
    await refreshSessionDetails();
  }, [api, refreshSessionDetails, selectedSessionId]);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>ActOS Dashboard</h1>
          <p>Runtime API: {DEFAULT_API_BASE}</p>
        </div>
        <div className="row">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void runWithStatus(async () => {
                await refreshSessions();
                await refreshSessionDetails();
              });
            }}
          >
            Refresh
          </button>
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={() => {
              void runWithStatus(async () => {
                const session = await api.createSession({ headless: true });
                setSelectedSessionId(session.id);
                await refreshSessions();
              });
            }}
          >
            New session
          </button>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <main className="dashboard-main">
        <SessionList
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelect={setSelectedSessionId}
        />

        <section className="stack">
          <BrowserPreview
            api={api}
            sessionId={selectedSessionId}
            observation={observation}
            observationId={lastObservationId}
            observeDisabled={busy || !selectedSessionId || selectedSession?.status === "paused"}
            onObserve={() => {
              void runWithStatus(observeCurrentSession);
            }}
          />
          <ObservationPanel observation={observation} />
          <ActionPanel
            api={api}
            sessionId={selectedSessionId}
            disabled={busy || !selectedSessionId || selectedSession?.status === "paused"}
            onCompleted={async () => {
              await refreshSessions();
              await refreshSessionDetails();
            }}
          />
        </section>

        <section className="stack">
          <HandoffPanel
            api={api}
            session={selectedSession}
            disabled={busy || !selectedSessionId}
            onChanged={async () => {
              await refreshSessions();
              await refreshSessionDetails();
            }}
            onResumed={(nextObservation) => {
              setObservation(nextObservation);
              setLastObservationId(nextObservation.id);
            }}
          />
          <Timeline events={trace} />
        </section>
      </main>
    </div>
  );
}
