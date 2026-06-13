# Feature Specification: BOQ Cost Tracker

**Feature Branch**: `feat/boq-cost-tracker`  
**Created**: 2026-04-03  
**Status**: Draft  
**Input**: User description: "Build a BOQ cost tracker that compares estimated vs actual costs per line item, with Arabic/English toggle"

## Context & Existing Infrastructure

The ERP already has:
- **`CostControlPage.tsx`** — Project-level EVM dashboard (CPI, SPI, EAC) with Recharts pie chart and alerts. Currently shows aggregated cost data per project, NOT per BOQ line item.
- **`BOQImporter.tsx`** + **`BOQPreviewTable.tsx`** — Excel import with AI parsing into CBS tree items (per tender).
- **`useBudget.ts`** — `BudgetLine` entities with `boq_qty`, `remeasured_qty`, `drawings_qty`, `budget_qty`, cost breakdowns (material/labor/equipment/subcontract). These are the **estimated** costs.
- **`useCostControl.ts`** — Queries `actual_costs` + `committed_costs` Supabase tables. These are the **actual** costs, but currently aggregated at project level only — no line-item-level breakdown exists in the UI.
- **`BudgetSourceComparison.tsx`** — Compares BOQ vs remeasured vs drawings quantities, NOT costs.

**The Gap**: There is no page or component that shows **per-BOQ-line-item** comparison of estimated (budget) cost vs actual cost. The user must currently cross-reference CostControlPage (aggregated) with BudgetDetailPage (budget lines) manually.

---

## User Scenarios & Testing

### User Story 1 — Line-Item Variance Table (Priority: P1)

As a **Cost Engineer (مهندس تكاليف)**, I want to see a single table where each BOQ line item shows its estimated budget alongside actual expenditure to date, so I can identify which items are overrunning without leaving the page.

**Why this priority**: This is the core value — the entire feature is pointless without this comparison view. It replaces the manual cross-referencing workflow.

**Independent Test**: Open the BOQ Cost Tracker page, select a project. The table renders all budget lines with estimated vs actual columns. Each row shows variance amount and variance %.

**Acceptance Scenarios**:

1. **Given** a project with an approved budget (status: `approved` or `locked`) containing 20 budget lines, **When** the user opens the BOQ Cost Tracker page and selects that project, **Then** all 20 lines appear in a table with columns: Item No, Description, Unit, Budget Qty, Budget Rate, Estimated Cost, Actual Cost to Date, Committed Cost, Variance (EGP), Variance (%).
2. **Given** a budget line where actual cost exceeds estimated cost, **When** the table renders, **Then** the variance cell shows a negative number in red with a "تجاوز" (overrun) badge.
3. **Given** a budget line with zero actual costs, **When** the table renders, **Then** the row shows 0 for actual cost and the full estimated amount as remaining, with a neutral color.

---

### User Story 2 — AR/EN Language Toggle (Priority: P1)

As **Hassan A. Soliman (GM)**, I want to toggle the entire BOQ Cost Tracker between Arabic and English so I can review it in Arabic for internal use and switch to English when sharing with international stakeholders.

**Why this priority**: Constitution Principle II (Bilingual-First) makes this a P1 requirement, not a nice-to-have.

**Independent Test**: Click the language toggle button. All column headers, labels, badges, currency formatting, and empty-state messages switch between AR and EN instantly without page reload.

**Acceptance Scenarios**:

1. **Given** the page is in Arabic mode (default), **When** the user clicks the EN/AR toggle, **Then** all UI text switches to English: column headers ("Item No" instead of "رقم البند"), badges ("Overrun" instead of "تجاوز"), currency format (EGP 500,000 instead of ٥٠٠,٠٠٠ ج.م).
2. **Given** the page is in English mode, **When** the user clicks back to AR, **Then** text direction switches to RTL, all labels revert to Arabic, and number formatting follows Arabic conventions.
3. **Given** the language toggle state, **When** the user navigates away and returns, **Then** the preferred language persists via localStorage.

