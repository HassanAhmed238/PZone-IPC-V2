import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://dwpdrclupradpnsminvi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDIwNzYsImV4cCI6MjA4ODYxODA3Nn0.yOp2fT_V5q42nHiAp3qP505Ax1MmKKuX2844LVwHrH4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ── 1. Projects ─────────────────────────────────────── */
const PROJECTS = [
  {
    project_code: "25-01",
    project_name: "SOUL West Compound — Infrastructure Phase 1",
    client: "SODIC",
    sector: "Housing",
    project_manager: "Eng. Ahmed Hassan",
    contract_value: 18500000,
    start_date: "2025-01-15",
    end_date: "2026-06-30",
    location: "Sheikh Zayed, Giza",
    description: "Infrastructure works including roads, utilities, and drainage for Phase 1",
    variation_orders: [
      { vo_number: "VO-001", description: "Additional road works - Area C", amount: 1200000, status: "approved" },
      { vo_number: "VO-002", description: "Drainage system extension", amount: 850000, status: "pending" },
    ],
    is_active: true,
  },
  {
    project_code: "25-02",
    project_name: "AAIB HQ Renovation — MEP Works",
    client: "Arab African International Bank",
    sector: "Commercial",
    project_manager: "Eng. Sara Mostafa",
    contract_value: 7200000,
    start_date: "2025-03-01",
    end_date: "2025-12-31",
    location: "Garden City, Cairo",
    description: "Complete MEP renovation of headquarters building",
    variation_orders: [
      { vo_number: "VO-001", description: "Smart building automation system", amount: 600000, status: "approved" },
    ],
    is_active: true,
  },
  {
    project_code: "25-03",
    project_name: "Palm Hills October — Finishing Package B",
    client: "Palm Hills Developments",
    sector: "Housing",
    project_manager: "Eng. Mohamed Kamel",
    contract_value: 24000000,
    start_date: "2025-02-01",
    end_date: "2026-08-31",
    location: "6th of October City",
    description: "Internal finishing works for residential units B1–B6",
    variation_orders: [
      { vo_number: "VO-001", description: "Upgraded flooring specifications", amount: 1800000, status: "approved" },
      { vo_number: "VO-002", description: "Additional units B7-B8", amount: 3200000, status: "approved" },
      { vo_number: "VO-003", description: "Landscaping scope addition", amount: 950000, status: "pending" },
    ],
    is_active: true,
  },
  {
    project_code: "24-08",
    project_name: "Heliopolis Hospital Expansion — Civil Works",
    client: "Cairo Medical Group",
    sector: "Healthcare",
    project_manager: "Eng. Khaled Ibrahim",
    contract_value: 31000000,
    start_date: "2024-08-01",
    end_date: "2026-03-31",
    location: "Heliopolis, Cairo",
    description: "New 4-floor expansion wing with basement parking",
    variation_orders: [
      { vo_number: "VO-001", description: "Structural reinforcement - zone 3", amount: 2100000, status: "approved" },
    ],
    is_active: true,
  },
  {
    project_code: "25-05",
    project_name: "New Admin Capital — Roads Package 7",
    client: "Administrative Capital for Urban Development",
    sector: "Infrastructure",
    project_manager: "Eng. Tarek Nabil",
    contract_value: 55000000,
    start_date: "2025-05-01",
    end_date: "2027-04-30",
    location: "New Administrative Capital",
    description: "Road network and utility corridors for government district sector 7",
    variation_orders: [
      { vo_number: "VO-001", description: "Pedestrian bridges x3", amount: 4200000, status: "approved" },
      { vo_number: "VO-002", description: "Lighting upgrade to LED", amount: 1100000, status: "approved" },
    ],
    is_active: true,
  },
];

/* ── 2. IPC Records ──────────────────────────────────── */
function ipc(base) {
  return {
    invoice_type: "submitted",
    fluctuation_amount: base.fluctuation_amount ?? 0,
    approved_variations: base.approved_variations ?? base.variations ?? [],
    approved_deductions_breakdown: base.approved_deductions_breakdown ?? [],
    approved_tax_type: base.approved_tax_type ?? "none",
    approved_tax_direction: base.approved_tax_direction ?? "added",
    approved_tax_amount: base.approved_tax_amount ?? 0,
    approved_deductions: base.approved_deductions ?? 0,
    approved_net_previous: base.approved_net_previous ?? 0,
    approved_net_current: base.approved_net_current ?? 0,
    collection_date: null,
    linked_submitted_id: null,
    ...base,
  };
}

