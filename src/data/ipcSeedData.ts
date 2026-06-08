/**
 * Real IPC seed data — P.ZONE INVOICES April 2026
 * Updated with latest Excel export from PZone management.
 *
 * Source: "P.ZONE INVOICES -Apr 2026" spreadsheet
 */

import type { InvoiceInput, DeductionItem } from "@/hooks/useIPC";
import type { IPCProjectInput } from "@/hooks/useIPCProjects";

/* ─── Projects ─────────────────────────────────────────── */

export const SEED_PROJECTS: IPCProjectInput[] = [
  {
    project_code: "24-01",
    project_name: "SOUL Project - Parcel 1&2",
    client: "HAC",
    sector: "North Coast",
    project_manager: null,
    contract_value: 300000000,
    start_date: "2024-06-01",
    end_date: null,
    location: "North Coast",
    description: "SOUL Project Parcel 1&2 - Swimming Pools & Infrastructure",
    variation_orders: [],
    is_active: true,
  },
  {
    project_code: "24-02",
    project_name: "SOUL Project - Parcel 3&4",
    client: "Orascom",
    sector: "North Coast",
    project_manager: null,
    contract_value: 316575156.03,
    start_date: "2024-06-01",
    end_date: null,
    location: "North Coast",
    description: "SOUL Project Parcel 3&4 - Swimming Pools & Infrastructure",
    variation_orders: [],
    is_active: true,
  },
  {
    project_code: "24-03",
    project_name: "SOUL Project - Phase 1C",
    client: "Redcon",
    sector: "North Coast",
    project_manager: null,
    contract_value: 112692555.08,
    start_date: "2024-06-01",
    end_date: null,
    location: "North Coast",
    description: "SOUL Project Phase 1C",
    variation_orders: [],
    is_active: true,
  },
  {
    project_code: "25-11",
    project_name: "رأس الحكمة - عدد 6 حمام سباحة و 2 نافورة - الساحل",
    client: "Orascom",
    sector: "North Coast",
    project_manager: null,
    contract_value: 2669670.79,
    start_date: "2025-02-01",
    end_date: null,
    location: "North Coast",
    description: "Ras El Hekma - 6 Swimming Pools & 2 Fountains",
    variation_orders: [],
    is_active: true,
  },
  {
    project_code: "24-12",
    project_name: "سيلفر ساند - 8 حمامات سباحة - اوراسكوم - الساحل",
    client: "Orascom",
    sector: "North Coast",
    project_manager: null,
    contract_value: 46664622,
    start_date: "2024-09-01",
    end_date: null,
    location: "North Coast",
    description: "Silver Sand - 8 Swimming Pools",
    variation_orders: [],
    is_active: true,
  },
  {
    project_code: "24-13",
    project_name: "ساراي كافانا - بحيرة - مدينة مصر - طريق السويس",
    client: "مدينة مصر",
    sector: "Cairo",
    project_manager: null,
    contract_value: 81132855.58,
    start_date: "2024-08-01",
    end_date: null,
    location: "Cairo - Suez Road",
    description: "Sarai Cavana Lake",
    variation_orders: [],
    is_active: true,
  },
  {
    project_code: "24-14",
    project_name: "اي سيتي - حمامات سباحة - كيرف - الاوسطي",
    client: "DMC",
    sector: "Cairo",
    project_manager: null,
    contract_value: 39435242,
    start_date: "2024-09-01",
    end_date: null,
    location: "Cairo",
    description: "I City Swimming Pools - Curve - Middle",
    variation_orders: [],
    is_active: true,
  },
  {
    project_code: "24-18",
    project_name: "فيلا(73) سوان ليك - حمام سباحة - زد سى سى - التجمع الأول",
    client: "زد سى سى",
    sector: "Cairo",
    project_manager: null,
    contract_value: 4729456,
    start_date: "2024-11-01",
    end_date: null,
    location: "Cairo - 1st Settlement",
    description: "Villa(73) Swan Lake Swimming Pool",
    variation_orders: [],
    is_active: true,
  },
  {
    project_code: "23-25",
    project_name: "بلوم فيلدز 17 نافورة - المستقبل سيتي - تطوير مصر",
    client: "Tatweer",
    sector: "Cairo",
    project_manager: null,
    contract_value: 21415795,
    start_date: "2023-09-01",
    end_date: null,
    location: "Cairo - Mostakbal City",
    description: "Bloom Fields 17 Fountains - Mostakbal City - Tatweer Misr",
    variation_orders: [],
    is_active: true,
  },
];


