# Project: PZone IPC V2 Safety & Performance

## Architecture
- React + Vite + TypeScript frontend using Supabase database.
- Falls back to localStorage when Supabase is unreachable; DB is the single source of truth when online.
- Core data hooks: `useIPC`, `useIPCProjects`. Financial engine: `useFinancialSnapshot`, `useFinancialAnalytics`, `useCollections`, `useCashFlowLedger`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1. IPC Safety & Cleanup | R1 (Draft invoice de-duplication) & R3 (Obsolete code/RPC removal) | None | DONE |
| 2 | M2. Table TTL Recovery | R2 (Table TTL recovery mechanism in useIPCProjects) | None | DONE |
| 3 | M3. Remove Compiler Annotations | R4 (Remove ts-expect-error suppression in OngoingProjectsProgressPage) | None | DONE |
| 4 | M4. Filter Memoization | R5 (Memoize filters in useFinancialSnapshot) | None | DONE |
| 5 | M5. Verification & E2E | Run TypeScript build and tests to verify everything passes | M1, M2, M3, M4 | DONE |

## Code Layout
- `src/hooks/useIPC.ts` - Local cache merge and Supabase sync logic
- `src/hooks/useIPCProjects.ts` - IPC projects list and connectivity checks
- `src/pages/OngoingProjectsProgressPage.tsx` - Progress sheet render page
- `src/hooks/useFinancialSnapshot.ts` - Financial snapshot computation, ledger/legacy source mode, control issues, aging, risks

## Interface Contracts
- Draft invoice keys: Draft invoices (lacking an `invoice_number`) should be keyed in caches/maps using `draft::${invoice.id}` instead of the project code alone.
- Table existence: `useIPCProjects` must retry query failures after 5 minutes (TTL) instead of locking table status to missing.
- Error payloads: Both `isTableMissingError` implementations (in `useIPC.ts` and `useIPCProjects.ts`) must check for `"unavailable"` message.
