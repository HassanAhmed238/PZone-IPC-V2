# PZone IPC V2

Construction ERP — Interim Payment Certificate (IPC) Management System.

## Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Postgres, Storage, Auth, Edge Functions)
- **State:** TanStack Query (react-query) — offline fallback via localStorage
- **Locale:** Arabic (ar) primary; bilingual UI (Arabic + English)

## Prerequisites

- Node.js ≥ 18
- A Supabase project with IPC migrations applied
- Environment variables configured (see `.env.example`)

## Setup

```sh
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env

# 3. Start development server
npm run dev
```

## Environment Variables

See `.env.example` for required keys. Key variables:

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |

## Key Modules

| Module | Hook | Description |
|---|---|---|
| IPC / Invoices | `useIPC.ts` | CRUD for IPC invoices; offline fallback to localStorage |
| IPC Projects | `useIPCProjects.ts` | Project registry; 5-min TTL retry on DB failure |
| Financial Snapshot | `useFinancialSnapshot.ts` | Portfolio metrics, aging, risks, control issues, source-mode selection |
| Collections Ledger | `useCollectionTransactions` | Transaction-based monthly collections |
| Cash Flow | `useCashFlowLedger` | Cash flow transactions + forecasts |

## Data Source Priority

When Supabase is reachable, the **database is the single source of truth**. localStorage is used as a read fallback only when the Supabase `invoices` table is unavailable (e.g., pending migration).

## Migrations

SQL migrations are in `supabase/migrations/`. If board sharing fails, run:

```
supabase/migrations/20260611_live_schema_repair.sql
```

## Building

```sh
npm run build
```
