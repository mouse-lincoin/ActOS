import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "../src/app.js";

describe("Mock Admin UI", () => {
  it("logs in and searches orders", async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "demo@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "demo1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByRole("heading", { name: "Orders" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Order search"), { target: { value: "ORD-1001" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("ORD-1001")).toBeInTheDocument();
  });

  it("opens export confirmation modal", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    await screen.findByRole("heading", { name: "Orders" });

    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(screen.getByRole("dialog", { name: /confirm export/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm export" })).toBeInTheDocument();
  });
});
