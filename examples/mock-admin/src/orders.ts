export type OrderStatus = "pending" | "shipped" | "delivered" | "cancelled";

export type Order = {
  id: string;
  customer: string;
  status: OrderStatus;
  total: string;
};

export const DEMO_EMAIL = "demo@example.com";
export const DEMO_PASSWORD = "demo1234";

export const MOCK_ORDERS: Order[] = [
  { id: "ORD-1001", customer: "Acme Corp", status: "pending", total: "$120.00" },
  { id: "ORD-1002", customer: "Globex", status: "shipped", total: "$89.50" },
  { id: "ORD-1003", customer: "Initech", status: "delivered", total: "$240.00" },
  { id: "ORD-1004", customer: "Umbrella Co", status: "cancelled", total: "$15.00" },
];

export function validateLogin(email: string, password: string): boolean {
  return email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;
}

export function filterOrders(
  orders: Order[],
  query: string,
  status: OrderStatus | "all",
): Order[] {
  const normalizedQuery = query.trim().toLowerCase();

  return orders.filter((order) => {
    const matchesStatus = status === "all" || order.status === status;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      order.id.toLowerCase().includes(normalizedQuery) ||
      order.customer.toLowerCase().includes(normalizedQuery);
    return matchesStatus && matchesQuery;
  });
}

export function buildExportCsv(orders: Order[]): string {
  const header = "order_id,customer,status,total";
  const rows = orders.map((order) => `${order.id},${order.customer},${order.status},${order.total}`);
  return [header, ...rows].join("\n");
}
