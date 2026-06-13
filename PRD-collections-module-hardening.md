# PRD: Collections Module Hardening

> **Status (2026-06-12):** Phase A implementation is **complete** — `collection_transactions` table, `useCollectionTransactions` hook, `useFinancialSnapshot` ledger/legacy source mode, and import validation are live. The problem statement below describes the pre-implementation state.

## Document Control

- Product: `PZone IPC V2`
- Module: `Collections`
- Related screens:
  - `src/pages/CollectionsPage.tsx`
  - `src/hooks/useCollections.ts`
  - `src/hooks/useIPC.ts`
  - `src/components/ipc/IPCRegisterTab.tsx`
- Status: Draft for implementation
- Date: `2026-06-04`

## 1. Objective

Redesign the current Collections module so it works as a true monthly collections ledger, validates cumulative balances per project, and prevents duplicate or inconsistent collection entries.

The target outcome is a module that can safely import or enter monthly collections, track them over time, reconcile them against IPC values, and highlight balance issues before they affect dashboards or reports.

## 2. Problem Statement

The current Collections module is derived directly from the `invoices` table and uses `total_collections` as a single rolled-up number on each invoice.

This creates operational blind spots:

1. Collections are not stored as monthly transactions.
2. The same project can be counted multiple times because IPC values are cumulative by nature.
3. Project summaries currently sum cumulative invoice values across all IPC rows, which can overstate totals.
4. There is no duplicate protection for imported monthly collections.
5. There is no reconciliation layer that checks whether collection totals exceed approved or receivable balances.
6. The module cannot distinguish between:
   - monthly collected amount
   - cumulative collected amount
   - expected collection
   - remaining balance
7. Collections are currently edited inline as one numeric field, which is not audit-safe.

## 3. Current Blind Spots

### 3.1 Data model blind spots

- `useCollections` maps collections from `invoices.total_collections` only.
- There is no separate `collection_transactions` table.
- There is no `collection_month` or `posting_month`.
- There is no unique transaction key to prevent duplicates.
- There is no source file tracking for imported rows.
- There is no collection reference or bank receipt model with strong uniqueness rules.

### 3.2 Calculation blind spots

- Project-level collection totals are currently aggregated by summing all invoice rows.
- IPC rows are cumulative, so summing `approved_total`, `approved_net_total`, or `cumulative_gross_value` across all rows can double count.
- Monthly charts currently infer month from `approved_date`, `received_date`, or `submitted_date`, not from an actual collection transaction month.
- Outstanding balances may appear correct in some screens and wrong in others because the source of truth is mixed.

### 3.3 Validation blind spots

- No check that total collected per project is less than or equal to receivable base.
- No check that invoice-level collections exceed invoice net approved amount.
- No duplicate row detection during import.
- No warning for same `project_code + invoice_number + amount + month` repeated.
- No warning for collection rows linked to unknown project codes.
- No warning for mismatched currencies.

### 3.4 Workflow blind spots

- Inline editing `total_collections` overwrites totals instead of recording a transaction.
- No monthly closing workflow.
- No status such as `draft`, `validated`, `posted`, `reversed`.
- No approval or review state for imported collection files.
- No audit trail showing who inserted or edited a collection line.

## 4. Product Goals

1. Support monthly collection entry and import.
2. Keep cumulative project-level collection balances accurate.
3. Prevent duplicate data entry and duplicate imports.
4. Detect wrong balances before publishing dashboards.
5. Preserve a full audit trail for every collection transaction.
6. Keep dashboards simple for users while calculations stay rigorous underneath.

## 5. Non-Goals

1. Full treasury or bank reconciliation.
2. General ledger accounting.
3. Automated ERP-to-bank integration in phase 1.
4. Historical rebuilding of all legacy data without review.

## 6. Users

- Finance
- Cost Control
- CEO / Chairman (read/reporting)
- Admin
- IPC Clerk or Contract Admin for coordination only

## 7. Proposed Solution

### 7.1 New source of truth

Introduce a dedicated table for collection transactions.

Suggested table:

`public.collection_transactions`

Suggested core fields:

- `id uuid`
- `project_code text not null`
- `project_name text`
- `invoice_id uuid null`
- `invoice_number text null`
- `client text null`
- `collection_date date not null`
- `collection_month date not null`
  - normalized to first day of month
- `amount numeric not null default 0`
- `currency text not null default 'EGP'`
- `reference_no text null`
- `bank_account text null`
- `notes text null`
- `source_type text not null default 'manual'`
  - `manual | import | adjustment | reversal`
- `source_file_name text null`
- `source_row_key text null`
- `dedupe_key text not null`
- `status text not null default 'draft'`
  - `draft | validated | posted | reversed`
- `created_by uuid`
- `created_at timestamptz`
- `updated_at timestamptz`

### 7.2 Deduplication rules

Every collection row must generate a deterministic dedupe key.

Recommended priority:

1. If `reference_no` exists:
   - `project_code + invoice_number + collection_date + amount + reference_no`
2. If no `reference_no`:
   - `project_code + invoice_number + collection_month + amount`
3. For project-level rows without invoice number:
   - `project_code + collection_month + amount + source_row_key`

System behavior:

- Exact duplicate key: block insert.
- Possible duplicate by fuzzy rule: allow but flag for review.

Fuzzy duplicate examples:

- Same project, same month, same amount, different spacing/case in reference
- Same project, same date, same amount, no invoice number

### 7.3 Cumulative reconciliation rules

