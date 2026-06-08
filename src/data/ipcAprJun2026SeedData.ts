/**
 * Real IPC seed data – P.ZONE INVOICES April → June 2026.
 * Auto-generated from "Pzone Invoices 2026 (1).xlsx" on 2026-06-05.
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

const rows: Row[] = [
  { code: "PZ-001", sector: "North Coast", submitted: "2026-06-02", name: "24-01 - SOUL Project -  Parcel 1&2", client: "HAC", contract: 300000000, inv: "10 Rev 01", prev: 164265095.2, curr: 25310856.24, total: 189575951.44, ded: 107194503.2, netPrev: 0, netCurr: 82381448.26, netTotal: 82381448.26, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "تحت الاعتماد", approval: null, projectStatus: "يعمل", pct: 0.63, collections: 6228297.5, expected: 0 },
  { code: "PZ-002", sector: "North Coast", submitted: "2026-05-25", name: "24-02 - SOUL Project -  Parcel 3&4", client: "Orascom", contract: 316575156.03, inv: "11", prev: 165653414.5, curr: 7555590.34, total: 173209004.8, ded: 63288289.6, netPrev: 0, netCurr: 109920715.2, netTotal: 109920715.2, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "تحت الاعتماد", approval: "2026-05-25", projectStatus: "يعمل", pct: 0.55, collections: 0, expected: 0 },
  { code: "PZ-003", sector: "North Coast", submitted: "2026-05-14", name: "24-03 - SOUL Project - Phase 1C", client: "Redcon", contract: 112692555.08, inv: "7", prev: 54631358.53, curr: 13600772.44, total: 68232130.97, ded: 29558260.65, netPrev: 30479404.84, netCurr: 8194465.48, netTotal: 38673870.32, appPrev: 54631358.53, appCurr: 7945331.74, appTotal: 62576690.27, appDed: 28724013.26, appNetPrev: 30479404.84, appNetCurr: 3373272.17, appNetTotal: 33852677.01, status: "معتمد", approval: "2026-05-25", projectStatus: "يعمل", pct: 0.61, collections: 4620190.35, expected: 0 },
  { code: "PZ-004", sector: "North Coast", submitted: "2026-04-28", name: "25-11- رأس الحكمة - عدد 6 حمام سباحة و 2 نافورة -  الساحل", client: "Orascom", contract: 2669670.79, inv: "4", prev: 1619722, curr: 0, total: 1619722, ded: 0, netPrev: 0, netCurr: 1619722, netTotal: 1619722, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "تحت الاعتماد", approval: null, projectStatus: "يعمل", pct: 0.61, collections: 0, expected: 0 },
  { code: "PZ-005", sector: "North Coast", submitted: "2026-05-25", name: "رملة - 41 حمام سباحة - مراكز العقارية - الساحل - 19-24", client: "Marakz", contract: 45518212.54, inv: "6", prev: 22096787.85, curr: 13779494.87, total: 35876282.72, ded: 18300046.49, netPrev: 8903281.32, netCurr: 8672954.91, netTotal: 17576236.23, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "تحت الاعتماد", approval: null, projectStatus: "يعمل", pct: 0.56, collections: 3114958.5, expected: 0 },
  { code: "PZ-006", sector: "North Coast", submitted: null, name: "25-06 - بحيرات العلمين - أبراج الداون تاون - الشركة الصينية -الساحل", client: "CSCEC", contract: 133250234, inv: "7", prev: 19732352.68, curr: 4115200, total: 23847552.68, ded: 6937432.93, netPrev: 5836616.93, netCurr: 11073502.82, netTotal: 16910119.75, appPrev: 19732352.68, appCurr: 4115200, appTotal: 23847552.68, appDed: 6937432.93, appNetPrev: 5836616.93, appNetCurr: 11073502.82, appNetTotal: 16910119.75, status: "معتمد", approval: "2026-05-26", projectStatus: "يعمل", pct: 0.18, collections: 645188, expected: 0 },
  { code: "PZ-007", sector: "North Coast", submitted: null, name: "R8 - حمام سباحة 20 - HAC - الساحل - 24-21", client: "HAC", contract: 70022926, inv: null, prev: 0, curr: 0, total: 0, ded: 0, netPrev: 0, netCurr: 0, netTotal: 0, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "لا يوجد مستخلص", approval: null, projectStatus: null, pct: 0, collections: 0, expected: 0 },
  { code: "PZ-008", sector: "North Coast", submitted: null, name: "kids & Adult Pool - R8 - أوراسكوم - الساحل - 01-25", client: "Orascom", contract: 36683721.34, inv: null, prev: 0, curr: 0, total: 0, ded: 0, netPrev: 0, netCurr: 0, netTotal: 0, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "لا يوجد مستخلص", approval: null, projectStatus: null, pct: 0, collections: 3747111.03, expected: 0 },
  { code: "PZ-009", sector: "North Coast", submitted: null, name: "زويا (PH 01 PART 3) - بحيرة - LMD - الساحل - 12-25", client: "LMD", contract: 59851495, inv: "1", prev: 24618826, curr: 0, total: 24618826, ded: 16002236.9, netPrev: 8616589.1, netCurr: 0, netTotal: 8616589.1, appPrev: 24618826, appCurr: 0, appTotal: 24618826, appDed: 16002236.9, appNetPrev: 8616589.1, appNetCurr: 0, appNetTotal: 8616589.1, status: "تحت الاعتماد", approval: null, projectStatus: "يعمل", pct: 0.41, collections: 0, expected: 0 },
  { code: "PZ-010", sector: "North Coast", submitted: null, name: "25-08-- عدد 23 حمام سباحة و 3 نوافير - ووترواى - الساحل ( Court Yard )", client: "Waterway", contract: 10014372.18, inv: null, prev: 0, curr: 0, total: 0, ded: 0, netPrev: 0, netCurr: 0, netTotal: 0, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "لا يوجد مستخلص", approval: null, projectStatus: "منتهي", pct: 0, collections: 3417266.03, expected: 0 },
  { code: "PZ-011", sector: "North Coast", submitted: null, name: "25-08-- عدد 23 حمام سباحة و 3 نوافير - ووترواى - الساحل ( My Otel )", client: "Waterway", contract: 7947309.5, inv: null, prev: 0, curr: 0, total: 0, ded: 0, netPrev: 0, netCurr: 0, netTotal: 0, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "لا يوجد مستخلص", approval: null, projectStatus: "منتهي", pct: 0, collections: 324982, expected: 0 },
  { code: "PZ-012", sector: "North Coast", submitted: "2026-04-30", name: "24-12 - سيلفر ساند - 8 حمامات سباحة - اوراسكوم - الساحل", client: "Orascom", contract: 46664622, inv: "7 ختامي", prev: 41871447.35, curr: 0, total: 41871447.35, ded: 20416570.79, netPrev: 21454876.56, netCurr: 0, netTotal: 21454876.56, appPrev: 41871447.35, appCurr: 0, appTotal: 41871447.35, appDed: 20416570.79, appNetPrev: 21454876.56, appNetCurr: 0, appNetTotal: 21454876.56, status: "معتمد", approval: "2026-06-03", projectStatus: "منتهي", pct: 0.9, collections: 0, expected: 0 },
  { code: "PZ-013", sector: "North Coast", submitted: null, name: "منتجع تيا باى - حمام أمواج وشلال وجاكوزى - امباير كيه - الساحل - 02-25", client: "امباير كيه", contract: 15266551.23, inv: null, prev: 0, curr: 0, total: 0, ded: 0, netPrev: 0, netCurr: 0, netTotal: 0, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "لا يوجد مستخلص", approval: null, projectStatus: null, pct: 0, collections: 0, expected: 0 },
  { code: "PZ-014", sector: "North Coast", submitted: null, name: "فيلا زويا م/ عمرو سلطان - حمام سباحة - الساحل - 10-25", client: "LMD", contract: 5457365, inv: null, prev: 0, curr: 0, total: 0, ded: 0, netPrev: 0, netCurr: 0, netTotal: 0, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "لا يوجد مستخلص", approval: null, projectStatus: null, pct: 0, collections: 0, expected: 0 },
  { code: "PZ-015", sector: "Cairo", submitted: "2026-05-10", name: "24-13 - ساراي كافانا - بحيرة - مدينة مصر - طريق السويس", client: "مدينة مصر", contract: 81132855.58, inv: "8", prev: 0, curr: 0, total: 0, ded: 0, netPrev: 0, netCurr: 0, netTotal: 0, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "تحت الاعتماد", approval: "2026-05-13", projectStatus: null, pct: 0.9, collections: 2660186.86, expected: 0 },
  { code: "PZ-016", sector: "Cairo", submitted: "2026-06-07", name: "22-72 - Water way - A6", client: "Waterway", contract: 19217656.5, inv: "11", prev: 15889578.84, curr: 2189737.24, total: 18079316.08, ded: 10391208.53, netPrev: 6584889.6, netCurr: 1103217.95, netTotal: 7688107.55, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "تحت الاعتماد", approval: null, projectStatus: "يعمل", pct: 0.94, collections: 0, expected: 0 },
  { code: "PZ-017", sector: "Cairo", submitted: "2026-06-07", name: "Waterway WBR1 (6A) - Swimming pool", client: "Waterway", contract: 1567875.75, inv: "7", prev: 1313590.85, curr: 62352.79, total: 1375943.64, ded: 524957.46, netPrev: 812422.57, netCurr: 38563.61, netTotal: 850986.18, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "تحت الاعتماد", approval: null, projectStatus: "يعمل", pct: 0.88, collections: 261765.5, expected: 0 },
  { code: "PZ-018", sector: "Cairo", submitted: null, name: "23-08 - حمامات سباحة الابراج الصينية - الشركة الصينية", client: "CSCEC", contract: 1007758.75, inv: null, prev: 0, curr: 0, total: 0, ded: 0, netPrev: 0, netCurr: 0, netTotal: 0, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "لا يوجد مستخلص", approval: null, projectStatus: null, pct: 0, collections: 0, expected: 0 },
  { code: "PZ-019", sector: "Cairo", submitted: null, name: "25-04 -1 سوان ليك - تجديد بحيرات - حسن علام - أكتوبر (40%)", client: "ابناء مصر", contract: 4950472, inv: "2", prev: 0, curr: 0, total: 0, ded: 0, netPrev: 0, netCurr: 0, netTotal: 0, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "تحت الاعتماد", approval: null, projectStatus: null, pct: 0, collections: 0, expected: 0 },
  { code: "PZ-020", sector: "Cairo", submitted: null, name: "25-04 -1 سوان ليك - تجديد بحيرات - حسن علام - أكتوبر (60%)", client: "سيتى للتنمية", contract: 9708128.14, inv: null, prev: 0, curr: 0, total: 0, ded: 0, netPrev: 0, netCurr: 0, netTotal: 0, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "لا يوجد مستخلص", approval: null, projectStatus: null, pct: 0, collections: 0, expected: 0 },
  { code: "PZ-021", sector: "Cairo", submitted: "2026-04-15", name: "24-14 - اي سيتي - حمامات سباحة - كيرف - الاوسطي", client: "DMC", contract: 39435242, inv: "10", prev: 27821700.44, curr: 0, total: 27821700.44, ded: 0, netPrev: 27321070.94, netCurr: 500629.5, netTotal: 27821700.44, appPrev: 27821700.44, appCurr: 0, appTotal: 27821700.44, appDed: 0, appNetPrev: 27821700.44, appNetCurr: 0, appNetTotal: 27821700.44, status: "معتمد", approval: "2026-05-01", projectStatus: "يعمل", pct: 0.71, collections: 397703.65, expected: 0 },
  { code: "PZ-022", sector: "Cairo", submitted: "2026-04-05", name: "24-18 - فيلا(73) سوان ليك  - حمام سباحة - زد سى سى - التجمع الأول", client: "زد سى سى", contract: 4729456, inv: "ختامي", prev: 4920353.37, curr: 412185.22, total: 5332538.59, ded: 1000000, netPrev: 3920353.37, netCurr: 412185.22, netTotal: 4332538.59, appPrev: 4920353.37, appCurr: 412185.22, appTotal: 5332538.59, appDed: 1000000, appNetPrev: 3920353.37, appNetCurr: 412185.22, appNetTotal: 4332538.59, status: "معتمد", approval: "2026-05-24", projectStatus: "منتهي", pct: 1.13, collections: 0, expected: 0 },
  { code: "PZ-023", sector: "Cairo", submitted: "2026-04-19", name: "23-25 - بلوم فيلدز 17 نافورة - المستقبل سيتي - تطوير مصر", client: "Tatweer", contract: 21415795, inv: "11 rev 01", prev: 18016098.01, curr: 586330.5, total: 18602428.51, ded: 0, netPrev: 18016098.01, netCurr: 586330.5, netTotal: 18602428.51, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "تحت الاعتماد", approval: null, projectStatus: null, pct: 0.87, collections: 0, expected: 0 },
  { code: "PZ-024", sector: "Cairo", submitted: null, name: "23-04 - بلوم فيلدز 10 نوافير - المستقبل سيتي - شركة تطوير مصر", client: "Tatweer", contract: 15266551.23, inv: null, prev: 0, curr: 0, total: 0, ded: 0, netPrev: 0, netCurr: 0, netTotal: 0, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "لا يوجد مستخلص", approval: null, projectStatus: null, pct: 0, collections: 0, expected: 0 },
  { code: "PZ-025", sector: "Cairo", submitted: null, name: "24-15 - الهضبة - حمام سباحة - مشارق - اكتوبر", client: "مشارق", contract: 11307039, inv: null, prev: 0, curr: 0, total: 0, ded: 0, netPrev: 0, netCurr: 0, netTotal: 0, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "لا يوجد مستخلص", approval: null, projectStatus: null, pct: 0, collections: 0, expected: 0 },
  { code: "PZ-026", sector: "Cairo", submitted: "2026-03-11", name: "23-09 - Villa Hyde Park-MADKOUR", client: "MADKOUR", contract: 2717649.9, inv: "ختامي", prev: 2469005.84, curr: 0, total: 2469005.84, ded: 139916.78, netPrev: 257884.69, netCurr: 2046514.31, netTotal: 2304399, appPrev: 2469005.84, appCurr: -2469005.84, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "تحت الاعتماد", approval: null, projectStatus: null, pct: 0.91, collections: 0, expected: 0 },
  { code: "PZ-027", sector: "Cairo", submitted: null, name: "24-16 - كابيتال جاردينز - حمام سباحة - بالم هيلز - القاهرة الجديدة", client: "بالم هيلز", contract: 2347500, inv: null, prev: 0, curr: 0, total: 0, ded: 0, netPrev: 0, netCurr: 0, netTotal: 0, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "لا يوجد مستخلص", approval: null, projectStatus: null, pct: 0, collections: 176761.9, expected: 0 },
  { code: "PZ-028", sector: "Cairo", submitted: null, name: "Mansora 7 - Aqua tonic - Inspire", client: "Inspire", contract: 15218744.71, inv: null, prev: 0, curr: 0, total: 0, ded: 0, netPrev: 0, netCurr: 0, netTotal: 0, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "لا يوجد مستخلص", approval: null, projectStatus: null, pct: 0, collections: 0, expected: 0 },
  { code: "PZ-029", sector: "Cairo", submitted: null, name: "22-69 -  Capital Way", client: "تايم ميكس", contract: 6659440, inv: null, prev: 0, curr: 0, total: 0, ded: 0, netPrev: 0, netCurr: 0, netTotal: 0, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "لا يوجد مستخلص", approval: null, projectStatus: null, pct: 0, collections: 0, expected: 0 },
  { code: "PZ-030", sector: "Cairo", submitted: null, name: "21-19 - فيلا محمد عبد المنعم - بالم هيلز - شركة اون تراك", client: "اون تراك", contract: 1748352.03, inv: null, prev: 0, curr: 0, total: 0, ded: 0, netPrev: 0, netCurr: 0, netTotal: 0, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "لا يوجد مستخلص", approval: null, projectStatus: null, pct: 0, collections: 0, expected: 0 },
  { code: "PZ-031", sector: "Cairo", submitted: null, name: "24-06 - City Gate 6 fountains - New cairo - CCC", client: "CCC", contract: 8500000, inv: "Final", prev: 0, curr: 0, total: 0, ded: 0, netPrev: 0, netCurr: 0, netTotal: 0, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "تحت الاعتماد", approval: "2026-05-19", projectStatus: "منتهي", pct: 1, collections: 0, expected: 0 },
  { code: "PZ-032", sector: "Cairo", submitted: null, name: "المسار - عدد 14بحيرة و 14 حمام سباحة - جينيت - العاصمة الإدارية - 13-25", client: "جينت", contract: 5614452, inv: "Final", prev: 3634776, curr: 0, total: 3634776, ded: 31884, netPrev: 3602892, netCurr: 0, netTotal: 3602892, appPrev: 3634776, appCurr: 0, appTotal: 3634776, appDed: 31884, appNetPrev: 3602892, appNetCurr: 0, appNetTotal: 3602892, status: "في انتظار النسخة المعتمدة", approval: null, projectStatus: "منتهي", pct: 0.65, collections: 0, expected: 0 },
  { code: "PZ-033", sector: "North Coast", submitted: null, name: "24-05 - lobby swimming pool - Ramla - شركة ايتاب (المراكز)", client: null, contract: 0, inv: null, prev: 0, curr: 0, total: 0, ded: 0, netPrev: 0, netCurr: 0, netTotal: 0, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "لا يوجد مستخلص", approval: null, projectStatus: null, pct: 0, collections: 0, expected: 0 },
  { code: "PZ-034", sector: null, submitted: null, name: "PZ-034", client: null, contract: 0, inv: null, prev: 0, curr: 0, total: 0, ded: 0, netPrev: 0, netCurr: 0, netTotal: 0, appPrev: 0, appCurr: 0, appTotal: 0, appDed: 0, appNetPrev: 0, appNetCurr: 0, appNetTotal: 0, status: "لا يوجد مستخلص", approval: null, projectStatus: null, pct: 0, collections: 0, expected: 0 },
];

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
      r.projectStatus ? `Project status: ${r.projectStatus}` : null,
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