/* ─── IPC Invoices — April 2026 latest ─────────────────── */

function mkDeductions(items: { name: string; amount: number }[]): DeductionItem[] {
  return items.filter((d) => d.amount > 0);
}

const BASE: Omit<InvoiceInput,
  "project_code" | "project_name" | "contract_value" | "invoice_number" |
  "status" | "work_previous" | "work_current" | "work_total" |
  "deductions_breakdown" | "total_deductions" | "net_total" |
  "net_previous" | "net_current" | "total_collections" | "contract_percentage"
> = {
  client: null,
  sector: null,
  submitted_date: null,
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
  tax_direction: "withheld",
  approved_tax_type: "none",
  approved_tax_amount: 0,
  approved_tax_direction: "withheld",
  invoice_type: "submitted",
  linked_submitted_id: null,
  approval_date: null,
  collection_date: null,
  approval_notes: null,
  unbilled: 0,
  expected_collection: 0,
  contract_id: null,
  project_id: null,
  ipc_project_id: null,
  share_token: null,
};

export const SEED_IPCS: InvoiceInput[] = [
  // ── PZ-001: 24-01 SOUL Parcel 1&2 — IPC #10 ──
  {
    ...BASE,
    project_code: "24-01",
    project_name: "24-01 - SOUL Project - Parcel 1&2",
    client: "HAC",
    sector: "North Coast",
    invoice_number: "10",
    status: "تحت الاعتماد",
    submitted_date: "2026-04-28",
    contract_value: 300000000,
    work_previous: 164265095.20,
    work_current: 14218881.42,
    work_total: 178483976.62,
    deductions_breakdown: mkDeductions([
      { name: "Advance Payment Recovery (10%)", amount: 17657775.48 },
      { name: "Material supplied by OC recovery (15%)", amount: 23875525.92 },
      { name: "Bid bond to be returned after the preliminary handover (5%)", amount: 8282670.72 },
      { name: "Retention (5%)", amount: 8282670.72 },
      { name: "Irregular employment (0.45%)", amount: 745440.37 },
      { name: "Social Insurance (2.74)", amount: 4538903.56 },
      { name: "Machinery Deduction", amount: 503567.06 },
      { name: "HSE Deduction", amount: 122630.00 },
      { name: "Site Deduction", amount: 1376312.55 },
      { name: "Medical Deduction", amount: 14100.00 },
      { name: "Material deduction (Block works)", amount: 269051.33 },
    ]),
    total_deductions: 104498648.83,
    net_previous: 65474130.91,
    net_current: 8511196.88,
    net_total: 73985327.79,
    total_collections: 6228297.50,
    contract_percentage: 0.59,
  },

  // ── PZ-002: 24-02 SOUL Parcel 3&4 — IPC #10 ──
  {
    ...BASE,
    project_code: "24-02",
    project_name: "24-02 - SOUL Project - Parcel 3&4",
    client: "Orascom",
    sector: "North Coast",
    invoice_number: "10",
    status: "تحت الاعتماد",
    submitted_date: "2026-04-29",
    contract_value: 316575156.03,
    work_previous: 155801429.60,
    work_current: 12968768.42,
    work_total: 168770198.02,
    deductions_breakdown: mkDeductions([
      { name: "استقطاعات تعاقدية", amount: 61399641.62 },
    ]),
    total_deductions: 61399641.62,
    net_previous: 97202058.06,
    net_current: 10168498.34,
    net_total: 107370556.40,
    total_collections: 0,
    contract_percentage: 0.53,
  },

  // ── PZ-003: 24-03 SOUL Phase 1C — IPC #7 ──
  {
    ...BASE,
    project_code: "24-03",
    project_name: "24-03 - SOUL Project - Phase 1C",
    client: "Redcon",
    sector: "North Coast",
    invoice_number: "7",
    status: "تحت الاعتماد",
    submitted_date: "2026-04-29",
    contract_value: 112692555.08,
    work_previous: 54631358.53,
    work_current: 33523943.71,
    work_total: 88155302.24,
    deductions_breakdown: mkDeductions([
      { name: "استقطاعات تعاقدية", amount: 31656134.52 },
    ]),
    total_deductions: 31656134.52,
    net_previous: 32269728.10,
    net_current: 24229439.61,
    net_total: 56499167.72,
    total_collections: 4620190.35,
    contract_percentage: 0.78,
  },

  // ── PZ-004: 25-11 رأس الحكمة — IPC #4 ──
  {
    ...BASE,
    project_code: "25-11",
    project_name: "25-11- رأس الحكمة - عدد 6 حمام سباحة و 2 نافورة - الساحل",
    client: "Orascom",
    sector: "North Coast",
    invoice_number: "4",
    status: "تحت الاعتماد",
    submitted_date: "2026-04-28",
    contract_value: 2669670.79,
    work_previous: 1433955.01,
    work_current: 370332.10,
    work_total: 1804287.11,
    deductions_breakdown: mkDeductions([
      { name: "استقطاعات تعاقدية", amount: 632032.38 },
    ]),
    total_deductions: 632032.38,
    net_previous: 891743.03,
    net_current: 280511.70,
    net_total: 1172254.73,
    total_collections: 0,
    contract_percentage: 0.68,
  },

  // ── PZ-012: 24-12 سيلفر ساند — IPC #7 ──
  {
    ...BASE,
    project_code: "24-12",
    project_name: "24-12 - سيلفر ساند - 8 حمامات سباحة - اوراسكوم - الساحل",
    client: "Orascom",
    sector: "North Coast",
    invoice_number: "7",
    status: "تحت الاعتماد",
    submitted_date: "2026-04-30",
    contract_value: 46664622,
    work_previous: 39407626.57,
    work_current: 5404309.55,
    work_total: 44811936.12,
    deductions_breakdown: mkDeductions([
      { name: "استقطاعات تعاقدية", amount: 20934717.95 },
    ]),
    total_deductions: 20934717.95,
    net_previous: 19747992.35,
    net_current: 4129225.82,
    net_total: 23877218.17,
    total_collections: 0,
    contract_percentage: 0.96,
  },

  // ── PZ-015: 24-13 ساراي كافانا — IPC #7 (APPROVED) ──
  {
    ...BASE,
    project_code: "24-13",
    project_name: "24-13 - ساراي كافانا - بحيرة - مدينة مصر - طريق السويس",
    client: "مدينة مصر",
    sector: "Cairo",
    invoice_number: "7",
    status: "معتمد",
    submitted_date: "2026-04-14",
    contract_value: 81132855.58,
    // Submitted
    work_previous: 68130330.82,
    work_current: 2794260.28,
    work_total: 70924591.10,
    deductions_breakdown: mkDeductions([
      { name: "استقطاعات", amount: 1778246.84 },
    ]),
    total_deductions: 1778246.84,
    net_previous: 68130330.82,
    net_current: 1016013.44,
    net_total: 69146344.26,
    // Approved
    approved_previous: 67919202.24,
    approved_current: 2794260.89,
    approved_total: 70713463.13,
    approved_deductions: 1778246.84,
    approved_deductions_breakdown: mkDeductions([
      { name: "استقطاعات", amount: 1778246.84 },
    ]),
    approved_net_previous: 67919202.84,
    approved_net_current: 1016013.45,
    approved_net_total: 68935216.29,
    total_collections: 2660186.86,
    contract_percentage: 0.87,
  },

  // ── PZ-021: 24-14 اي سيتي — IPC #10 (APPROVED) ──
  {
    ...BASE,
    project_code: "24-14",
    project_name: "24-14 - اي سيتي - حمامات سباحة - كيرف - الاوسطي",
    client: "DMC",
    sector: "Cairo",
    invoice_number: "10",
    status: "معتمد",
    submitted_date: "2026-04-15",
    approval_date: "2026-05-01",
    contract_value: 39435242,
    // Submitted (no deductions)
    work_previous: 27321070.94,
    work_current: 500629.50,
    work_total: 27821700.44,
    deductions_breakdown: [],
    total_deductions: 0,
    net_previous: 27321070.94,
    net_current: 500629.50,
    net_total: 27821700.44,
    // Approved (same as submitted)
    approved_previous: 27321070.94,
    approved_current: 500629.50,
    approved_total: 27821700.44,
    approved_deductions: 0,
    approved_deductions_breakdown: [],
    approved_net_previous: 27321070.94,
    approved_net_current: 500629.50,
    approved_net_total: 27821700.44,
    total_collections: 397703.65,
    contract_percentage: 0.71,
  },

  // ── PZ-022: 24-18 فيلا سوان ليك — ختامى (FINAL) ──
  {
    ...BASE,
    project_code: "24-18",
    project_name: "24-18 - فيلا(73) سوان ليك - حمام سباحة - زد سى سى - التجمع الأول",
    client: "زد سى سى",
    sector: "Cairo",
    invoice_number: "ختامى",
    status: "تحت الاعتماد",
    invoice_type: "final",
    submitted_date: "2026-04-06",
    contract_value: 4729456,
    work_previous: 4920353.37,
    work_current: 412185.22,
    work_total: 5332538.59,
    deductions_breakdown: mkDeductions([
      { name: "استقطاعات", amount: 1000000.00 },
    ]),
    total_deductions: 1000000.00,
    net_previous: 3920353.37,
    net_current: 412185.22,
    net_total: 4332538.59,
    total_collections: 0,
    contract_percentage: 1.13,
  },

  // ── PZ-023: 23-25 بلوم فيلدز — IPC #11 rev 01 ──
  {
    ...BASE,
    project_code: "23-25",
    project_name: "23-25 - بلوم فيلدز 17 نافورة - المستقبل سيتي - تطوير مصر",
    client: "Tatweer",
    sector: "Cairo",
    invoice_number: "11 rev 01",
    status: "تحت الاعتماد",
    submitted_date: "2026-04-19",
    contract_value: 21415795,
    work_previous: 18016098.01,
    work_current: 586330.50,
    work_total: 18602428.51,
    deductions_breakdown: [],
    total_deductions: 0,
    net_previous: 18016098.01,
    net_current: 586330.50,
    net_total: 18602428.51,
    total_collections: 0,
    contract_percentage: 0.87,
  },
];


