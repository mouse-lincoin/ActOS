import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SessionList } from "../src/components/SessionList.js";

describe("SessionList", () => {
  it("renders sessions and highlights the selected session", () => {
    render(
      <SessionList
        sessions={[
          {
            id: "ses_one",
            status: "active",
            browser: "chromium",
            profile: "default",
            isolation: "strict",
            headless: true,
            createdAt: "2026-06-30T00:00:00.000Z",
            updatedAt: "2026-06-30T00:00:00.000Z",
            activeTabId: "tab_one",
          },
          {
            id: "ses_two",
            status: "paused",
            browser: "chromium",
            profile: "default",
            isolation: "strict",
            headless: true,
            createdAt: "2026-06-30T00:00:01.000Z",
            updatedAt: "2026-06-30T00:00:02.000Z",
            activeTabId: "tab_two",
          },
        ]}
        selectedSessionId="ses_two"
        onSelect={() => undefined}
      />,
    );

    expect(screen.getByText("ses_one")).toBeInTheDocument();
    expect(screen.getByText("ses_two")).toBeInTheDocument();
    expect(screen.getByText("paused")).toBeInTheDocument();
  });
});
