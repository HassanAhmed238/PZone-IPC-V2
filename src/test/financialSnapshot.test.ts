import { describe, expect, it } from "vitest";
import { buildLegacyCollections, computeFinancialSnapshot, areFiltersEqual, useMemoizedFilters } from "@/hooks/useFinancialSnapshot";
import type { Invoice } from "@/hooks/useIPC";
import { renderHook } from "@testing-library/react";

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

describe("computeFinancialSnapshot", () => {
  it("uses the latest IPC per project and does not double-count contract value", () => {
    const snapshot = computeFinancialSnapshot({
      invoices: [
        invoice({ invoice_number: "1", work_total: 100, approved_net_total: 80 }),
        invoice({ invoice_number: "2", work_total: 250, approved_net_total: 200 }),
      ],
      collections: buildLegacyCollections([
        invoice({
          id: "jan-pz-001",
          project_code: "PZ-001",
          invoice_number: "1",
          submitted_date: "2026-01-20",
          approval_date: "2026-01-25",
          total_collections: 100,
          approved_net_total: 300,
        }),
        invoice({
          id: "apr-pz-001",
          project_code: "PZ-001",
          invoice_number: "2",
          submitted_date: "2026-04-20",
          approval_date: "2026-04-25",
          total_collections: 250,
          approved_net_total: 300,
        }),
        invoice({
          id: "apr-pz-002",
          project_code: "PZ-002",
          invoice_number: "1",
          submitted_date: "2026-04-10",
          approval_date: "2026-04-15",
          total_collections: 50,
          approved_net_total: 100,
        }),
      ]),
      cashFlowTransactions: [],
      forecasts: [],
    });

    expect(snapshot.portfolio.total_contract_value).toBe(1000);
    expect(snapshot.portfolio.total_submitted).toBe(250);
    expect(snapshot.portfolio.total_approved_net).toBe(200);
    expect(snapshot.projects[0].latest_ipc_number).toBe("2");
  });

  it("treats final IPC labels as latest even without a numeric max", () => {
    const snapshot = computeFinancialSnapshot({
      invoices: [
        invoice({ invoice_number: "8", work_total: 800, approved_net_total: 700 }),
        invoice({ invoice_number: "ختامي", work_total: 950, approved_net_total: 900 }),
      ],
      collections: [],
      cashFlowTransactions: [],
      forecasts: [],
    });

    expect(snapshot.projects[0].latest_ipc_number).toBe("ختامي");
    expect(snapshot.portfolio.total_approved_net).toBe(900);
  });

  it("keeps actual collections separate from forecast cash-in", () => {
    const snapshot = computeFinancialSnapshot({
      invoices: [invoice({ approved_net_total: 500 })],
      collections: [{
        id: "c1",
        project_code: "PZ-001",
        project_name: "Project",
        invoice_id: null,
        invoice_number: "1",
        client: "Client",
        collection_date: "2026-05-20",
        collection_month: "2026-05-01",
        amount: 150,
        currency: "EGP",
        reference_no: "R1",
        bank_account: null,
        notes: null,
        source_type: "manual",
        source_file_name: null,
        source_row_key: null,
        dedupe_key: "PZ-001:1:2026-05-20:150:R1",
        status: "posted",
        created_by: null,
        created_at: "2026-05-20T00:00:00Z",
        updated_at: "2026-05-20T00:00:00Z",
      }],
      cashFlowTransactions: [],
      forecasts: [{
        id: "f1",
        forecast_date: "2026-06-15",
        forecast_month: "2026-06-01",
        project_code: "PZ-001",
        project_name: "Project",
        type: "in",
        category: "expected_collection",
        amount: 200,
        currency: "EGP",
        probability_pct: 50,
        description: null,
        reference_no: null,
        source_type: "manual",
        source_id: null,
        status: "active",
        created_by: null,
        created_at: "2026-06-01T00:00:00Z",
        updated_at: "2026-06-01T00:00:00Z",
      }],
    });

    expect(snapshot.portfolio.total_collections).toBe(150);
    expect(snapshot.portfolio.total_forecast_cash_in).toBe(100);
    expect(snapshot.portfolio.total_outstanding).toBe(350);
  });

  it("uses posted collection transactions only for actual collected totals", () => {
    const baseCollection = {
      id: "c1",
      project_code: "PZ-001",
      project_name: "Project",
      invoice_id: null,
      invoice_number: "1",
      client: "Client",
      collection_date: "2026-05-20",
      collection_month: "2026-05-01",
      amount: 150,
      currency: "EGP",
      reference_no: "R1",
      bank_account: null,
      notes: null,
      source_type: "manual",
      source_file_name: null,
      source_row_key: null,
      dedupe_key: "PZ-001:1:2026-05-20:150:R1",
      created_by: null,
      created_at: "2026-05-20T00:00:00Z",
      updated_at: "2026-05-20T00:00:00Z",
    };

    const snapshot = computeFinancialSnapshot({
      invoices: [invoice({ approved_net_total: 500 })],
      collections: [
        { ...baseCollection, id: "validated", status: "validated" },
        { ...baseCollection, id: "posted", dedupe_key: "PZ-001:1:2026-05-21:75:R2", amount: 75, status: "posted" },
      ],
      cashFlowTransactions: [],
      forecasts: [],
    });

    expect(snapshot.portfolio.total_collections).toBe(75);
    expect(snapshot.portfolio.total_outstanding).toBe(425);
  });

  it("applies month filters to collections, cash-out, and forecasts", () => {
    const baseCollection = {
      project_code: "PZ-001",
      project_name: "Project",
      invoice_id: null,
      invoice_number: "1",
      client: "Client",
      currency: "EGP",
      reference_no: null,
      bank_account: null,
      notes: null,
      source_type: "manual",
      source_file_name: null,
      source_row_key: null,
      status: "posted" as const,
      created_by: null,
      created_at: "2026-05-20T00:00:00Z",
      updated_at: "2026-05-20T00:00:00Z",
    };

    const snapshot = computeFinancialSnapshot({
      invoices: [invoice({ approved_net_total: 1000, submitted_date: "2026-05-01" })],
      collections: [
        { ...baseCollection, id: "may-c", collection_date: "2026-05-20", collection_month: "2026-05-01", amount: 100, dedupe_key: "may-c" },
        { ...baseCollection, id: "jun-c", collection_date: "2026-06-20", collection_month: "2026-06-01", amount: 500, dedupe_key: "jun-c" },
      ],
      cashFlowTransactions: [
        {
          id: "may-out",
          transaction_date: "2026-05-22",
          transaction_month: "2026-05-01",
          project_code: "PZ-001",
          project_name: "Project",
          type: "out",
          category: "supplier",
          amount: 25,
          currency: "EGP",
          description: null,
          reference_no: null,
          counterparty: null,
          source_type: "manual",
          source_id: null,
          status: "posted",
          created_by: null,
          created_at: "2026-05-22T00:00:00Z",
          updated_at: "2026-05-22T00:00:00Z",
        },
        {
          id: "jun-out",
          transaction_date: "2026-06-22",
          transaction_month: "2026-06-01",
          project_code: "PZ-001",
          project_name: "Project",
          type: "out",
          category: "supplier",
          amount: 200,
          currency: "EGP",
          description: null,
          reference_no: null,
          counterparty: null,
          source_type: "manual",
          source_id: null,
          status: "posted",
          created_by: null,
          created_at: "2026-06-22T00:00:00Z",
          updated_at: "2026-06-22T00:00:00Z",
        },
      ],
      forecasts: [
        {
          id: "may-f",
          forecast_date: "2026-05-30",
          forecast_month: "2026-05-01",
          project_code: "PZ-001",
          project_name: "Project",
          type: "in",
          category: "expected_collection",
          amount: 300,
          currency: "EGP",
          probability_pct: 50,
          description: null,
          reference_no: null,
          source_type: "manual",
          source_id: null,
          status: "active",
          created_by: null,
          created_at: "2026-05-30T00:00:00Z",
          updated_at: "2026-05-30T00:00:00Z",
        },
        {
          id: "jun-f",
          forecast_date: "2026-06-30",
          forecast_month: "2026-06-01",
          project_code: "PZ-001",
          project_name: "Project",
          type: "in",
          category: "expected_collection",
          amount: 700,
          currency: "EGP",
          probability_pct: 100,
          description: null,
          reference_no: null,
          source_type: "manual",
          source_id: null,
          status: "active",
          created_by: null,
          created_at: "2026-06-30T00:00:00Z",
          updated_at: "2026-06-30T00:00:00Z",
        },
      ],
      filters: { dateFrom: "2026-05-01", dateTo: "2026-05-01" },
    });

    expect(snapshot.portfolio.total_collections).toBe(100);
    expect(snapshot.portfolio.total_cash_out).toBe(25);
    expect(snapshot.portfolio.total_forecast_cash_in).toBe(150);
    expect(snapshot.monthly.map((row) => row.monthKey)).toEqual(["2026-05"]);
  });

  it("flags stale submitted IPC with no approval after 30 days", () => {
    const staleDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const snapshot = computeFinancialSnapshot({
      invoices: [
        invoice({
          invoice_number: "1",
          submitted_date: staleDate,
          approval_date: null,
          status: "تحت الاعتماد",
        }),
      ],
      collections: [],
      cashFlowTransactions: [],
      forecasts: [],
    });

    const staleIssue = snapshot.controlIssues.find((i) => i.code === "STALE_SUBMITTED_IPC");
    expect(staleIssue).toBeDefined();
    expect(staleIssue!.project_code).toBe("PZ-001");
    expect(staleIssue!.suggested_action).toBeTruthy();
  });

  it("does NOT flag stale IPC if approval_date exists", () => {
    const staleDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const snapshot = computeFinancialSnapshot({
      invoices: [
        invoice({
          invoice_number: "1",
          submitted_date: staleDate,
          approval_date: "2026-05-10",
          status: "معتمد",
        }),
      ],
      collections: [],
      cashFlowTransactions: [],
      forecasts: [],
    });

    const staleIssue = snapshot.controlIssues.find((i) => i.code === "STALE_SUBMITTED_IPC");
    expect(staleIssue).toBeUndefined();
  });

  it("flags suspicious repeated collection amounts (3+ identical)", () => {
    const makeCollection = (id: string, dedupeKey: string) => ({
      id,
      project_code: "PZ-001",
      project_name: "Project",
      invoice_id: null,
      invoice_number: "1",
      client: "Client",
      collection_date: "2026-05-20",
      collection_month: "2026-05-01",
      amount: 500,
      currency: "EGP",
      reference_no: `R-${id}`,
      bank_account: null,
      notes: null,
      source_type: "manual",
      source_file_name: null,
      source_row_key: null,
      dedupe_key: dedupeKey,
      status: "posted" as const,
      created_by: null,
      created_at: "2026-05-20T00:00:00Z",
      updated_at: "2026-05-20T00:00:00Z",
    });

    const snapshot = computeFinancialSnapshot({
      invoices: [invoice({ approved_net_total: 5000 })],
      collections: [
        makeCollection("c1", "PZ-001:1:2026-05-20:500.00:R-c1"),
        makeCollection("c2", "PZ-001:1:2026-05-21:500.00:R-c2"),
        makeCollection("c3", "PZ-001:1:2026-05-22:500.00:R-c3"),
      ],
      cashFlowTransactions: [],
      forecasts: [],
    });

    const issue = snapshot.controlIssues.find((i) => i.code === "SUSPICIOUS_REPEATED_AMOUNT");
    expect(issue).toBeDefined();
    expect(issue!.project_code).toBe("PZ-001");
    expect(issue!.value).toBe(1500);
  });

  it("flags duplicate transaction fingerprints", () => {
    const makeCollection = (id: string, status: string) => ({
      id,
      project_code: "PZ-001",
      project_name: "Project",
      invoice_id: null,
      invoice_number: "1",
      client: "Client",
      collection_date: "2026-05-20",
      collection_month: "2026-05-01",
      amount: 300,
      currency: "EGP",
      reference_no: "R1",
      bank_account: null,
      notes: null,
      source_type: "manual",
      source_file_name: null,
      source_row_key: null,
      dedupe_key: "SAME-KEY-FOR-BOTH",
      status,
      created_by: null,
      created_at: "2026-05-20T00:00:00Z",
      updated_at: "2026-05-20T00:00:00Z",
    });

    const snapshot = computeFinancialSnapshot({
      invoices: [invoice({ approved_net_total: 1000 })],
      collections: [
        makeCollection("c1", "posted"),
        makeCollection("c2", "posted"),
      ],
      cashFlowTransactions: [],
      forecasts: [],
    });

    const issue = snapshot.controlIssues.find((i) => i.code === "DUPLICATE_TRANSACTION_FINGERPRINT");
    expect(issue).toBeDefined();
    expect(issue!.suggested_action).toContain("Remove or reverse");
  });

  it("forecast never affects actual collected totals", () => {
    const snapshot = computeFinancialSnapshot({
      invoices: [invoice({ approved_net_total: 1000 })],
      collections: [],
      cashFlowTransactions: [],
      forecasts: [{
        id: "f1",
        forecast_date: "2026-06-15",
        forecast_month: "2026-06-01",
        project_code: "PZ-001",
        project_name: "Project",
        type: "in",
        category: "expected_collection",
        amount: 999,
        currency: "EGP",
        probability_pct: 100,
        description: null,
        reference_no: null,
        source_type: "manual",
        source_id: null,
        status: "active",
        created_by: null,
        created_at: "2026-06-01T00:00:00Z",
        updated_at: "2026-06-01T00:00:00Z",
      }],
    });

    // actual_collected must remain 0 regardless of forecasts
    expect(snapshot.portfolio.total_collections).toBe(0);
    expect(snapshot.projects[0].actual_collected).toBe(0);
    // outstanding must be full approved minus 0 collected
    expect(snapshot.portfolio.total_outstanding).toBe(1000);
  });

  it("converts legacy cumulative invoice collections into monthly movement", () => {
    const legacyInvoices = [
      invoice({
        id: "jan-pz-001",
        project_code: "PZ-001",
        invoice_number: "1",
        submitted_date: "2026-01-20",
        approval_date: "2026-01-25",
        total_collections: 100,
        approved_net_total: 300,
      }),
      invoice({
        id: "apr-pz-001",
        project_code: "PZ-001",
        invoice_number: "2",
        submitted_date: "2026-04-20",
        approval_date: "2026-04-25",
        total_collections: 250,
        approved_net_total: 300,
      }),
      invoice({
        id: "apr-pz-002",
        project_code: "PZ-002",
        invoice_number: "1",
        submitted_date: "2026-04-10",
        approval_date: "2026-04-15",
        total_collections: 50,
        approved_net_total: 100,
      }),
    ];

    const snapshot = computeFinancialSnapshot({
      invoices: legacyInvoices,
      collections: buildLegacyCollections(legacyInvoices),
      cashFlowTransactions: [],
      forecasts: [],
    });

    const january = snapshot.monthly.find((row) => row.monthKey === "2026-01");
    const april = snapshot.monthly.find((row) => row.monthKey === "2026-04");

    expect(snapshot.sourceMode).toBe("legacy");
    expect(snapshot.portfolio.total_collections).toBe(300);
    expect(january?.actualCollected).toBe(100);
    expect(april?.actualCollected).toBe(200);
  });
});