const IPC_RECORDS = [
  // 25-01 IPC #1 ────────────────────────────────────────
  ipc({
    project_code: "25-01",
    project_name: "SOUL West Compound — Infrastructure Phase 1",
    client: "SODIC",
    sector: "Housing",
    contract_value: 18500000,
    invoice_number: "1",
    submitted_date: "2025-03-15",
    status: "معتمد",
    work_previous: 0,
    work_current: 3200000,
    work_total: 4400000,
    variations: [{ vo_number: "VO-001", description: "Additional road works", amount: 1200000 }],
    deductions_breakdown: [
      { name: "Retention 10%", amount: 440000 },
      { name: "Performance Bond 5%", amount: 220000 },
    ],
    tax_type: "5%",
    tax_direction: "added",
    tax_amount: 220000,
    total_deductions: 660000,
    net_previous: 0,
    net_current: 3300000,
    net_total: 3300000,
    approved_previous: 0,
    approved_current: 2900000,
    approved_total: 4100000,
    approved_deductions_breakdown: [
      { name: "Retention 10%", amount: 410000 },
      { name: "Performance Bond 5%", amount: 205000 },
    ],
    approved_tax_type: "5%",
    approved_tax_direction: "added",
    approved_tax_amount: 205000,
    approved_deductions: 615000,
    approved_net_previous: 0,
    approved_net_current: 3075000,
    approved_net_total: 3075000,
    total_collections: 2500000,
    unbilled: 1200000,
    expected_collection: 3075000,
    contract_percentage: 0.2378,
    approval_date: "2025-04-10",
    approval_notes: "Approved with minor deduction adjustment per site engineer report",
  }),

  // 25-01 IPC #2 ────────────────────────────────────────
  ipc({
    project_code: "25-01",
    project_name: "SOUL West Compound — Infrastructure Phase 1",
    client: "SODIC",
    sector: "Housing",
    contract_value: 18500000,
    invoice_number: "2",
    submitted_date: "2025-06-01",
    status: "تحت الاعتماد",
    work_previous: 3200000,
    work_current: 2800000,
    work_total: 7200000,
    variations: [{ vo_number: "VO-001", description: "Additional road works", amount: 1200000 }],
    deductions_breakdown: [
      { name: "Retention 10%", amount: 720000 },
      { name: "Performance Bond 5%", amount: 360000 },
    ],
    tax_type: "5%",
    tax_direction: "added",
    tax_amount: 360000,
    total_deductions: 1080000,
    net_previous: 3200000,
    net_current: 3080000,
    net_total: 6120000,
    approved_previous: 2900000,
    approved_current: 2500000,
    approved_total: 6600000,
    approved_net_total: 5610000,
    total_collections: 0,
    unbilled: 2400000,
    expected_collection: 5610000,
    contract_percentage: 0.3892,
    approval_notes: "Pending client review",
  }),

  // 25-02 IPC #1 ────────────────────────────────────────
  ipc({
    project_code: "25-02",
    project_name: "AAIB HQ Renovation — MEP Works",
    client: "Arab African International Bank",
    sector: "Commercial",
    contract_value: 7200000,
    invoice_number: "1",
    submitted_date: "2025-05-10",
    status: "معتمد",
    work_previous: 0,
    work_current: 1800000,
    work_total: 2400000,
    variations: [{ vo_number: "VO-001", description: "Smart building automation", amount: 600000 }],
    deductions_breakdown: [
      { name: "Retention 5%", amount: 120000 },
      { name: "Tax Withholding 3%", amount: 72000 },
    ],
    tax_type: "14%",
    tax_direction: "added",
    tax_amount: 336000,
    total_deductions: 192000,
    net_previous: 0,
    net_current: 2136000,
    net_total: 2136000,
    approved_previous: 0,
    approved_current: 1700000,
    approved_total: 2300000,
    approved_deductions_breakdown: [
      { name: "Retention 5%", amount: 115000 },
      { name: "Tax Withholding 3%", amount: 69000 },
    ],
    approved_tax_type: "14%",
    approved_tax_direction: "added",
    approved_tax_amount: 322000,
    approved_deductions: 184000,
    approved_net_previous: 0,
    approved_net_current: 2116000,
    approved_net_total: 2116000,
    total_collections: 2116000,
    unbilled: 0,
    expected_collection: 2116000,
    contract_percentage: 0.3333,
    approval_date: "2025-06-01",
    approval_notes: "Fully approved and collected",
  }),

  // 25-02 IPC #2 ────────────────────────────────────────
  ipc({
    project_code: "25-02",
    project_name: "AAIB HQ Renovation — MEP Works",
    client: "Arab African International Bank",
    sector: "Commercial",
    contract_value: 7200000,
    invoice_number: "2",
    submitted_date: "2025-08-20",
    status: "جارى المراجعه للتقديم",
    work_previous: 1800000,
    work_current: 2100000,
    work_total: 4500000,
    variations: [{ vo_number: "VO-001", description: "Smart building automation", amount: 600000 }],
    deductions_breakdown: [
      { name: "Retention 5%", amount: 225000 },
      { name: "Tax Withholding 3%", amount: 135000 },
    ],
    tax_type: "14%",
    tax_direction: "added",
    tax_amount: 630000,
    total_deductions: 360000,
    net_previous: 1800000,
    net_current: 2100000,
    net_total: 3900000,
    approved_previous: 0,
    approved_current: 0,
    approved_total: 0,
    approved_net_total: 0,
    total_collections: 0,
    unbilled: 2700000,
    expected_collection: 3900000,
    contract_percentage: 0.625,
    approval_notes: "Under review by client technical team",
  }),

  // 25-03 IPC #1 ────────────────────────────────────────
  ipc({
    project_code: "25-03",
    project_name: "Palm Hills October — Finishing Package B",
    client: "Palm Hills Developments",
    sector: "Housing",
    contract_value: 24000000,
    invoice_number: "1",
    submitted_date: "2025-04-01",
    status: "معتمد",
    work_previous: 0,
    work_current: 4200000,
    work_total: 10200000,
    variations: [
      { vo_number: "VO-001", description: "Upgraded flooring", amount: 1800000 },
      { vo_number: "VO-002", description: "Additional units B7-B8", amount: 4200000 },
    ],
    deductions_breakdown: [
      { name: "Retention 10%", amount: 1020000 },
      { name: "Advance Recovery 15%", amount: 1530000 },
    ],
    tax_type: "5.04%",
    tax_direction: "added",
    tax_amount: 514080,
    total_deductions: 2550000,
    net_previous: 0,
    net_current: 7650000,
    net_total: 7650000,
    approved_previous: 0,
    approved_current: 3800000,
    approved_total: 9800000,
    approved_deductions_breakdown: [
      { name: "Retention 10%", amount: 980000 },
      { name: "Advance Recovery 15%", amount: 1470000 },
    ],
    approved_tax_type: "5.04%",
    approved_tax_direction: "added",
    approved_tax_amount: 494192,
    approved_deductions: 2450000,
    approved_net_previous: 0,
    approved_net_current: 7350000,
    approved_net_total: 7350000,
    total_collections: 7350000,
    unbilled: 3000000,
    expected_collection: 7350000,
    contract_percentage: 0.425,
    approval_date: "2025-05-15",
    approval_notes: "Approved. Advance recovery applied as per contract clause 18.",
  }),

  // 25-03 IPC #2 ────────────────────────────────────────
  ipc({
    project_code: "25-03",
    project_name: "Palm Hills October — Finishing Package B",
    client: "Palm Hills Developments",
    sector: "Housing",
    contract_value: 24000000,
    invoice_number: "2",
    submitted_date: "2025-07-15",
    status: "تحت الاعتماد",
    work_previous: 4200000,
    work_current: 3600000,
    work_total: 13800000,
    variations: [
      { vo_number: "VO-001", description: "Upgraded flooring", amount: 1800000 },
      { vo_number: "VO-002", description: "Additional units B7-B8", amount: 4200000 },
    ],
    deductions_breakdown: [
      { name: "Retention 10%", amount: 1380000 },
      { name: "Advance Recovery 15%", amount: 2070000 },
    ],
    tax_type: "5.04%",
    tax_direction: "added",
    tax_amount: 695520,
    total_deductions: 3450000,
    net_previous: 4200000,
    net_current: 3400000,
    net_total: 10350000,
    approved_previous: 3800000,
    approved_current: 3400000,
    approved_total: 13200000,
    approved_deductions_breakdown: [
      { name: "Retention 10%", amount: 1320000 },
      { name: "Advance Recovery 15%", amount: 1980000 },
    ],
    approved_tax_type: "5.04%",
    approved_tax_direction: "added",
    approved_tax_amount: 665280,
    approved_deductions: 3300000,
    approved_net_previous: 3800000,
    approved_net_current: 3200000,
    approved_net_total: 9900000,
    total_collections: 5000000,
    unbilled: 5000000,
    expected_collection: 9900000,
    contract_percentage: 0.575,
    approval_notes: "Submitted pending client approval",
  }),

  // 24-08 IPC #1 ────────────────────────────────────────
  ipc({
    project_code: "24-08",
    project_name: "Heliopolis Hospital Expansion — Civil Works",
    client: "Cairo Medical Group",
    sector: "Healthcare",
    contract_value: 31000000,
    invoice_number: "1",
    submitted_date: "2025-01-10",
    status: "معتمد",
    work_previous: 0,
    work_current: 5500000,
    work_total: 7600000,
    variations: [{ vo_number: "VO-001", description: "Structural reinforcement", amount: 2100000 }],
    deductions_breakdown: [
      { name: "Retention 5%", amount: 380000 },
      { name: "Insurance 2%", amount: 152000 },
      { name: "Advance Recovery 20%", amount: 1520000 },
    ],
    tax_type: "none",
    tax_direction: "added",
    tax_amount: 0,
    total_deductions: 2052000,
    net_previous: 0,
    net_current: 5548000,
    net_total: 5548000,
    approved_previous: 0,
    approved_current: 5200000,
    approved_total: 7300000,
    approved_deductions_breakdown: [
      { name: "Retention 5%", amount: 365000 },
      { name: "Insurance 2%", amount: 146000 },
      { name: "Advance Recovery 20%", amount: 1460000 },
    ],
    approved_tax_type: "none",
    approved_deductions: 1971000,
    approved_net_previous: 0,
    approved_net_current: 5329000,
    approved_net_total: 5329000,
    total_collections: 5329000,
    unbilled: 2400000,
    expected_collection: 5329000,
    contract_percentage: 0.2452,
    approval_date: "2025-02-15",
    approval_notes: "Approved. All inspections passed.",
  }),

  // 24-08 IPC #2 ────────────────────────────────────────
  ipc({
    project_code: "24-08",
    project_name: "Heliopolis Hospital Expansion — Civil Works",
    client: "Cairo Medical Group",
    sector: "Healthcare",
    contract_value: 31000000,
    invoice_number: "2",
    submitted_date: "2025-05-20",
    status: "معتمد",
    work_previous: 5500000,
    work_current: 6200000,
    work_total: 13800000,
    variations: [{ vo_number: "VO-001", description: "Structural reinforcement", amount: 2100000 }],
    deductions_breakdown: [
      { name: "Retention 5%", amount: 690000 },
      { name: "Insurance 2%", amount: 276000 },
      { name: "Advance Recovery 20%", amount: 2760000 },
    ],
    tax_type: "none",
    tax_direction: "added",
    tax_amount: 0,
    total_deductions: 3726000,
    net_previous: 5500000,
    net_current: 4574000,
    net_total: 10074000,
    approved_previous: 5200000,
    approved_current: 5800000,
    approved_total: 13100000,
    approved_deductions_breakdown: [
      { name: "Retention 5%", amount: 655000 },
      { name: "Insurance 2%", amount: 262000 },
      { name: "Advance Recovery 20%", amount: 2620000 },
    ],
    approved_tax_type: "none",
    approved_deductions: 3537000,
    approved_net_previous: 5200000,
    approved_net_current: 4363000,
    approved_net_total: 9563000,
    total_collections: 8000000,
    unbilled: 4200000,
    expected_collection: 9563000,
    contract_percentage: 0.4452,
    approval_date: "2025-06-30",
    approval_notes: "Approved with deduction reconciliation.",
  }),

  // 25-05 IPC #1 ────────────────────────────────────────
  ipc({
    project_code: "25-05",
    project_name: "New Admin Capital — Roads Package 7",
    client: "Administrative Capital for Urban Development",
    sector: "Infrastructure",
    contract_value: 55000000,
    invoice_number: "1",
    submitted_date: "2025-06-01",
    status: "معتمد",
    work_previous: 0,
    work_current: 8500000,
    work_total: 13800000,
    variations: [
      { vo_number: "VO-001", description: "Pedestrian bridges x3", amount: 4200000 },
      { vo_number: "VO-002", description: "LED lighting", amount: 1100000 },
    ],
    deductions_breakdown: [
      { name: "Retention 10%", amount: 1380000 },
      { name: "Performance Bond 5%", amount: 690000 },
      { name: "Advance Recovery 15%", amount: 2070000 },
    ],
    tax_type: "5%",
    tax_direction: "added",
    tax_amount: 690000,
    total_deductions: 4140000,
    net_previous: 0,
    net_current: 9660000,
    net_total: 9660000,
    approved_previous: 0,
    approved_current: 7800000,
    approved_total: 13100000,
    approved_deductions_breakdown: [
      { name: "Retention 10%", amount: 1310000 },
      { name: "Performance Bond 5%", amount: 655000 },
      { name: "Advance Recovery 15%", amount: 1965000 },
    ],
    approved_tax_type: "5%",
    approved_tax_direction: "added",
    approved_tax_amount: 655000,
    approved_deductions: 3930000,
    approved_net_previous: 0,
    approved_net_current: 9170000,
    approved_net_total: 9170000,
    total_collections: 9170000,
    unbilled: 5000000,
    expected_collection: 9170000,
    contract_percentage: 0.2509,
    approval_date: "2025-07-15",
    approval_notes: "Approved. Full payment received.",
  }),

  // 25-05 IPC #2 ────────────────────────────────────────
  ipc({
    project_code: "25-05",
    project_name: "New Admin Capital — Roads Package 7",
    client: "Administrative Capital for Urban Development",
    sector: "Infrastructure",
    contract_value: 55000000,
    invoice_number: "2",
    submitted_date: "2025-10-01",
    status: "تحت الاعتماد",
    work_previous: 8500000,
    work_current: 9200000,
    work_total: 23000000,
    fluctuation_amount: 350000,
    variations: [
      { vo_number: "VO-001", description: "Pedestrian bridges x3", amount: 4200000 },
      { vo_number: "VO-002", description: "LED lighting", amount: 1100000 },
    ],
    deductions_breakdown: [
      { name: "Retention 10%", amount: 2300000 },
      { name: "Performance Bond 5%", amount: 1150000 },
      { name: "Advance Recovery 15%", amount: 3450000 },
    ],
    tax_type: "5%",
    tax_direction: "added",
    tax_amount: 1150000,
    total_deductions: 6900000,
    net_previous: 8500000,
    net_current: 6100000,
    net_total: 15100000,
    approved_previous: 7800000,
    approved_current: 8800000,
    approved_total: 21900000,
    approved_deductions_breakdown: [
      { name: "Retention 10%", amount: 2190000 },
      { name: "Performance Bond 5%", amount: 1095000 },
      { name: "Advance Recovery 15%", amount: 3285000 },
    ],
    approved_tax_type: "5%",
    approved_tax_direction: "added",
    approved_tax_amount: 1095000,
    approved_deductions: 6570000,
    approved_net_previous: 7800000,
    approved_net_current: 6630000,
    approved_net_total: 14430000,
    total_collections: 5000000,
    unbilled: 10000000,
    expected_collection: 14430000,
    contract_percentage: 0.4182,
    approval_notes: "Pending approval — submitted for Q4 cycle",
  }),
];

