import { describe, expect, it } from "vitest";

import { DASHBOARD_STUB } from "../src/index.js";

describe("@actos/dashboard stub", () => {
  it("exports stub marker", () => {
    expect(DASHBOARD_STUB).toBe(true);
  });
});
