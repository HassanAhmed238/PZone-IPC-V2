import * as XLSX from "xlsx";
import type { Invoice, InvoiceInput } from "@/hooks/useIPC";

/* ─── Excel date conversion ──────────────────────────────── */

export function excelDateToISO(serial: number): string | null {
  if (!serial || typeof serial !== "number" || serial < 1) return null;
  // Excel epoch: Jan 0, 1900 (with the Lotus 1-2-3 leap year bug)
  const epoch = new Date(1899, 11, 30);
  const d = new Date(epoch.getTime() + serial * 86400000);
  return d.toISOString().split("T")[0];
}

function num(v: any): number {
  if (v === "" || v === null || v === undefined || v === "-") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

function str(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/* ─── Get sheet names ────────────────────────────────────── */

export async function getSheetNames(file: File): Promise<string[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  return wb.SheetNames;
}

/* ─── Parse invoices from Excel ──────────────────────────── */

export async function parseInvoicesExcel(
  file: File,
  sheetName?: string
): Promise<Partial<InvoiceInput>[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  // Pick the requested sheet, or the one with the most columns (the full register)
  let ws: XLSX.WorkSheet;
  if (sheetName && wb.Sheets[sheetName]) {
    ws = wb.Sheets[sheetName];
  } else {
    let best = wb.SheetNames[0];
    let bestCols = 0;
    for (const name of wb.SheetNames) {
      const sheet = wb.Sheets[name];
      const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
      if (range.e.c > bestCols) {
        bestCols = range.e.c;
        best = name;
      }
    }
    ws = wb.Sheets[best];
  }

  const data: any[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: true,
  });

  const invoices: Partial<InvoiceInput>[] = [];

  // Data rows start at row 4 (index 4) — rows 0-3 are headers/formulas
  for (let i = 4; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;

    const projectCode = str(row[0]);
    // Skip non-project rows (headers, totals, etc.)
    if (!projectCode.startsWith("PZ-") && !projectCode.match(/^\d+$/)) continue;

    const inv: Partial<InvoiceInput> = {
      project_code: projectCode,
      sector: str(row[1]) || null,
      submitted_date: typeof row[2] === "number" ? excelDateToISO(row[2]) : null,
      project_name: str(row[3]) || projectCode,
      client: str(row[4]) || null,
      contract_value: num(row[5]),
      invoice_number: str(row[6]) || null,

      // Submitted
      work_previous: num(row[7]),
      work_current: num(row[8]),
      work_total: num(row[9]) || num(row[7]) + num(row[8]),
      total_deductions: num(row[10]),
      net_previous: num(row[11]),
      net_current: num(row[12]),
      net_total: num(row[13]) || num(row[11]) + num(row[12]),

      // Approved
      approved_previous: num(row[14]),
      approved_current: num(row[15]),
      approved_total: num(row[16]) || num(row[14]) + num(row[15]),
      approved_deductions: num(row[17]),
      approved_net_previous: num(row[18]),
      approved_net_current: num(row[19]),
      approved_net_total: num(row[20]) || num(row[18]) + num(row[19]),

      // Status
      status: str(row[21]) || "تحت الاعتماد",
      approval_date: typeof row[22] === "number" ? excelDateToISO(row[22]) : null,
      contract_percentage: num(row[24]),

      // Financial
      total_collections: num(row[26]) || num(row[25]),
      unbilled: Math.max(0, num(row[20]) - (num(row[26]) || num(row[25]))),
      expected_collection: num(row[27]),

      // Relations (null — will be linked manually)
      contract_id: null,
      project_id: null,
    };

    invoices.push(inv);
  }

  return invoices;
}

/* ─── Export invoices to Excel ────────────────────────────── */

export function exportInvoicesToExcel(invoices: Invoice[]): void {
  const wb = XLSX.utils.book_new();

  // Header rows
  const headers = [
    // Row 0: Title
    [
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "مستخلص تحت الإعتماد",
      "",
      "",
      "",
      "",
      "",
      "",
      "مستخلص معتمد من العميل",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "Approved Amount",
      "",
      "",
      "",
    ],
    // Row 1: Column headers
    [
      "Project ID",
      "Sector",
      "Submitted Date",
      "Project Name",
      "Client",
      "Total Value",
      "رقم المستخلص",
      "سابق",
      "حالي",
      "إجمالي",
      "اجمالى الاستقطاعات",
      "سابق بعد الاستقطاعات",
      "صافى المستخلص بعد الاستقطاعات",
      "إجمالى المستخلص بعد الاستقطاعات",
      "سابق",
      "حالي",
      "إجمالي",
      "اجمالى الاستقطاعات",
      "سابق بعد الاستقطاعات",
      "صافى المستخلص بعد الاستقطاعات",
      "إجمالى المستخلص بعد الاستقطاعات",
      "حالة المستخلص",
      "تاريخ الاعتماد",
      "النسبه من العقد",
      "اجمالى التحصيلات",
      "",
      "غير مفوتر",
      "المتوقع تحصيلة",
    ],
  ];

  const dataRows = invoices.map((inv) => [
    inv.project_code,
    inv.sector || "",
    inv.submitted_date || "",
    inv.project_name,
    inv.client || "",
    inv.contract_value,
    inv.invoice_number || "",
    inv.work_previous,
    inv.work_current,
    inv.work_total,
    inv.total_deductions,
    inv.net_previous,
    inv.net_current,
    inv.net_total,
    inv.approved_previous,
    inv.approved_current,
    inv.approved_total,
    inv.approved_deductions,
    inv.approved_net_previous,
    inv.approved_net_current,
    inv.approved_net_total,
    inv.status,
    inv.approval_date || "",
    inv.contract_percentage,
    inv.total_collections,
    "",
    inv.unbilled,
    inv.expected_collection,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([...headers, ...dataRows]);

  // Column widths
  ws["!cols"] = [
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 50 },
    { wch: 16 },
    { wch: 16 },
    { wch: 10 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 4 },
    { wch: 16 },
    { wch: 16 },
  ];

  // Merge header cells
  ws["!merges"] = [
    { s: { r: 0, c: 7 }, e: { r: 0, c: 13 } },
    { s: { r: 0, c: 14 }, e: { r: 0, c: 20 } },
    { s: { r: 0, c: 24 }, e: { r: 0, c: 27 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "PZone Invoices");
  XLSX.writeFile(wb, `PZone_Invoices_Export_${new Date().toISOString().split("T")[0]}.xlsx`);
}
