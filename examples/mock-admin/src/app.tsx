import { StrictMode, useMemo, useState } from "react";

import {
  buildExportCsv,
  DEMO_EMAIL,
  DEMO_PASSWORD,
  filterOrders,
  MOCK_ORDERS,
  type Order,
  type OrderStatus,
  validateLogin,
} from "./orders.js";
import "./app.css";

type Page = "login" | "orders";

type Toast = {
  id: number;
  message: string;
  tone: "info" | "success" | "error";
};

export function App() {
  const [page, setPage] = useState<Page>("login");
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [visibleOrders, setVisibleOrders] = useState<Order[]>(MOCK_ORDERS);

  const toastId = useMemo(() => ({ current: 0 }), []);

  function pushToast(message: string, tone: Toast["tone"] = "info") {
    toastId.current += 1;
    const id = toastId.current;
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3500);
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    await new Promise((resolve) => window.setTimeout(resolve, 400));

    if (!validateLogin(email, password)) {
      pushToast("Invalid email or password", "error");
      setLoading(false);
      return;
    }

    pushToast("Login successful", "success");
    setPage("orders");
    setVisibleOrders(MOCK_ORDERS);
    setLoading(false);
  }

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    const filtered = filterOrders(MOCK_ORDERS, searchQuery, statusFilter);
    setVisibleOrders(filtered);
    pushToast(`Found ${filtered.length} order(s)`, "info");
    setLoading(false);
  }

  function handleExportConfirm() {
    const csv = buildExportCsv(visibleOrders);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "orders-export.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
    pushToast("Export started — CSV downloaded", "success");
  }

  if (page === "login") {
    return (
      <div className="app-shell">
        <main className="card login-card">
          <h1>Mock Admin</h1>
          <p className="muted">Sign in with {DEMO_EMAIL} / {DEMO_PASSWORD}</p>
          <form onSubmit={(event) => void handleLogin(event)} className="stack">
            <label className="field">
              <span>Email</span>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button type="submit" className="primary" disabled={loading}>
              Login
            </button>
          </form>
          {loading ? <p className="loading" role="status">Signing in…</p> : null}
        </main>
        <ToastStack toasts={toasts} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="page-header">
        <div>
          <h1>Orders</h1>
          <p className="muted">Search and export order records</p>
        </div>
      </header>

      <main className="card">
        <form onSubmit={(event) => void handleSearch(event)} className="toolbar stack">
          <label className="field">
            <span>Order search</span>
            <input
              id="order-search"
              value={searchQuery}
              placeholder="ORD-1001"
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Status</span>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as OrderStatus | "all")}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <div className="row">
            <button type="submit" disabled={loading}>
              Search
            </button>
            <button type="button" onClick={() => setShowExportModal(true)}>
              Export CSV
            </button>
          </div>
        </form>

        {loading ? <p className="loading" role="status">Loading orders…</p> : null}

        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {visibleOrders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{order.customer}</td>
                <td>{order.status}</td>
                <td>{order.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>

      {showExportModal ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-labelledby="export-title">
            <h2 id="export-title">Confirm export</h2>
            <p>Export {visibleOrders.length} visible order(s) to CSV?</p>
            <div className="row">
              <button type="button" onClick={() => setShowExportModal(false)}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={handleExportConfirm}>
                Confirm export
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ToastStack toasts={toasts} />
    </div>
  );
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
