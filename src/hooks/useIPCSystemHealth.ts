import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type IPCHealthSeverity = "ok" | "warning" | "error";

export interface IPCHealthCheck {
  key: string;
  label: string;
  labelAr: string;
  status: IPCHealthSeverity;
  detail: string;
  required: boolean;
}

export interface IPCSystemHealth {
  checks: IPCHealthCheck[];
  score: number;
  blockingCount: number;
  warningCount: number;
  ready: boolean;
  localInvoiceCount: number;
  localProjectCount: number;
}

const SCHEMA_CHECKS = [
  {
    key: "invoices",
    label: "IPC invoices table",
    labelAr: "جدول المستخلصات",
    table: "invoices",
    columns:
      "id,project_code,project_name,client,contract_value,invoice_number,work_current,work_total,approved_current,approved_total,approved_net_total,total_collections,submitted_date,approval_date,status,approved_tax_amount,ipc_project_id",
    required: true,
    hint: "20260609_ipc_invoice_tax_columns.sql",
  },
  {
    key: "ongoing_projects",
    label: "Project master table",
    labelAr: "جدول المشاريع",
    table: "ongoing_projects",
    columns: "id,project_code,project_name,client_name,project_status,project_manager,contract_value,currency",
    required: true,
    hint: "Base schema setup",
  },
  {
    key: "collection_transactions",
    label: "Collection ledger",
    labelAr: "دفتر التحصيلات",
    table: "collection_transactions",
    columns: "id,project_code,collection_date,collection_month,amount,currency,dedupe_key,status",
    required: true,
    hint: "20260605_financial_ledgers.sql",
  },
  {
    key: "cash_flow_transactions",
    label: "Actual cashflow ledger",
    labelAr: "دفتر التدفقات الفعلية",
    table: "cash_flow_transactions",
    columns: "id,transaction_date,transaction_month,project_code,type,category,amount,currency,status",
    required: true,
    hint: "20260605_financial_ledgers.sql",
  },
  {
    key: "cash_flow_forecasts",
    label: "Cashflow forecasts",
    labelAr: "توقعات التدفقات النقدية",
    table: "cash_flow_forecasts",
    columns: "id,forecast_date,forecast_month,project_code,type,category,amount,probability_pct,status",
    required: true,
    hint: "20260605_financial_ledgers.sql",
  },
  {
    key: "board_share_tokens",
    label: "Online board sharing",
    labelAr: "مشاركة المجلس أونلاين",
    table: "board_share_tokens",
    columns: "token,snapshot_data,expires_at,is_active,created_by,created_at",
    required: true,
    hint: "20260610_board_share_snapshot_repair.sql",
  },
  {
    key: "contract_module_access",
    label: "RACI module access",
    labelAr: "صلاحيات الوحدات",
    table: "contract_module_access",
    columns: "module_path,module_label,allowed_roles,updated_at",
    required: true,
    hint: "Base schema setup",
  },
  {
    key: "user_roles",
    label: "User roles",
    labelAr: "أدوار المستخدمين",
    table: "user_roles",
    columns: "user_id,role,created_at",
    required: true,
    hint: "Base schema setup",
  },
  {
    key: "profiles",
    label: "User profiles",
    labelAr: "ملفات المستخدمين",
    table: "profiles",
    columns: "user_id,full_name,department,created_at",
    required: false,
    hint: "Base schema setup",
  },
] as const;

function errorDetail(error: any) {
  return String(error?.message || error?.details || error || "Unknown schema error");
}

function withHint(message: string, hint: string) {
  return `${message} - Apply SQL: ${hint}`;
}

async function checkTable(check: (typeof SCHEMA_CHECKS)[number]): Promise<IPCHealthCheck> {
  const { error } = await (supabase as any).from(check.table).select(check.columns).limit(0);
  if (!error) {
    return {
      key: check.key,
      label: check.label,
      labelAr: check.labelAr,
      status: "ok",
      detail: "Available with required columns.",
      required: check.required,
    };
  }

  return {
    key: check.key,
    label: check.label,
    labelAr: check.labelAr,
    status: check.required ? "error" : "warning",
    detail: withHint(errorDetail(error), check.hint),
    required: check.required,
  };
}

async function checkBoardSnapshotRpc(): Promise<IPCHealthCheck> {
  const { error } = await (supabase as any).rpc("get_board_snapshot", { input_token: "__health_probe__" });
  const message = errorDetail(error);
  const exists = !error || /invalid or expired share token/i.test(message);

  return {
    key: "get_board_snapshot_rpc",
    label: "Board snapshot RPC",
    labelAr: "دالة قراءة رابط المشاركة",
    status: exists ? "ok" : "error",
    detail: exists
      ? "Function is available."
      : withHint(message, "20260610_board_share_snapshot_repair.sql"),
    required: true,
  };
}

async function checkCreateBoardTokenRpc(): Promise<IPCHealthCheck> {
  const { error } = await (supabase as any).rpc("create_board_token", { input_data: { __probe: true } });
  const message = errorDetail(error);
  const exists = !error || !/could not find the function|does not exist/i.test(message);

  return {
    key: "create_board_token_rpc",
    label: "Board token creation RPC",
    labelAr: "دالة إنشاء رابط المشاركة",
    status: exists ? "ok" : "error",
    detail: exists
      ? "Function is available."
      : withHint(message, "20260610_board_share_snapshot_repair.sql"),
    required: true,
  };
}

async function checkLedgerRpcs(): Promise<IPCHealthCheck> {
  const { error } = await (supabase as any).rpc("post_collection_transaction", { row_id: "00000000-0000-0000-0000-000000000000" });
  const message = errorDetail(error);
  const exists = !error || !/could not find the function|does not exist/i.test(message);

  return {
    key: "ledger_rpcs",
    label: "Financial ledger RPCs",
    labelAr: "دوال المعاملات المالية",
    status: exists ? "ok" : "warning",
    detail: exists
      ? "Post/reverse RPCs are available."
      : withHint(message, "20260605_financial_ledgers.sql"),
    required: false,
  };
}

function readLocalCount(key: string) {
  if (typeof window === "undefined") return 0;
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.length : 0;
  } catch {
    return 0;
  }
}

async function fetchIPCSystemHealth(): Promise<IPCSystemHealth> {
  const checks = await Promise.all(SCHEMA_CHECKS.map(checkTable));
  checks.push(await checkBoardSnapshotRpc());
  checks.push(await checkCreateBoardTokenRpc());
  checks.push(await checkLedgerRpcs());

  // Just report the counts — do NOT clear localStorage here.
  // The seedImport module relies on these keys to prevent re-seeding loops.
  const localInvoiceCount = readLocalCount("pzone_invoices");
  const localProjectCount = readLocalCount("pzone_ipc_projects");

  const blockingCount = checks.filter((check) => check.status === "error" && check.required).length;
  const warningCount = checks.filter((check) => check.status === "warning").length;
  const score = Math.max(0, Math.min(100, 100 - blockingCount * 18 - warningCount * 5));

  return {
    checks,
    score,
    blockingCount,
    warningCount,
    ready: blockingCount === 0,
    localInvoiceCount,
    localProjectCount,
  };
}

export function useIPCSystemHealth(enabled = true) {
  return useQuery({
    queryKey: ["ipc-system-health"],
    queryFn: fetchIPCSystemHealth,
    enabled,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