describe("areFiltersEqual", () => {
  it("should return true when both filters are undefined", () => {
    expect(areFiltersEqual(undefined, undefined)).toBe(true);
  });

  it("should return false when one filter is undefined and the other is defined", () => {
    expect(areFiltersEqual({ dateFrom: "2026-01" }, undefined)).toBe(false);
    expect(areFiltersEqual(undefined, { dateFrom: "2026-01" })).toBe(false);
  });

  it("should return true when filter fields have same primitive values", () => {
    expect(
      areFiltersEqual(
        { dateFrom: "2026-01", dateTo: "2026-02", includeDraft: true },
        { dateFrom: "2026-01", dateTo: "2026-02", includeDraft: true }
      )
    ).toBe(true);
  });

  it("should return false when primitive filter fields differ", () => {
    expect(
      areFiltersEqual(
        { dateFrom: "2026-01", includeDraft: true },
        { dateFrom: "2026-01", includeDraft: false }
      )
    ).toBe(false);

    expect(
      areFiltersEqual(
        { dateFrom: "2026-01" },
        { dateFrom: "2026-02" }
      )
    ).toBe(false);
  });

  it("should return true when array fields are identical", () => {
    expect(
      areFiltersEqual(
        { projectCodes: ["P1", "P2"], clients: ["C1"], sectors: [], statuses: ["draft"] },
        { projectCodes: ["P1", "P2"], clients: ["C1"], sectors: [], statuses: ["draft"] }
      )
    ).toBe(true);
  });

  it("should return false when array fields have different items or length", () => {
    expect(
      areFiltersEqual(
        { projectCodes: ["P1", "P2"] },
        { projectCodes: ["P1"] }
      )
    ).toBe(false);

    expect(
      areFiltersEqual(
        { projectCodes: ["P1", "P2"] },
        { projectCodes: ["P2", "P1"] }
      )
    ).toBe(false);

    expect(
      areFiltersEqual(
        { projectCodes: ["P1"] },
        { projectCodes: undefined }
      )
    ).toBe(false);
  });
});

describe("useMemoizedFilters hook", () => {
  it("should maintain reference stability when identical filter options are passed", () => {
    const filter1 = { projectCodes: ["P1"], includeDraft: true };
    const filter2 = { projectCodes: ["P1"], includeDraft: true };

    const { result, rerender } = renderHook(({ filters }) => useMemoizedFilters(filters), {
      initialProps: { filters: filter1 },
    });

    const firstResult = result.current;
    expect(firstResult).toEqual(filter1);

    rerender({ filters: filter2 });
    const secondResult = result.current;

    // References must be strictly equal, despite filter2 being a new object literal reference
    expect(secondResult).toBe(firstResult);
  });

  it("should update reference and return a new object when filters actually change", () => {
    const filter1 = { projectCodes: ["P1"] };
    const filter2 = { projectCodes: ["P2"] };

    const { result, rerender } = renderHook(({ filters }) => useMemoizedFilters(filters), {
      initialProps: { filters: filter1 },
    });

    const firstResult = result.current;

    rerender({ filters: filter2 });
    const secondResult = result.current;

    expect(secondResult).not.toBe(firstResult);
    expect(secondResult).toEqual(filter2);
  });
});