---

### User Story 3 — Variance Summary Cards (Priority: P2)

As a **Project Director**, I want to see KPI summary cards at the top of the page showing total estimated vs total actual, overall variance, and items at risk, so I can get a snapshot without reading the full table.

**Why this priority**: Executives look at summaries first. This enhances the P1 table but delivers value independently.

**Independent Test**: The summary cards render correct totals regardless of table sorting or filtering.

**Acceptance Scenarios**:

1. **Given** a project with 20 budget lines, **When** the BOQ Cost Tracker loads, **Then** 4 summary cards appear: Total Estimated Budget, Total Actual Cost, Total Variance (EGP), Items Over Budget (count/total).
2. **Given** 5 out of 20 items are over budget, **When** the summary renders, **Then** the "Items Over Budget" card shows "5 / 20" with a red indicator and the percentage.

---

### User Story 4 — Cost Variance Bar Chart (Priority: P2)

As a **Cost Engineer**, I want a horizontal bar chart showing the top 10 BOQ items with the largest absolute variance, so I can prioritize corrective action.

**Why this priority**: Visual representation accelerates decision-making. Builds on P1 data but is independently testable.

**Independent Test**: Chart renders with correct data even if only 3 items have non-zero variance (shows 3 bars, not empty slots).

**Acceptance Scenarios**:

1. **Given** a project with variance data, **When** the chart renders, **Then** it shows horizontal bars with item description labels, sorted by absolute variance (largest first). Overruns in red, under-budget in green.
2. **Given** the language is toggled to EN, **When** the chart renders, **Then** chart labels, axis titles, and tooltips are in English.

---

### User Story 5 — Excel Export (Priority: P3)

As a **Cost Engineer**, I want to export the BOQ cost comparison table to Excel, so I can share it with subcontractors and insert it into monthly progress reports.

**Why this priority**: Export is a downstream action that depends on the table being correct. High utility but not blocking core usage.

**Independent Test**: Click the Export button, verify the downloaded `.xlsx` contains all table columns with correct numeric values (not formatted strings).

**Acceptance Scenarios**:

1. **Given** a fully loaded BOQ Cost Tracker table, **When** the user clicks "Export to Excel", **Then** an `.xlsx` file downloads with filename `BOQ_Cost_Tracker_{ProjectCode}_{Date}.xlsx`. All columns match the table. Numbers are stored as numeric cells, not text.
2. **Given** the page is in Arabic mode, **When** the export runs, **Then** the Excel column headers are in Arabic with RTL sheet direction.

---

### Edge Cases

- What happens when a project has no approved budget? → Show empty state: "لا توجد ميزانية معتمدة. يرجى اعتماد الميزانية أولاً." with a link to Budget page.
- What happens when actual_costs has entries that don't map to any budget line? → Group them under "غير مصنف / Unallocated" at the bottom of the table with a warning badge.
- What happens when a project has budget lines but zero actual costs? → All lines show 0 actual, full budget as remaining, variance = +100%. No error.
- What happens when multiple budget versions exist? → Always use the `approved` or `locked` budget. If both exist, use `locked`.
- How does the system handle very large BOQs (500+ lines)? → Virtualize the table (react-window) or paginate at 50 rows with a "Show All" option.

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST display a per-line-item comparison table with columns: Item No (`cost_code`), Description (`description`), Unit, Budget Qty, Budget Rate, Estimated Total (`direct_cost_total`), Actual Cost (sum from `actual_costs` where `budget_line_id` matches), Committed Cost (sum from `committed_costs` where `budget_line_id` matches), Variance (EGP), Variance (%).
- **FR-002**: System MUST provide an AR/EN toggle that switches ALL text content including: column headers, badges, empty states, tooltips, currency formatting, and chart labels. The toggle state MUST persist in localStorage under key `pzone-lang`.
- **FR-003**: System MUST show 4 summary KPI cards: Total Estimated, Total Actual, Total Variance, Items Over Budget count.
- **FR-004**: System MUST render a horizontal bar chart of top 10 items by absolute variance, color-coded red (overrun) / green (under-budget).
- **FR-005**: System MUST export the table data to `.xlsx` using the `xlsx` library (already installed). Export MUST contain numeric cells, not formatted strings.
- **FR-006**: System MUST query budget lines from the latest `approved` or `locked` budget_header for the selected project.
- **FR-007**: System MUST join actual costs to budget lines via `budget_line_id` foreign key on the `actual_costs` table. If `actual_costs` does not currently have a `budget_line_id` column, the spec acknowledges a DB migration is needed.
- **FR-008**: Variance MUST be calculated as: `Estimated - (Actual + Committed)`. Positive = under-budget, Negative = overrun.
- **FR-009**: System MUST color-code rows: green if variance ≥ 0, yellow if variance is negative but < 10% of estimated, red if variance is negative and ≥ 10% of estimated.
- **FR-010**: System MUST support project filtering via a dropdown (reuse existing `useProjectsForCostControl` pattern).

