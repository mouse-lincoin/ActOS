import { describe, expect, it } from "vitest";

import { BROWSER_PLAYWRIGHT_STUB } from "../src/index.js";

describe("@actos/browser-playwright stub", () => {
  it("exports stub marker", () => {
    expect(BROWSER_PLAYWRIGHT_STUB).toBe(true);
  });
});
