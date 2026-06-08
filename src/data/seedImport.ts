/**
 * One-time import of real IPC data from the PZone Excel log.
 * Supports both localStorage fallback and Supabase insert.
 *
 * v7 = Apr-Jun 2026 data refresh (34 projects from Excel)
 */
import { supabase } from "@/integrations/supabase/client";
import { SEED_PROJECTS, SEED_IPCS } from "@/data/ipcAprJun2026SeedData";

const LS_INVOICES = "pzone_invoices";
const LS_PROJECTS = "pzone_ipc_projects";
const LS_SEED_FLAG = "pzone_seed_done_v7";

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function isSeedDone(): boolean {
  if (localStorage.getItem(LS_SEED_FLAG) !== "true") return false;
  try {
    const invoices = JSON.parse(localStorage.getItem(LS_INVOICES) || "[]");
    const projects = JSON.parse(localStorage.getItem(LS_PROJECTS) || "[]");
    return Array.isArray(invoices) && invoices.length > 0 && Array.isArray(projects) && projects.length > 0;
  } catch {
    return false;
  }
}

/**
 * Import seed data: replaces stale entries and adds new ones.
 * Uses project_code as the dedup key for projects,
 * and project_code::invoice_number for invoices.
 */
export async function seedIPCData(): Promise<{ projects: number; ipcs: number }> {
  const now = new Date().toISOString();

  // ── Seed Projects (upsert into localStorage) ──
  const existingProjects: any[] = JSON.parse(localStorage.getItem(LS_PROJECTS) || "[]");
  const projectMap = new Map(existingProjects.map((p) => [p.project_code, p]));

  let projectsAdded = 0;
  for (const sp of SEED_PROJECTS) {
    if (!projectMap.has(sp.project_code)) {
      projectMap.set(sp.project_code, { id: uuid(), ...sp, created_at: now, updated_at: now });
      projectsAdded++;
    } else {
      // Update existing project with latest values (contract_value, client, etc.)
      const existing = projectMap.get(sp.project_code);
      projectMap.set(sp.project_code, { ...existing, ...sp, updated_at: now });
    }
  }
  localStorage.setItem(LS_PROJECTS, JSON.stringify([...projectMap.values()]));

  // ── Seed IPCs (upsert: replace old entry with same key) ──
  let ipcCount = 0;

  // Try Supabase first
  let useDB = false;
  try {
    const { error } = await supabase.from("invoices").select("id").limit(0);
    useDB = !error;
  } catch {
    useDB = false;
  }

  const seedKey = (pc: string, inv: string | null) => `${pc}::${inv || "0"}`;
  const upsertLocalInvoices = () => {
    const existingIPCs: any[] = JSON.parse(localStorage.getItem(LS_INVOICES) || "[]");
    const ipcMap = new Map(existingIPCs.map((i) => [seedKey(i.project_code, i.invoice_number), i]));

    for (const ipc of SEED_IPCS) {
      const key = seedKey(ipc.project_code, ipc.invoice_number);
      if (ipcMap.has(key)) {
        const old = ipcMap.get(key);
        ipcMap.set(key, { ...old, ...ipc, updated_at: now });
      } else {
        ipcMap.set(key, { id: uuid(), ...ipc, created_at: now, updated_at: now });
      }
    }

    localStorage.setItem(LS_INVOICES, JSON.stringify([...ipcMap.values()]));
  };

  if (useDB) {
    // Get existing combos from DB
    const { data: existing } = await supabase
      .from("invoices")
      .select("id, project_code, invoice_number");
    const existingMap = new Map(
      (existing || []).map((i: any) => [seedKey(i.project_code, i.invoice_number), i.id])
    );

    let dbWriteFailed = false;
    for (const ipc of SEED_IPCS) {
      if (dbWriteFailed) break;
      const key = seedKey(ipc.project_code, ipc.invoice_number);
      const row: Record<string, any> = {};
      for (const [k, v] of Object.entries(ipc)) {
        if (v !== undefined) row[k] = v;
      }

      if (existingMap.has(key)) {
        // Update existing record
        const id = existingMap.get(key)!;
        const { error } = await supabase.from("invoices").update(row).eq("id", id);
        if (error) {
          console.warn("[IPC Seed] Supabase update error, falling back to LS:", error.message);
          dbWriteFailed = true;
        }
      } else {
        // Insert new
        const { error } = await supabase.from("invoices").insert([row]);
        if (error) {
          console.warn("[IPC Seed] Supabase insert error, falling back to LS:", error.message);
          dbWriteFailed = true;
        }
      }
      ipcCount++;
    }
    // Keep a local test copy too, because RLS can allow probes while blocking
    // invoice reads for the current anonymous browser session.
    upsertLocalInvoices();
  } else {
    // Pure localStorage mode — upsert
    const existingIPCs: any[] = JSON.parse(localStorage.getItem(LS_INVOICES) || "[]");
    const ipcMap = new Map(existingIPCs.map((i) => [seedKey(i.project_code, i.invoice_number), i]));

    for (const ipc of SEED_IPCS) {
      const key = seedKey(ipc.project_code, ipc.invoice_number);
      if (ipcMap.has(key)) {
        // Replace with updated data
        const old = ipcMap.get(key);
        ipcMap.set(key, { ...old, ...ipc, updated_at: now });
      } else {
        ipcMap.set(key, { id: uuid(), ...ipc, created_at: now, updated_at: now });
      }
      ipcCount++;
    }

    localStorage.setItem(LS_INVOICES, JSON.stringify([...ipcMap.values()]));
  }

  // Mark as done
  localStorage.setItem(LS_SEED_FLAG, "true");

  return { projects: projectsAdded, ipcs: ipcCount };
}

export function resetSeedData(): void {
  localStorage.removeItem(LS_SEED_FLAG);
  localStorage.removeItem(LS_INVOICES);
  localStorage.removeItem(LS_PROJECTS);
}