### Key Entities

- **BudgetLine** (existing): Represents the estimated cost per BOQ item. Key fields: `id`, `budget_header_id`, `project_id`, `cost_code`, `description`, `unit`, `budget_qty`, `direct_cost_total`, `line_total`.
- **ActualCost** (existing): Represents actual expenditure. Key fields: `id`, `project_id`, `cost_type`, `amount`. **Gap**: Currently lacks `budget_line_id` to link to specific BOQ lines.
- **CommittedCost** (existing): Represents PO/contract commitments. Key fields: `remaining`, `project_id`, `status`. **Gap**: Same — lacks `budget_line_id`.
- **BOQCostComparison** (derived, in-memory): Computed entity combining BudgetLine + aggregated ActualCost + CommittedCost per line item.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: A user can identify all BOQ items exceeding budget in under 10 seconds (no manual cross-referencing).
- **SC-002**: The language toggle switches all visible text within 100ms (no flicker, no page reload).
- **SC-003**: The Excel export accurately reproduces all table data with ≤2% numerical deviation (rounding only).
- **SC-004**: Page load time ≤ 3 seconds for a project with 200 budget lines and 500 actual cost entries.
- **SC-005**: Zero TypeScript `any` casts in new code (strict mode compliance).

---

## Assumptions

- The `actual_costs` and `committed_costs` tables currently lack a `budget_line_id` column. A Supabase DB migration will be needed to add this FK. Until migration is applied, variance per line item will be unavailable — the feature will degrade to showing budget-only data with a "Actual costs not linked" notice.
- The language toggle is independent of any i18n library. It uses a simple React context + dictionary pattern (like the existing `COST_TYPE_LABELS` pattern in CostControlPage).
- The page will be accessible via a new sidebar link under the "التكاليف" (Costs) section, between the existing "Cost Control" and "Client Invoices" links.
- Mobile responsiveness is secondary (P3). The primary audience uses desktop monitors in site offices.
- The existing `recharts` library is used for the variance bar chart (already installed).
- Currency is EGP (Egyptian Pound) as established in the existing `formatCurrency` helper.

---

## Constitution Compliance Checklist

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Construction-Domain Authority | ✅ | Uses BOQ, CBS, cost_code terminology; variance analysis is standard EVM practice |
| II. Bilingual-First (AR/EN) | ✅ | Core user story (P1) — full AR/EN toggle with RTL support |
| III. Serverless Client-Side | ✅ | All computation in-browser; only Supabase for data retrieval |
| IV. Executive-Grade Reporting | ✅ | Summary cards, bar chart, Excel export with branding |
| V. Security & Credential Hygiene | ✅ | No new credentials needed; uses existing Supabase auth |
| VI. Spec-Driven Development | ✅ | This document itself |
| VII. Progressive Enhancement | ✅ | Graceful degradation when budget_line_id FK is missing |
