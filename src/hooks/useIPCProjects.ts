import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ─── Cache Configuration ─────────────────────────────────── */
const CACHE = {
  projects: { staleTime: 3 * 60 * 1000, gcTime: 15 * 60 * 1000 },
  single: { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 },
} as const;

/* ─── Types ────────────────────────────────────────────────── */

export interface VOItem {
  vo_number: string;
  description: string;
  amount: number;
  status: "pending" | "approved";
}

export interface IPCProject {
  id: string;
  project_code: string;
  project_name: string;
  client: string | null;
  sector: string | null;
  project_manager: string | null;
  contract_value: number;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  description: string | null;
  variation_orders: VOItem[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type IPCProjectInput = Omit<IPCProject, "id" | "created_at" | "updated_at" | "created_by">;

/* ─── Helpers ──────────────────────────────────────────────── */

/** Detect Supabase errors that mean the table/schema is not yet migrated */
function isTableMissingError(error: any): boolean {
  const msg = String(error?.message || "");
  return /does not exist|schema cache|Could not find|relation .* does not exist/i.test(msg);
}

function mapRow(row: any): IPCProject {
  return {
    ...row,
    contract_value: Number(row.contract_value) || 0,
    variation_orders: Array.isArray(row.variation_orders) ? row.variation_orders : [],
    is_active: row.is_active !== false,
  };
}

let ipcProjectsTableAvailable: boolean | null = null;

async function readIPCProjectsQuery<T>(query: PromiseLike<{ data: T; error: any }>) {
  if (ipcProjectsTableAvailable === false) {
    return { data: null as T | null, error: { message: "ipc_projects table unavailable" } };
  }

  const result = await query;
  if (result.error && isTableMissingError(result.error)) {
    ipcProjectsTableAvailable = false;
  } else if (!result.error) {
    ipcProjectsTableAvailable = true;
  }
  return result;
}

/* ─── Hooks ────────────────────────────────────────────────── */

const LS_PROJECTS_KEY = "pzone_ipc_projects";

function getLocalProjects(): IPCProject[] {
  try { return JSON.parse(localStorage.getItem(LS_PROJECTS_KEY) || "[]"); } catch { return []; }
}

function saveLocalProjects(projects: IPCProject[]) {
  localStorage.setItem(LS_PROJECTS_KEY, JSON.stringify(projects));
}

/** Fetch all IPC projects */
export function useIPCProjects() {
  return useQuery({
    queryKey: ["ipcProjects"],
    staleTime: CACHE.projects.staleTime,
    gcTime: CACHE.projects.gcTime,
    queryFn: async () => {
      const { data, error } = await readIPCProjectsQuery(
        supabase
          .from("ipc_projects")
          .select("*")
          .order("project_code"),
      );
      if (error) {
        // Table not migrated yet — expected, fall back silently
        if (isTableMissingError(error)) return getLocalProjects();
        console.warn("[IPCProjects] Unexpected query error:", error.message);
        return getLocalProjects();
      }
      return (data || []).map(mapRow);
    },
  });
}

/** Fetch a single project by code */
export function useIPCProjectByCode(code: string | null) {
  return useQuery({
    queryKey: ["ipcProject", code],
    enabled: !!code,
    staleTime: CACHE.single.staleTime,
    gcTime: CACHE.single.gcTime,
    queryFn: async () => {
      const { data, error } = await readIPCProjectsQuery(
        supabase
          .from("ipc_projects")
          .select("*")
          .eq("project_code", code!)
          .single(),
      );
      if (error) {
        if (isTableMissingError(error)) {
          return getLocalProjects().find((p) => p.project_code === code) || null;
        }
        // PGRST116 = no rows found — not an error, just empty
        if (error.code === "PGRST116") return null;
        console.warn("[IPCProjects] Fetch error:", error.message);
        return getLocalProjects().find((p) => p.project_code === code) || null;
      }
      return mapRow(data);
    },
  });
}

/** Create a new project */
export function useCreateIPCProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: IPCProjectInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await readIPCProjectsQuery(
        supabase
          .from("ipc_projects")
          .insert({ ...input, created_by: user?.id })
          .select()
          .single(),
      );
      if (error) {
        if (isTableMissingError(error)) {
          // Table not migrated — save locally with warning
          toast.warning("Saved offline — ipc_projects table not yet migrated.");
          const now = new Date().toISOString();
          const newProject: IPCProject = {
            ...input, id: crypto.randomUUID(),
            created_by: null, created_at: now, updated_at: now,
          };
          saveLocalProjects([...getLocalProjects(), newProject]);
          return newProject;
        }
        throw new Error(`Failed to create project: ${error.message}`);
      }
      return mapRow(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ipcProjects"] });
      toast.success("Project created successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/** Update a project */
export function useUpdateIPCProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<IPCProjectInput> & { id: string }) => {
      const { data, error } = await readIPCProjectsQuery(
        supabase
          .from("ipc_projects")
          .update(input)
          .eq("id", id)
          .select()
          .single(),
      );
      if (error) {
        if (isTableMissingError(error)) {
          toast.warning("Updated offline — ipc_projects table not yet migrated.");
          const all = getLocalProjects();
          const idx = all.findIndex((p) => p.id === id);
          if (idx >= 0) {
            all[idx] = { ...all[idx], ...input, updated_at: new Date().toISOString() };
            saveLocalProjects(all);
            return all[idx];
          }
        }
        throw new Error(`Failed to update project: ${error.message}`);
      }
      return mapRow(data);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["ipcProjects"] });
      qc.invalidateQueries({ queryKey: ["ipcProject", vars.project_code] });
      toast.success("Project updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/** Delete a project */
export function useDeleteIPCProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await readIPCProjectsQuery(
        supabase.from("ipc_projects").delete().eq("id", id),
      );
      if (error) {
        if (isTableMissingError(error)) {
          // Table not migrated — delete from localStorage only
          saveLocalProjects(getLocalProjects().filter((p) => p.id !== id));
          return;
        }
        throw new Error(`Failed to delete project: ${error.message}`);
      }
      // Also clean localStorage if the record existed there
      saveLocalProjects(getLocalProjects().filter((p) => p.id !== id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ipcProjects"] });
      toast.success("Project deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/** Derived: total authorized value = contract + approved VOs */
export function totalAuthorized(project: IPCProject): number {
  const voTotal = project.variation_orders
    .filter((vo) => vo.status === "approved")
    .reduce((s, vo) => s + (vo.amount || 0), 0);
  return project.contract_value + voTotal;
}

/** All unique sectors from projects */
export function useSectorsFromProjects() {
  const { data: projects = [] } = useIPCProjects();
  return [...new Set(projects.map((p) => p.sector).filter(Boolean))] as string[];
}

/** All unique clients from projects */
export function useClientsFromProjects() {
  const { data: projects = [] } = useIPCProjects();
  return [...new Set(projects.map((p) => p.client).filter(Boolean))] as string[];
}

/* ─── Bridge: Project Setup → IPC Projects ─────────────── */

/**
 * Upserts an `ipc_projects` record from an `ongoing_projects` row.
 * Matches on `project_code`. Creates if missing, updates if existing.
 * Works with Supabase + localStorage fallback.
 */
export async function syncProjectToIPC(project: {
  project_code: string;
  project_name: string;
  contract_value?: number | null;
  project_manager?: string | null;
  sector?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  client?: { name: string } | string | null;
  zone?: string | null;
  notes?: string | null;
}) {
  const clientName =
    typeof project.client === "string"
      ? project.client
      : (project.client as any)?.name || null;

  const payload: Partial<IPCProjectInput> = {
    project_code: project.project_code,
    project_name: project.project_name,
    contract_value: Number(project.contract_value) || 0,
    project_manager: project.project_manager || null,
    sector: project.sector || null,
    client: clientName,
    start_date: project.start_date || null,
    end_date: project.end_date || null,
    location: project.zone || null,
    description: project.notes || null,
    is_active: true,
  };

  // --- Try Supabase first ---
  const { data: existing, error: lookupError } = await readIPCProjectsQuery(
    supabase
      .from("ipc_projects")
      .select("id, variation_orders")
      .eq("project_code", project.project_code)
      .maybeSingle(),
  );

  if (!lookupError || !isTableMissingError(lookupError)) {
    if (existing) {
      await supabase.from("ipc_projects").update(payload).eq("id", existing.id);
    } else if (!lookupError) {
      await supabase.from("ipc_projects").insert({ ...payload, variation_orders: [] });
    }
  }
  // If table is missing, skip Supabase and fall through to localStorage below

  // --- Also update localStorage (for offline/fallback mode) ---
  const local = getLocalProjects();
  const idx = local.findIndex((p) => p.project_code === project.project_code);
  if (idx >= 0) {
    // Update but preserve VOs
    local[idx] = {
      ...local[idx],
      ...payload,
      variation_orders: local[idx].variation_orders || [],
      updated_at: new Date().toISOString(),
    } as IPCProject;
  } else {
    local.push({
      id: crypto.randomUUID(),
      ...payload,
      variation_orders: [],
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as IPCProject);
  }
  localStorage.setItem(LS_PROJECTS_KEY, JSON.stringify(local));
}

/**
 * Batch-sync all ongoing_projects to ipc_projects.
 * Only creates records for project codes not already present.
 */
export async function syncAllProjectsToIPC(
  ongoingProjects: Array<{
    project_code: string;
    project_name: string;
    contract_value?: number | null;
    project_manager?: string | null;
    sector?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    client?: { name: string } | string | null;
    zone?: string | null;
    notes?: string | null;
  }>
) {
  // Get existing IPC project codes
  const local = getLocalProjects();
  const existingCodes = new Set(local.map((p) => p.project_code));

  let created = 0;
  for (const proj of ongoingProjects) {
    if (!existingCodes.has(proj.project_code)) {
      await syncProjectToIPC(proj);
      created++;
    }
  }
  return created;
}
