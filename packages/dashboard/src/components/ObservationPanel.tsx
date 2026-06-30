import type { Observation } from "@actos/core";

type ObservationPanelProps = {
  observation: Observation | null;
};

export function ObservationPanel({ observation }: ObservationPanelProps) {
  return (
    <section className="panel">
      <h2>Observation JSON</h2>
      {observation ? (
        <pre className="json-panel">{JSON.stringify(observation, null, 2)}</pre>
      ) : (
        <p className="muted">Run observe to load the latest semantic page snapshot.</p>
      )}
    </section>
  );
}
