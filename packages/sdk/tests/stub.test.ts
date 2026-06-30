import { describe, expect, it } from "vitest";

import { SDK_STUB } from "../src/index.js";

describe("@actos/sdk stub", () => {
  it("exports stub marker", () => {
    expect(SDK_STUB).toBe(true);
  });
});
