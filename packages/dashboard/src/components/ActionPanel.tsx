import { useState } from "react";

import type { AgentAction } from "@actos/core";

import type { ActOSDashboardApi } from "../api.js";

type ActionPanelProps = {
  api: ActOSDashboardApi;
  sessionId: string | null;
  disabled?: boolean;
  onCompleted: () => Promise<void>;
};

export function ActionPanel({ api, sessionId, disabled, onCompleted }: ActionPanelProps) {
  const [actionType, setActionType] = useState<"click" | "fill" | "navigate">("click");
  const [targetRole, setTargetRole] = useState("button");
  const [targetName, setTargetName] = useState("Search");
  const [fillValue, setFillValue] = useState("test@example.com");
  const [navigateUrl, setNavigateUrl] = useState("https://example.com");
  const [status, setStatus] = useState<string | null>(null);

  async function submitAction() {
    if (!sessionId) {
      return;
    }

    let action: AgentAction;
    if (actionType === "click") {
      action = { type: "click", target: { role: targetRole, name: targetName } };
    } else if (actionType === "fill") {
      action = { type: "fill", target: { role: targetRole, name: targetName }, value: fillValue };
    } else {
      action = { type: "navigate", url: navigateUrl };
    }

    const result = await api.act(sessionId, action);
    setStatus(`${result.status}${result.error ? ` (${result.error.code})` : ""}`);
    await onCompleted();
  }

  return (
    <section className="panel">
      <h2>Action tester</h2>
      <div className="field">
        <label htmlFor="action-type">Action type</label>
        <select
          id="action-type"
          value={actionType}
          onChange={(event) => setActionType(event.target.value as "click" | "fill" | "navigate")}
        >
          <option value="click">click</option>
          <option value="fill">fill</option>
          <option value="navigate">navigate</option>
        </select>
      </div>

      {actionType === "navigate" ? (
        <div className="field">
          <label htmlFor="navigate-url">URL</label>
          <input
            id="navigate-url"
            value={navigateUrl}
            onChange={(event) => setNavigateUrl(event.target.value)}
          />
        </div>
      ) : (
        <>
          <div className="field">
            <label htmlFor="target-role">Target role</label>
            <input
              id="target-role"
              value={targetRole}
              onChange={(event) => setTargetRole(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="target-name">Target name</label>
            <input
              id="target-name"
              value={targetName}
              onChange={(event) => setTargetName(event.target.value)}
            />
          </div>
          {actionType === "fill" ? (
            <div className="field">
              <label htmlFor="fill-value">Value</label>
              <input
                id="fill-value"
                value={fillValue}
                onChange={(event) => setFillValue(event.target.value)}
              />
            </div>
          ) : null}
        </>
      )}

      <div className="row">
        <button type="button" className="primary" disabled={disabled || !sessionId} onClick={() => void submitAction()}>
          Run action
        </button>
      </div>
      {status ? <p className="muted">Last result: {status}</p> : null}
    </section>
  );
}
