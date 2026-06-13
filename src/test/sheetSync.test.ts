import { describe, expect, it } from "vitest";
import {
  inferSheetPeriodMonth,
  mergeDiscoveredSheetConfigs,
  detectColumnLayout,
} from "@/lib/sheetSync";
import { getInvoiceKey, mergeInvoices } from "@/hooks/useIPC";

// Re-export the existing tests to ensure they're not broken
describe("sheet sync discovery", () => {
  it("keeps static month keys and includes newly discovered tabs", () => {
    const configs = mergeDiscoveredSheetConfigs([
      { label: "Bank", gid: "bank-gid" },
      { label: "January 2026", gid: "710892751" },
      { label: "February 2026", gid: "436039118" },
      { label: "March 2026", gid: "393117100" },
      { label: "April 2026", gid: "801847961" },
      { label: "May 2026", gid: "381875970" },
      { label: "June 2026", gid: "331791800" },
      { label: "for test", gid: "504143623" },
    ]);

    expect(configs.map((config) => config.label)).toContain("Bank");
    expect(configs.map((config) => config.label)).toContain("for test");
    expect(configs.find((config) => config.label === "January 2026")?.key).toBe("2026-01");
    expect(configs.find((config) => config.label === "for test")?.key).toBe("sheet-504143623");
  });

  it("uses a real month key for newly added month tabs", () => {
    const configs = mergeDiscoveredSheetConfigs([{ label: "July 2026", gid: "777" }]);
    expect(configs[0]).toMatchObject({
      key: "2026-07",
      label: "July 2026",
      periodKey: "2026-07",
    });
  });

  it.each([
    ["January 2026", "2026-01"],
    ["July 2026", "2026-07"],
    ["for test", undefined],
  ])("infers period month for %s", (label, expected) => {
    expect(inferSheetPeriodMonth(label)).toBe(expected);
  });
});

describe("Bug 5: detectColumnLayout", () => {
  it("detects project_status column from header text", () => {
    const headerWithStatus = [
      "Project ID", "Sector", "Date", "Project Name", "Client",
      "Contract Value", "IPC No.", "Work Prev", "Work Curr", "Work Total",
      "Deductions", "Net Prev", "Net Curr", "Net Total",
      "App Prev", "App Curr", "App Total", "App Ded",
      "App Net Prev", "App Net Curr", "App Net Total",
      "Status", "Approval Date", "Project Status",
      "Percentage", "Monthly Collection", "Total Collection", "Expected",
    ];

    const layout = detectColumnLayout(headerWithStatus);
    expect(layout.hasProjectStatus).toBe(true);
    expect(layout.monthlyCollectionIndex).toBe(25);
    expect(layout.totalCollectionIndex).toBe(26);
  });

  it("detects layout without project_status column", () => {
    const headerWithoutStatus = [
      "Project ID", "Sector", "Date", "Project Name", "Client",
      "Contract Value", "IPC No.", "Work Prev", "Work Curr", "Work Total",
      "Deductions", "Net Prev", "Net Curr", "Net Total",
      "App Prev", "App Curr", "App Total", "App Ded",
      "App Net Prev", "App Net Curr", "App Net Total",
      "Status", "Approval Date",
      "Percentage", "Monthly Collection", "Total Collection", "Expected",
    ];

    const layout = detectColumnLayout(headerWithoutStatus);
    expect(layout.hasProjectStatus).toBe(false);
    expect(layout.monthlyCollectionIndex).toBe(24);
    expect(layout.totalCollectionIndex).toBe(25);
  });

  it("detects Arabic project_status header", () => {
    const header = new Array(28).fill("");
    header[0] = "Project ID";
    header[23] = "حالة المشروع";

    const layout = detectColumnLayout(header);
    expect(layout.hasProjectStatus).toBe(true);
  });

  it("falls back to cell count when header text is ambiguous", () => {
    // 28+ cells but no recognizable status header → fallback to cell-count heuristic
    const header = new Array(28).fill("");
    header[0] = "Project ID";
    header[23] = "Something Unknown";

    const layout = detectColumnLayout(header);
    // Should still detect as "with status" because 28+ columns
    expect(layout.hasProjectStatus).toBe(true);
  });
});

describe("Bug 4: Arabic normalization in getInvoiceKey", () => {
  const makeInv = (invoiceNumber: string | null) => ({
    id: "test-id",
    project_code: "PZ-001",
    invoice_number: invoiceNumber,
  });

  it("normalizes alef maqsura to yaa", () => {
    // ختامى (with alef maqsura) should match ختامي (with yaa)
    const key1 = getInvoiceKey(makeInv("ختامى"));
    const key2 = getInvoiceKey(makeInv("ختامي"));
    expect(key1).toBe(key2);
  });

  it("normalizes hamza variants", () => {
    // أولي should match اولي
    const key1 = getInvoiceKey(makeInv("أولي"));
    const key2 = getInvoiceKey(makeInv("اولي"));
    expect(key1).toBe(key2);
  });

  it("strips tashkeel diacritics", () => {
    // مُعْتَمَد should match معتمد
    const key1 = getInvoiceKey(makeInv("مُعْتَمَد"));
    const key2 = getInvoiceKey(makeInv("معتمد"));
    expect(key1).toBe(key2);
  });

  it("collapses whitespace", () => {
    const key1 = getInvoiceKey(makeInv("IPC  2"));
    const key2 = getInvoiceKey(makeInv("IPC 2"));
    expect(key1).toBe(key2);
  });

  it("uses draft::id for null invoice_number", () => {
    const key = getInvoiceKey(makeInv(null));
    expect(key).toBe("draft::test-id");
  });
});

describe("Bug 4: mergeInvoices deduplication with Arabic variants", () => {
  function fullInvoice(overrides: Partial<any> = {}): any {
    return {
      id: crypto.randomUUID(),
      project_code: "PZ-001",
      sector: "Test",
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
      status: "approved",
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

  it("deduplicates invoices with Arabic character variants", () => {
    const lsInvoice = fullInvoice({ id: "ls-1", invoice_number: "ختامى", net_total: 100 }); // alef maqsura
    const dbInvoice = fullInvoice({ id: "db-1", invoice_number: "ختامي", net_total: 200 }); // yaa

    const merged = mergeInvoices([dbInvoice], [lsInvoice]);
    // DB should win — there should be exactly 1 result, not 2
    expect(merged).toHaveLength(1);
    expect(merged[0].net_total).toBe(200);
  });
});
