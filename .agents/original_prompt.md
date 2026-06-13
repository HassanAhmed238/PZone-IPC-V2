## 2026-06-10T11:40:07Z

Implement code safety, reliability, offline-handling, and performance improvements for the PZone ERP's Interim Payment Certificates (IPC) and financial snapshot modules.

Working directory: d:\Hassan\ERP\PZone IPC V2
Integrity mode: development

## Requirements

### R1. Draft Invoice De-duplication
Modify the merge and sync logic in `useIPC.ts` so draft invoices (which lack an `invoice_number`) do not overwrite each other. Key them by `draft::${id}` (using the unique invoice UUID) instead of the project code alone in both `mergeInvoices` and `syncLocalInvoicesToSupabase`.

### R2. Table TTL Recovery
Update `useIPCProjects.ts` so that temporary database query failures do not permanently lock the local client table check to `false`. Use a 5-minute time-to-live (TTL) retry mechanism. Ensure `isTableMissingError` checks for `"unavailable"` message from the custom error payload.

### R3. Obsolete Code Removal
Remove the deprecated `get_board_invoices` RPC database call in `useIPC.ts` and update the snapshot error warning message to reference the `20260611_live_schema_repair.sql` migration.

### R4. Remove Compiler Annotations
Remove unnecessary `@ts-expect-error` suppressions in `OngoingProjectsProgressPage.tsx` since the target database column `progress_sheet` is now fully typed in the schema definitions.

### R5. Filter Memoization
Memoize filters inside the `useFinancialSnapshot` hook to prevent expensive metric calculations from running on every component re-render when inline filter objects are passed.

## Acceptance Criteria

### Correctness
- [ ] Draft invoices can be saved and synced without colliding or overwriting each other.
- [ ] The app recovers and retries Supabase database connections for `ipc_projects` after a 5-minute TTL.
- [ ] Obsolete RPC calls are removed and compilation passes.

### Performance
- [ ] Filter changes are memoized, and `useFinancialSnapshot` does not recalculate unless filter values actually change.

### Verification
- [ ] Project must compile successfully with zero TypeScript compilation errors (e.g. running `npm run build` or equivalent tsc check).