Per project, all dashboards must use:

- latest receivable base from IPC
- cumulative collections from `collection_transactions`

Receivable base rule:

1. If project has approved IPCs:
   - use latest approved net cumulative value
2. Else if project has submitted IPC only:
   - use latest submitted net cumulative value
3. Else:
   - receivable base = 0

Project-level formulas:

- `cumulative_collected = sum(posted collection transactions for project)`
- `remaining_balance = receivable_base - cumulative_collected`
- `over_collection_flag = remaining_balance < 0`

Invoice-level formulas:

- `invoice_collected = sum(posted collection transactions linked to invoice)`
- `invoice_remaining = invoice_receivable_base - invoice_collected`

### 7.4 Monthly logic

Collections must work per month as a proper period ledger.

Rules:

- Every row belongs to one `collection_month`.
- Reporting month comes from `collection_date`, normalized to month start.
- Monthly dashboard totals come only from `collection_transactions.amount`.
- Historical months must remain stable after monthly close, except through explicit adjustment or reversal.

### 7.5 Validation engine

Before posting imported or manual data, run validations:

#### Hard errors

- missing `project_code`
- invalid amount `<= 0`
- duplicate `dedupe_key`
- collection linked to unknown project
- collection month invalid
- invoice number supplied but not found under project

#### Soft warnings

- collection exceeds invoice receivable
- project cumulative collected exceeds project receivable
- project has no approved IPC but has large collection
- currency mismatch between collection and project/invoice
- collection date earlier than invoice approval date
- unusually large variance versus prior months

Validation output must show:

- row number
- severity
- issue code
- human-readable message
- recommended action

## 8. UX Requirements

### 8.1 Collections screen

Replace the current derived-only view with a transactional module containing:

1. `Monthly Ledger`
   - one row per collection transaction
   - filters by month, project, client, source, status

2. `Project Reconciliation`
   - latest receivable
   - cumulative collected
   - remaining balance
   - over-collected / duplicate warnings

3. `Import Validation`
   - preview imported rows
   - duplicates
   - balance issues
   - confirm post

4. `Monthly Summary`
   - monthly totals
   - monthly cumulative trend
   - project contribution by month

### 8.2 Editing behavior

- Users should add a new transaction, not overwrite project total directly.
- Editing a posted row should require either:
  - update with audit trail, or
  - reversal + replacement

### 8.3 Statuses

Each import batch and each collection row should have statuses:

- `draft`
- `validated`
- `posted`
- `reversed`

## 9. Data Migration Strategy

Phase 1:

1. Keep current `invoices.total_collections` for backward compatibility.
2. Add `collection_transactions`.
3. Build reads from the new table first.
4. Fall back to `invoices.total_collections` only where no transaction history exists.

Phase 2:

1. Backfill historical collections from invoice totals if needed.
2. Mark backfilled rows as `source_type = 'legacy_backfill'`.
3. Disable direct editing of `invoices.total_collections`.

Phase 3:

1. Fully retire collection totals as a manually edited invoice field.
2. Compute rollups from transactions only.

## 10. Technical Requirements

### Backend

Required additions:

- `collection_transactions` table
- indexes on:
  - `project_code`
  - `invoice_id`
  - `collection_month`
  - `dedupe_key`
  - `status`
- unique constraint on `dedupe_key`
- RLS:
  - `finance`, `admin` write
  - `ceo`, `chairman` read
  - optional `cost_control` read

### Frontend

Required changes:

- new hook `useCollectionTransactions`
- import parser for monthly collection sheet
- validation preview component
- reconciliation summary component
- replace `useCollections()` derived-only logic with transaction-based logic

## 11. Reporting Requirements

The module must answer:

1. What was collected this month?
2. What is cumulative collected per project?
3. What remains to be collected per project?
4. Which projects are over-collected or mismatched?
5. Which rows were duplicates or suspicious imports?
6. What changed between current import and previous month?

## 12. Acceptance Criteria

1. Finance can import a monthly collection sheet and preview validation results before posting.
2. The system blocks exact duplicate collection rows.
3. The system flags suspicious duplicates.
4. Monthly dashboard totals come from transaction month, not inferred invoice dates.
5. Project cumulative collected value is accurate and not inflated by cumulative IPC double counting.
6. Remaining balance is never silently negative; negative balances are explicitly flagged.
7. Users can trace every collection row to source file, source row, user, and timestamp.
8. Current dashboard and collections page continue to load after migration.

## 13. Open Decisions

1. Should collections be tracked strictly at invoice level, project level, or both?
   - Recommendation: both, with invoice optional and project required.
2. Should cost control be allowed to post collections or review only?
   - Recommendation: review only in phase 1; finance posts.
3. Should imported rows require approval before posting?
   - Recommendation: yes for batch imports.
4. How should USD projects be handled in collections?
   - Recommendation: keep explicit currency on every collection row.

## 14. Implementation Priority

### Phase A

- add transaction table
- add dedupe key logic
- add import validation preview
- build monthly ledger

### Phase B

- build project reconciliation
- connect dashboards to transaction source
- add warning center for duplicates and over-collection

### Phase C

- batch closing by month
- reversals/adjustments
- historical backfill tools

## 15. Summary

The current Collections module is useful as a visual summary, but it is not yet reliable as an operational ledger.

To make it safe for monthly use, the module must move from:

- one cumulative field on invoice rows

to:

- a transaction-based monthly collections ledger with reconciliation, deduplication, and validation.
