import { describe, it, expect } from "vitest";
import { autoCalc, type InvoiceInput } from "@/hooks/useIPC";

/**
 * Unit tests for the autoCalc financial calculation engine.
 * This is the most critical piece of business logic in the app.
 */

function makeInvoice(overrides: Partial<InvoiceInput> = {}): Partial<InvoiceInput> {
  return {
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
    ...overrides,
  };
}

describe("autoCalc", () => {
  /* ── Basic totals ────────────────────────────────────────── */

  it("calculates work_total from previous + current", () => {
    const result = autoCalc(makeInvoice({
      work_previous: 100_000,
      work_current: 50_000,
    }));
    expect(result.work_total).toBe(150_000);
  });

  it("includes VOs in work_total", () => {
    const result = autoCalc(makeInvoice({
      work_previous: 100_000,
      work_current: 50_000,
      variations: [
        { vo_number: "VO-01", description: "Extra work", amount: 20_000 },
      ],
    }));
    expect(result.work_total).toBe(170_000);
  });

  it("includes fluctuation in work_total", () => {
    const result = autoCalc(makeInvoice({
      work_previous: 100_000,
      work_current: 50_000,
      fluctuation_amount: 5_000,
    }));
    expect(result.work_total).toBe(155_000);
  });

  /* ── Deductions ──────────────────────────────────────────── */

  it("sums deductions_breakdown into total_deductions", () => {
    const result = autoCalc(makeInvoice({
      work_previous: 200_000,
      work_current: 100_000,
      deductions_breakdown: [
        { name: "Advance recovery", amount: 10_000 },
        { name: "Retention", amount: 5_000 },
      ],
    }));
    expect(result.total_deductions).toBe(15_000);
  });

  /* ── Net with tax ────────────────────────────────────────── */

  it("calculates net_total with tax added", () => {
    const result = autoCalc(makeInvoice({
      work_previous: 100_000,
      work_current: 50_000,
      deductions_breakdown: [{ name: "Retention", amount: 10_000 }],
      tax_amount: 7_000,
      tax_direction: "added",
    }));
    // work_total = 150K, deductions = 10K, base = 140K, +7K tax = 147K
    expect(result.net_total).toBe(147_000);
  });

  it("calculates net_total with tax withheld", () => {
    const result = autoCalc(makeInvoice({
      work_previous: 100_000,
      work_current: 50_000,
      deductions_breakdown: [{ name: "Retention", amount: 10_000 }],
      tax_amount: 7_000,
      tax_direction: "withheld",
    }));
    // work_total = 150K, deductions = 10K, base = 140K, -7K tax = 133K
    expect(result.net_total).toBe(133_000);
  });

  /* ── Approved side ───────────────────────────────────────── */

  it("calculates approved_total and approved_net_total", () => {
    const result = autoCalc(makeInvoice({
      approved_previous: 80_000,
      approved_current: 40_000,
      approved_deductions_breakdown: [{ name: "Retention", amount: 6_000 }],
      approved_tax_amount: 3_000,
      approved_tax_direction: "added",
    }));
    expect(result.approved_total).toBe(120_000);
    expect(result.approved_deductions).toBe(6_000);
    // 120K - 6K + 3K = 117K
    expect(result.approved_net_total).toBe(117_000);
  });

  /* ── Edge cases ──────────────────────────────────────────── */

  it("handles all-zero inputs without NaN", () => {
    const result = autoCalc(makeInvoice());
    expect(result.work_total).toBe(0);
    expect(result.net_total).toBe(0);
    expect(result.approved_net_total).toBe(0);
    expect(Number.isNaN(result.work_total)).toBe(false);
  });

  it("preserves existing work_total when no breakdown provided", () => {
    // Simulates an Excel import that only sets work_total
    const result = autoCalc(makeInvoice({
      work_previous: 0,
      work_current: 0,
      work_total: 500_000,
    }));
    // Should keep the 500K since there's no breakdown to recalculate from
    expect(result.work_total).toBe(500_000);
  });

  it("auto-creates deductions_breakdown from legacy total_deductions", () => {
    const result = autoCalc(makeInvoice({
      work_previous: 100_000,
      work_current: 50_000,
      total_deductions: 8_000,
      deductions_breakdown: [],
    }));
    expect(result.deductions_breakdown).toHaveLength(1);
    expect(result.deductions_breakdown![0].amount).toBe(8_000);
    expect(result.total_deductions).toBe(8_000);
  });
});
