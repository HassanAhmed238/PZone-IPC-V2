import { describe, expect, it } from "vitest";
import { buildCollectionDedupeKey, validateCollectionImportRows } from "@/lib/collection-import";
import type { CollectionTransaction, ProjectFinancialSummary } from "@/hooks/useFinancialSnapshot";

function project(overrides: Partial<ProjectFinancialSummary> = {}): ProjectFinancialSummary {
  return {
    project_code: "PZ-001",
    project_name: "Project",
    client: "Client",
    sector: "Cairo",
    contract_value: 1000,
    submitted_total: 900,
    submitted_current: 100,
    approved_total: 800,
    approved_current: 100,
    approved_net: 800,
    total_deductions: 0,
    actual_collected: 300,
    forecast_cash_in: 0,
    actual_cash_out: 0,
    forecast_cash_out: 0,
    outstanding: 500,
    over_collected_amount: 0,
    collection_efficiency: 0.375,
    expected_cash_in: 0,
    ipc_count: 2,
    latest_ipc_number: "2",
    latest_ipc_sort: 2,
    status: "approved",
    approval_date: "2026-05-01",
    currency: "EGP",
    flags: [],
    ...overrides,
  };
}

function collection(overrides: Partial<CollectionTransaction> = {}): CollectionTransaction {
  return {
    id: "c1",
    project_code: "PZ-001",
    project_name: "Project",
    invoice_id: null,
    invoice_number: "IPC-2",
    client: "Client",
    collection_date: "2026-05-15",
    collection_month: "2026-05-01",
    amount: 100,
    currency: "EGP",
    reference_no: "REC-1",
    bank_account: null,
    notes: null,
    source_type: "manual",
    source_file_name: null,
    source_row_key: null,
    dedupe_key: "PZ-001:IPC-2:2026-05-15:100.00:REC-1",
    status: "posted",
    created_by: null,
    created_at: "2026-05-15T00:00:00Z",
    updated_at: "2026-05-15T00:00:00Z",
    ...overrides,
  };
}

describe("collection import validation", () => {
  it("builds a stable duplicate key from project, invoice, date, amount, and reference", () => {
    expect(buildCollectionDedupeKey({
      project_code: " pz-001 ",
      invoice_number: "ipc-2",
      collection_date: "2026-05-15",
      amount: 100,
      reference_no: "rec-1",
    })).toBe("PZ-001:IPC-2:2026-05-15:100.00:REC-1");
  });

  it("blocks exact duplicates and unknown projects", () => {
    const preview = validateCollectionImportRows({
      projects: [project()],
      existingCollections: [collection()],
      rows: [
        {
          project_code: "PZ-001",
          invoice_number: "IPC-2",
          collection_date: "2026-05-15",
          amount: 100,
          reference_no: "REC-1",
          currency: "EGP",
        },
        {
          project_code: "PZ-404",
          collection_date: "2026-05-20",
          amount: 50,
          reference_no: "REC-2",
          currency: "EGP",
        },
      ],
    });

    expect(preview.blockedRows).toHaveLength(2);
    expect(preview.issues.map((issue) => issue.code)).toContain("duplicate");
    expect(preview.issues.map((issue) => issue.code)).toContain("unknown_project");
  });

  it("warns on over-collection and possible duplicates without blocking otherwise valid rows", () => {
    const preview = validateCollectionImportRows({
      projects: [project({ outstanding: 75 })],
      existingCollections: [collection({ dedupe_key: "different-key" })],
      rows: [{
        project_code: "PZ-001",
        invoice_number: "IPC-2",
        collection_month: "2026-05-01",
        amount: 100,
        reference_no: "REC-NEW",
        currency: "EGP",
      }],
    });

    expect(preview.validRows).toHaveLength(1);
    expect(preview.totals.warningCount).toBe(2);
    expect(preview.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["possible_duplicate", "over_collection"]));
  });

  it("blocks currency mismatch and invalid amounts", () => {
    const preview = validateCollectionImportRows({
      projects: [project({ currency: "USD" })],
      rows: [{
        project_code: "PZ-001",
        collection_date: "2026-05-15",
        amount: 0,
        reference_no: "REC-3",
        currency: "EGP",
      }],
    });

    expect(preview.blockedRows).toHaveLength(1);
    expect(preview.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["currency_mismatch", "invalid_amount"]));
  });
});
