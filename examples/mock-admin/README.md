# Mock Admin

Deterministic local admin site used to validate ActOS Runtime v0 end-to-end.

## Demo credentials

- Email: `demo@example.com`
- Password: `demo1234`

## Run locally

```bash
# From repository root
pnpm install
pnpm --filter @actos/mock-admin build
pnpm --filter @actos/mock-admin start
```

Open [http://127.0.0.1:3001](http://127.0.0.1:3001).

Development mode with hot reload:

```bash
pnpm --filter @actos/mock-admin dev
```

## Pages and UI elements

- **Login** — email input, password input, login button, loading indicator, toast
- **Orders** — order search input, status select, search button, results table
- **Export** — export button, confirmation modal, success toast, CSV download

## Automated demo

With the runtime server and mock-admin built, run the end-to-end demo script:

```bash
pnpm --filter @actos/mock-admin demo
```

The script:

1. starts mock-admin on port `3001`
2. starts the ActOS runtime server on port `8787`
3. creates a browser session
4. logs in, searches `ORD-1001`, exports CSV, and creates a checkpoint
5. prints trace and screenshot artifact paths

Artifacts are written under a temporary `.actos/` directory for that run.