/* ─── IPC Lifecycle / Cycle Shape ───────────────────────── */

/**
 * The IPC Lifecycle at PZone follows this cycle:
 *
 *   1. PREPARATION  → Engineer prepares work measurement & quantities
 *   2. SUBMISSION   → IPC submitted to client with cut-off date
 *   3. REVIEW       → Client/consultant reviews (25-38 days per contract)
 *   4. APPROVAL     → Approved value determined (may differ from submitted)
 *   5. COLLECTION   → Payment collected (may take additional time)
 *   6. RECONCILE    → Collections matched against approved value
 *
 * Statuses:
 *   - تحت الاعتماد (Under Review)
 *   - معتمد (Approved)
 *   - ختامى (Final/Closed)
 *
 * Each project tracks: Contract Value + VOs → Authorized Total
 * Each IPC tracks: Previous + Current = Cumulative Gross → Less Deductions = Net
 */
export const IPC_LIFECYCLE = {
  stages: [
    { id: "preparation", label: "Preparation / التحضير", color: "#64748b", icon: "FileText" },
    { id: "submitted", label: "Submitted / المقدم", color: "#3b82f6", icon: "Send" },
    { id: "under_review", label: "Under Review / تحت الاعتماد", color: "#f59e0b", icon: "Clock" },
    { id: "approved", label: "Approved / معتمد", color: "#22c55e", icon: "CheckCircle" },
    { id: "collection", label: "Collection / التحصيل", color: "#a855f7", icon: "Banknote" },
    { id: "closed", label: "Closed / ختامى", color: "#06b6d4", icon: "Archive" },
  ],
  statusMap: {
    "تحت الاعتماد": "under_review",
    "معتمد": "approved",
    "ختامى": "closed",
  },
} as const;
