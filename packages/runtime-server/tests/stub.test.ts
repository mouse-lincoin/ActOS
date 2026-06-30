import { describe, expect, it } from "vitest";

import { RUNTIME_SERVER_STUB } from "../src/index.js";

describe("@actos/runtime-server stub", () => {
  it("exports stub marker", () => {
    expect(RUNTIME_SERVER_STUB).toBe(true);
  });
});
