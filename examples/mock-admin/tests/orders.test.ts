import { describe, expect, it } from "vitest";

import {
  buildExportCsv,
  DEMO_EMAIL,
  DEMO_PASSWORD,
  filterOrders,
  MOCK_ORDERS,
  validateLogin,
} from "../src/orders.js";

describe("mock-admin orders", () => {
  it("validates demo credentials", () => {
    expect(validateLogin(DEMO_EMAIL, DEMO_PASSWORD)).toBe(true);
    expect(validateLogin("wrong@example.com", DEMO_PASSWORD)).toBe(false);
  });

  it("filters orders by query and status", () => {
    const byId = filterOrders(MOCK_ORDERS, "ORD-1001", "all");
    expect(byId).toHaveLength(1);
    expect(byId[0]?.id).toBe("ORD-1001");

    const byStatus = filterOrders(MOCK_ORDERS, "", "shipped");
    expect(byStatus.every((order) => order.status === "shipped")).toBe(true);
  });

  it("builds CSV export content", () => {
    const csv = buildExportCsv([MOCK_ORDERS[0]!]);
    expect(csv).toContain("order_id,customer,status,total");
    expect(csv).toContain("ORD-1001,Acme Corp,pending,$120.00");
  });
});