/* ── Main ─────────────────────────────────────────────── */
async function seed() {
  console.log("🌱  Seeding IPC sample data…\n");

  // 1. Upsert projects
  console.log("📁  Inserting projects…");
  for (const p of PROJECTS) {
    const { error } = await supabase
      .from("ipc_projects")
      .upsert(p, { onConflict: "project_code", ignoreDuplicates: false });
    if (error) console.error(`  ❌  ${p.project_code}: ${error.message}`);
    else console.log(`  ✅  ${p.project_code} — ${p.project_name}`);
  }

  // 2. Load project IDs for FK reference
  const { data: projectRows } = await supabase
    .from("ipc_projects")
    .select("id, project_code")
    .in("project_code", PROJECTS.map((p) => p.project_code));

  const codeToId = Object.fromEntries((projectRows || []).map((r) => [r.project_code, r.id]));

  // 3. Insert IPCs
  console.log("\n📋  Inserting IPC records…");
  let inserted = 0;
  for (const inv of IPC_RECORDS) {
    const row = { ...inv, ipc_project_id: codeToId[inv.project_code] ?? null };
    const { error } = await supabase.from("invoices").insert(row);
    if (error) {
      console.error(`  ❌  ${inv.project_code} #${inv.invoice_number}: ${error.message}`);
    } else {
      inserted++;
      console.log(`  ✅  ${inv.project_code} IPC #${inv.invoice_number} — ${inv.status}`);
    }
  }

  console.log(`\n✨  Done! ${inserted}/${IPC_RECORDS.length} IPC records inserted.`);

  // 4. Quick count
  const { count: pCount } = await supabase.from("ipc_projects").select("*", { count: "exact", head: true });
  const { count: iCount } = await supabase.from("invoices").select("*", { count: "exact", head: true });
  console.log(`\n📊  ipc_projects: ${pCount} rows  |  invoices: ${iCount} rows`);
}

seed().catch(console.error);
