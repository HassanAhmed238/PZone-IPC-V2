import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mergeInvoices,
  getInvoiceKey,
  syncLocalInvoicesToSupabase,
  normalizeBoardShareSlug,
  type Invoice,
} from "@/hooks/useIPC";

const queryMock = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

const mockFrom = vi.fn().mockReturnValue(queryMock);

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

function createMockInvoice(overrides: Partial<Invoice>): Invoice {
  return {
    id: crypto.randomUUID(),
    project_code: "PRJ-01",
    sector: null,
    submitted_date: null,
    project_name: "Test Project",
    client: null,
    contract_value: 100000,
    invoice_number: null,
    work_previous: 0,
    work_current: 0,
    work_total: 0,
    total_deductions: 0,
    net_previous: 0,
    net_current: 0,
    net_total: 0,
    deductions_breakdown: [],
    variations: [],
    fluctuation_amount: 0,
    approved_previous: 0,
    approved_current: 0,
    approved_total: 0,
    approved_deductions: 0,
    approved_net_previous: 0,
    approved_net_current: 0,
    approved_net_total: 0,
    approved_deductions_breakdown: [],
    approved_variations: [],
    approved_fluctuation_amount: 0,
    tax_type: "none",
    tax_amount: 0,
    tax_direction: "added",
    approved_tax_type: "none",
    approved_tax_amount: 0,
    approved_tax_direction: "added",
    status: "تحت الاعتماد",
    invoice_type: "submitted",
    linked_submitted_id: null,
    approval_date: null,
    collection_date: null,
    approval_notes: null,
    contract_percentage: 0,
    total_collections: 0,
    unbilled: 0,
    expected_collection: 0,
    contract_id: null,
    project_id: null,
    ipc_project_id: null,
    share_token: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("mergeInvoices and getInvoiceKey", () => {
  describe("getInvoiceKey", () => {
    it("keys normal invoices by project_code::invoice_number", () => {
      const inv = createMockInvoice({ project_code: "PRJ-01", invoice_number: "5" });
      expect(getInvoiceKey(inv)).toBe("PRJ-01::5");
    });

    it("keys draft invoices by draft::id", () => {
      const inv = createMockInvoice({ id: "uuid-123", project_code: "PRJ-01", invoice_number: null });
      expect(getInvoiceKey(inv)).toBe("draft::uuid-123");
    });
  });

  describe("mergeInvoices draft de-duplication", () => {
    it("keeps multiple draft invoices with different IDs for the same project code", () => {
      const dbInvoices = [
        createMockInvoice({ id: "db-draft-1", project_code: "PRJ-01", invoice_number: null }),
      ];
      const lsInvoices = [
        createMockInvoice({ id: "ls-draft-1", project_code: "PRJ-01", invoice_number: null }),
      ];

      const merged = mergeInvoices(dbInvoices, lsInvoices);
      expect(merged.length).toBe(2);
      const ids = merged.map((i) => i.id);
      expect(ids).toContain("db-draft-1");
      expect(ids).toContain("ls-draft-1");
    });

    it("overwrites draft invoices when db and ls have the same draft ID", () => {
      const dbInvoices = [
        createMockInvoice({ id: "shared-draft", project_code: "PRJ-01", invoice_number: null, project_name: "From DB" }),
      ];
      const lsInvoices = [
        createMockInvoice({ id: "shared-draft", project_code: "PRJ-01", invoice_number: null, project_name: "From LS" }),
      ];

      const merged = mergeInvoices(dbInvoices, lsInvoices);
      expect(merged.length).toBe(1);
      expect(merged[0].id).toBe("shared-draft");
      expect(merged[0].project_name).toBe("From DB"); // DB has higher priority
    });

    it("de-duplicates normal invoices by project_code::invoice_number", () => {
      const dbInvoices = [
        createMockInvoice({ id: "db-inv-1", project_code: "PRJ-01", invoice_number: "2", project_name: "DB Version" }),
      ];
      const lsInvoices = [
        createMockInvoice({ id: "ls-inv-1", project_code: "PRJ-01", invoice_number: "2", project_name: "LS Version" }),
      ];

      const merged = mergeInvoices(dbInvoices, lsInvoices);
      expect(merged.length).toBe(1);
      expect(merged[0].project_name).toBe("DB Version"); // DB has higher priority
    });
  });

  describe("syncLocalInvoicesToSupabase", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should insert a new invoice with the client-provided id", async () => {
      const localInvoice = createMockInvoice({
        id: "local-draft-uuid",
        project_code: "PRJ-99",
        invoice_number: null,
      });

      const insertedPayloads: Record<string, unknown>[] = [];
      queryMock.insert.mockImplementation(async (payload: unknown) => {
        insertedPayloads.push(payload as Record<string, unknown>);
        return { error: null };
      });

      queryMock.select.mockImplementation((cols) => {
        if (cols.includes("deductions_breakdown")) {
          return {
            limit: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return Promise.resolve({ data: [], error: null });
      });

      const syncedCount = await syncLocalInvoicesToSupabase([localInvoice]);

      expect(syncedCount).toBe(1);
      expect(insertedPayloads.length).toBe(1);
      expect(insertedPayloads[0].id).toBe("local-draft-uuid");
      expect(insertedPayloads[0].project_code).toBe("PRJ-99");
    });

    it("should update an existing invoice if it already exists in Supabase", async () => {
      const localInvoice = createMockInvoice({
        id: "existing-draft-uuid",
        project_code: "PRJ-99",
        invoice_number: null,
      });

      const updatedPayloads: Record<string, unknown>[] = [];
      const eqMock = vi.fn().mockImplementation(async (col: string, val: string) => {
        return { error: null };
      });
      queryMock.update.mockImplementation((payload: unknown) => {
        updatedPayloads.push(payload as Record<string, unknown>);
        return { eq: eqMock };
      });

      queryMock.select.mockImplementation((cols) => {
        if (cols.includes("deductions_breakdown")) {
          return {
            limit: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return Promise.resolve({
          data: [
            {
              id: "existing-draft-uuid",
              project_code: "PRJ-99",
              invoice_number: null,
            },
          ],
          error: null,
        });
      });

      const syncedCount = await syncLocalInvoicesToSupabase([localInvoice]);

      expect(syncedCount).toBe(1);
      expect(queryMock.update).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith("id", "existing-draft-uuid");
    });
  });
});

describe("normalizeBoardShareSlug", () => {
  it.each([
    ["Mr Hesham CEO", "Mr-Hesham-CEO"],
    [" eng-mahdi-COO ", "eng-mahdi-COO"],
    ["CEO / Board @ 2026", "CEO-Board-2026"],
  ])("normalizes %s to %s", (rawName, expectedSlug) => {
    expect(normalizeBoardShareSlug(rawName)).toBe(expectedSlug);
  });
});
