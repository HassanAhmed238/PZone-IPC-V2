import pkg from 'xlsx';
const { readFile, utils } = pkg;
import { writeFileSync, readFileSync } from 'fs';

// Read the extracted JSON
const rows = JSON.parse(readFileSync('scripts/seed_data_apr_jun_2026.json', 'utf-8'));

// Generate TypeScript file
let ts = `/**
 * Real IPC seed data – P.ZONE INVOICES April → June 2026.
 * Auto-generated from "Pzone Invoices 2026 (1).xlsx" on ${new Date().toISOString().slice(0,10)}.
 * Covers 34 projects with latest invoice snapshot across Apr/May/Jun 2026.
 */
import type { InvoiceInput } from "@/hooks/useIPC";
import type { IPCProjectInput } from "@/hooks/useIPCProjects";

type Row = {
  code: string;
  sector: string | null;
  submitted: string | null;
  name: string;
  client: string | null;
  contract: number;
  inv: string | null;
  prev: number;
  curr: number;
  total: number;
  ded: number;
  netPrev: number;
  netCurr: number;
  netTotal: number;
  appPrev: number;
  appCurr: number;
  appTotal: number;
  appDed: number;
  appNetPrev: number;
  appNetCurr: number;
  appNetTotal: number;
  status: string;
  approval: string | null;
  projectStatus: string | null;
  pct: number;
  collections: number;
  expected: number;
};

const rows: Row[] = [\n`;

for (const r of rows) {
  const submitted = r.submitted ? `"${r.submitted}"` : 'null';
  const inv = r.inv ? `"${r.inv.replace(/"/g, '\\"')}"` : 'null';
  const client = r.client ? `"${r.client.replace(/"/g, '\\"')}"` : 'null';
  const sector = r.sector ? `"${r.sector}"` : 'null';
  const approval = r.approval ? `"${r.approval}"` : 'null';
  const projectStatus = r.projectStatus ? `"${r.projectStatus}"` : 'null';
  const name = r.name.replace(/"/g, '\\"');
  const status = r.status.replace(/"/g, '\\"');
  
  ts += `  { code: "${r.code}", sector: ${sector}, submitted: ${submitted}, name: "${name}", client: ${client}, contract: ${r.contract}, inv: ${inv}, prev: ${r.prev}, curr: ${r.curr}, total: ${r.total}, ded: ${r.ded}, netPrev: ${r.netPrev}, netCurr: ${r.netCurr}, netTotal: ${r.netTotal}, appPrev: ${r.appPrev}, appCurr: ${r.appCurr}, appTotal: ${r.appTotal}, appDed: ${r.appDed}, appNetPrev: ${r.appNetPrev}, appNetCurr: ${r.appNetCurr}, appNetTotal: ${r.appNetTotal}, status: "${status}", approval: ${approval}, projectStatus: ${projectStatus}, pct: ${r.pct}, collections: ${r.collections}, expected: ${r.expected} },\n`;
}

ts += `];

export const SEED_PROJECTS: IPCProjectInput[] = rows.map((r) => ({
  project_code: r.code,
  project_name: r.name,
  client: r.client,
  sector: r.sector,
  project_manager: null,
  contract_value: r.contract,
  start_date: null,
  end_date: null,
  location: r.sector,
  description: "P.ZONE INVOICES – Apr-Jun 2026 import",
  variation_orders: [],
  is_active: r.projectStatus !== "منتهي",
}));

export const SEED_IPCS: InvoiceInput[] = rows
  .filter((r) => r.inv || r.total > 0)
  .map((r) => ({
    project_code: r.code,
    sector: r.sector,
    submitted_date: r.submitted,
    project_name: r.name,
    client: r.client,
    contract_value: r.contract,
    invoice_number: r.inv,
    work_previous: r.prev,
    work_current: r.curr,
    work_total: r.total,
    total_deductions: r.ded,
    net_previous: r.netPrev,
    net_current: r.netCurr,
    net_total: r.netTotal,
    deductions_breakdown: r.ded > 0 ? [{ name: "إجمالى الاستقطاعات", amount: r.ded }] : [],
    variations: [],
    fluctuation_amount: 0,
    approved_previous: r.appPrev,
    approved_current: r.appCurr,
    approved_total: r.appTotal,
    approved_deductions: r.appDed,
    approved_net_previous: r.appNetPrev,
    approved_net_current: r.appNetCurr,
    approved_net_total: r.appNetTotal,
    approved_deductions_breakdown: r.appDed > 0 ? [{ name: "اجمالى الاستقطاعات المعتمدة", amount: r.appDed }] : [],
    approved_variations: [],
    approved_fluctuation_amount: 0,
    tax_type: "none",
    tax_amount: 0,
    tax_direction: "withheld",
    approved_tax_type: "none",
    approved_tax_amount: 0,
    approved_tax_direction: "withheld",
    status: r.status,
    invoice_type: r.inv?.includes("ختامي") || r.inv?.toLowerCase().includes("final") ? "final" : "submitted",
    linked_submitted_id: null,
    approval_date: r.approval,
    collection_date: null,
    approval_notes: [
      "P.ZONE INVOICES – Apr-Jun 2026 import",
      r.projectStatus ? \`Project status: \${r.projectStatus}\` : null,
    ].filter(Boolean).join(" | "),
    contract_percentage: r.pct,
    total_collections: r.collections,
    unbilled: Math.max(r.contract - r.total, 0),
    expected_collection: r.expected,
    contract_id: null,
    project_id: null,
    ipc_project_id: null,
    share_token: null,
  }));
`;

writeFileSync('src/data/ipcAprJun2026SeedData.ts', ts);
console.log(`Generated src/data/ipcAprJun2026SeedData.ts with ${rows.length} projects`);
