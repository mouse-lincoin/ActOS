import type { TraceEvent } from "@actos/core";

type TimelineProps = {
  events: TraceEvent[];
};

export function Timeline({ events }: TimelineProps) {
  return (
    <section className="panel">
      <h2>Trace timeline</h2>
      {events.length === 0 ? <p className="muted">No trace events yet.</p> : null}
      <ol className="timeline">
        {events.map((event) => (
          <li key={event.id}>
            <strong>{event.type}</strong>
            <span>{event.timestamp}</span>
            <pre className="json-panel" style={{ maxHeight: 120 }}>
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          </li>
        ))}
      </ol>
    </section>
  );
}
