import { describe, expect, it } from "vitest";
import { computeFinancialSnapshot } from "@/hooks/useFinancialSnapshot";
import type { Invoice } from "@/hooks/useIPC";

function invoice(overrides: Partial<Invoice>): Invoice {
  return {
    id: crypto.randomUUID(),
    project_code: "PZ-001",
    sector: "North Coast",
    submitted_date: "2026-05-01",
    project_name: "Project",
    client: "Client",
    contract_value: 1000,
    invoice_number: "1",
    work_previous: 0,
    work_current: 100,
    work_total: 100,
    total_deductions: 0,
    net_previous: 0,
    net_current: 100,
    net_total: 100,
    deductions_breakdown: [],
    variations: [],
    fluctuation_amount: 0,
    approved_previous: 0,
    approved_current: 80,
    approved_total: 80,
    approved_deductions: 0,
    approved_net_previous: 0,
    approved_net_current: 80,
    approved_net_total: 80,
    approved_deductions_breakdown: [],
    approved_variations: [],
    approved_fluctuation_amount: 0,
    tax_type: "none",
    tax_amount: 0,
    tax_direction: "added",
    approved_tax_type: "none",
    approved_tax_amount: 0,
    approved_tax_direction: "added",
    status: "معتمد",
    invoice_type: "progress",
    linked_submitted_id: null,
    approval_date: "2026-05-10",
    collection_date: null,
    approval_notes: null,
    contract_percentage: 0.1,
    total_collections: 0,
    unbilled: 0,
    expected_collection: 0,
    contract_id: null,
    project_id: null,
    ipc_project_id: null,
    share_token: null,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
    ...overrides,
  };
}

function makeCollection(id: string, overrides: Record<string, any> = {}) {
  return {
    id,
    project_code: "PZ-001",
    project_name: "Project",
    invoice_id: null,
    invoice_number: "1",
    client: "Client",
    collection_date: "2026-05-20",
    collection_month: "2026-05-01",
    amount: 100,
    currency: "EGP",
    reference_no: `REF-${id}`,
    bank_account: null,
    notes: null,
    source_type: "manual",
    source_file_name: null,
    source_row_key: null,
    dedupe_key: `PZ-001:1:2026-05-20:100.00:REF-${id}`,
    status: "posted",
    created_by: null,
    created_at: "2026-05-20T00:00:00Z",
    updated_at: "2026-05-20T00:00:00Z",
    ...overrides,
  };
}

describe("Collection Ledger — Phase 4 Tests", () => {
  it("excludes reversed transactions from actual collected totals", () => {
    const snapshot = computeFinancialSnapshot({
      invoices: [invoice({ approved_net_total: 500 })],
      collections: [
        makeCollection("c1", { amount: 200, dedupe_key: "KEY-1" }),
        makeCollection("c2", { amount: 150, dedupe_key: "KEY-2", status: "reversed" }),
      ],
      cashFlowTransactions: [],
      forecasts: [],
    });

    // Only posted (c1 = 200) should count, reversed (c2) excluded
    expect(snapshot.portfolio.total_collections).toBe(200);
    expect(snapshot.portfolio.total_outstanding).toBe(300);
  });

  it("excludes validated (not yet posted) transactions from actual totals", () => {
    const snapshot = computeFinancialSnapshot({
      invoices: [invoice({ approved_net_total: 500 })],
      collections: [
        makeCollection("c1", { amount: 100, dedupe_key: "KEY-1", status: "posted" }),
        makeCollection("c2", { amount: 300, dedupe_key: "KEY-2", status: "validated" }),
      ],
      cashFlowTransactions: [],
      forecasts: [],
    });

    expect(snapshot.portfolio.total_collections).toBe(100);
    expect(snapshot.portfolio.total_outstanding).toBe(400);
  });

  it("detects over-collection control issue", () => {
    const snapshot = computeFinancialSnapshot({
      invoices: [invoice({ approved_net_total: 200 })],
      collections: [
        makeCollection("c1", { amount: 250, dedupe_key: "KEY-1" }),
      ],
      cashFlowTransactions: [],
      forecasts: [],
    });

    const overCollectionIssue = snapshot.controlIssues.find((i) => i.code === "OVER_COLLECTION");
    // Over-collection: collected 250 > approved 200
    expect(overCollectionIssue).toBeDefined();
  });

  it("accumulates collections correctly across multiple posted rows", () => {
    const snapshot = computeFinancialSnapshot({
      invoices: [invoice({ approved_net_total: 1000 })],
      collections: [
        makeCollection("c1", { amount: 200, dedupe_key: "KEY-1" }),
        makeCollection("c2", { amount: 300, dedupe_key: "KEY-2" }),
        makeCollection("c3", { amount: 150, dedupe_key: "KEY-3" }),
      ],
      cashFlowTransactions: [],
      forecasts: [],
    });

    expect(snapshot.portfolio.total_collections).toBe(650);
    expect(snapshot.portfolio.total_outstanding).toBe(350);
    expect(snapshot.projects[0].actual_collected).toBe(650);
  });

  it("monthly cumulative totals reconcile by project", () => {
    const snapshot = computeFinancialSnapshot({
      invoices: [
        invoice({ project_code: "PZ-001", approved_net_total: 500, submitted_date: "2026-04-01" }),
        invoice({ project_code: "PZ-002", project_name: "Project 2", approved_net_total: 300, submitted_date: "2026-05-01", contract_value: 800 }),
      ],
      collections: [
        makeCollection("c1", { project_code: "PZ-001", amount: 100, collection_month: "2026-04-01", dedupe_key: "KEY-1" }),
        makeCollection("c2", { project_code: "PZ-002", amount: 50, collection_month: "2026-05-01", dedupe_key: "KEY-2" }),
      ],
      cashFlowTransactions: [],
      forecasts: [],
    });

    // Total portfolio collections = 100 + 50 = 150
    expect(snapshot.portfolio.total_collections).toBe(150);
    // Each project has correct individual collections
    const p1 = snapshot.projects.find((p) => p.project_code === "PZ-001");
    const p2 = snapshot.projects.find((p) => p.project_code === "PZ-002");
    expect(p1?.actual_collected).toBe(100);
    expect(p2?.actual_collected).toBe(50);
  });
});
