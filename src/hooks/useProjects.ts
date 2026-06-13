import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { syncProjectToIPC } from "./useIPCProjects";

export interface Project {
  id: string;
  project_code: string;
  project_name: string;
  name_ar: string | null;
  project_type: string | null;
  sector: string | null;
  zone: string | null;
  contract_value: number | null;
  contract_type: string | null;
  currency: string | null;
  retention_pct: number | null;
  advance_payment_pct: number | null;
  project_status: string | null;
  completion_pct: number | null;
  start_date: string | null;
  end_date: string | null;
  actual_end_date: string | null;
  duration_days: number | null;
  project_manager: string | null;
  phone: string | null;
  notes: string | null;
  tender_id: string | null;
  budget_header_id: string | null;
  client_id: string | null;
  // Progress specific fields
  advanced_payment: number | null;
  est_sent_date: string | null;
  delay_days: number | null;
  actual_sent_date: string | null;
  progress_statement: string | null;
  progress_date: string | null;
  invoice_status: string | null;
  approval_date: string | null;
  progress_sheet: boolean | null;
  
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined data
  client?: { name: string } | null;
}

export interface ProjectWithMetrics extends Project {
  cpi: number | null;
  spi: number | null;
  margin_pct: number | null;
  days_remaining: number | null;
  status_color: "green" | "yellow" | "red" | "gray";
}

export function useProjects(filters?: {
  status?: string;
  client_id?: string;
  project_type?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["projects", filters],
    queryFn: async () => {
      let query = supabase
        .from("ongoing_projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("project_status", filters.status);
      }
      if (filters?.client_id) {
        query = query.eq("client_id", filters.client_id);
      }
      if (filters?.project_type) {
        query = query.eq("project_type", filters.project_type);
      }
      if (filters?.search) {
        query = query.or(`project_name.ilike.%${filters.search}%,project_code.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw new Error("خطأ في جلب المشاريع");

      // Batch-fetch all budget totals in a single query to avoid N+1
      const budgetMap = new Map<string, number>();
      const budgetIds = (data || [])
        .map((p: any) => p.budget_header_id)
        .filter((id: any): id is string => id != null);
      if (budgetIds.length > 0) {
        try {
          const { data: budgets } = await supabase
            .from("budget_headers")
            .select("id, total_budget")
            .in("id", budgetIds);
          if (budgets) {
            for (const b of budgets) {
              budgetMap.set(b.id, b.total_budget || 0);
            }
          }
        } catch {
          // budget_headers table may not exist
        }
      }

      // Enrich with metrics — safely default columns that may not exist in DB
      const enriched: ProjectWithMetrics[] = await Promise.all(
        (data || []).map(async (project: any) => {
          // Default fields that may not exist in the Supabase schema
          const safeProject = {
            ...project,
            retention_pct: project.retention_pct ?? null,
            advance_payment_pct: project.advance_payment_pct ?? null,
            budget_header_id: project.budget_header_id ?? null,
            tender_id: project.tender_id ?? null,
          };

          // Get CPI from cost control if available
          const cpi: number | null = null;
          const spi: number | null = null;
          let margin_pct: number | null = null;

          // Calculate days remaining
          const endDate = safeProject.end_date ? new Date(safeProject.end_date) : null;
          const today = new Date();
          const days_remaining = endDate ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

          // Calculate margin if we have contract value and budget
          if (safeProject.budget_header_id && safeProject.contract_value) {
            const totalBudget = budgetMap.get(safeProject.budget_header_id);
            if (totalBudget !== undefined) {
              margin_pct = ((safeProject.contract_value - totalBudget) / safeProject.contract_value) * 100;
            }
          }

          // Determine status color
          let status_color: ProjectWithMetrics["status_color"] = "gray";
          if (safeProject.project_status === "يعمل" || safeProject.project_status === "active") {
            if (cpi !== null && cpi < 0.85) {
              status_color = "red";
            } else if (cpi !== null && cpi < 0.95) {
              status_color = "yellow";
            } else {
              status_color = "green";
            }
          } else if (safeProject.project_status === "completed" || safeProject.project_status === "مكتمل") {
            status_color = "green";
          } else if (safeProject.project_status === "on_hold" || safeProject.project_status === "متوقف") {
            status_color = "yellow";
          }

          return {
            ...safeProject,
            cpi,
            spi,
            margin_pct,
            days_remaining,
            status_color,
          } as unknown as ProjectWithMetrics;
        })
      );

      return enriched;
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      if (!id) return null;
      // Try with client join first
      try {
        const { data, error } = await supabase
          .from("ongoing_projects")
          .select(`
            *,
            client:clients(id, name)
          `)
          .eq("id", id)
          .single();
        if (error) throw error;
        return data as Project;
      } catch {
        // Fallback without client join
        const { data, error } = await supabase
          .from("ongoing_projects")
          .select("*")
          .eq("id", id)
          .single();
        if (error) throw error;
        return data as Project;
      }
    },
    enabled: !!id,
  });
}

export function useProjectsKPIs() {
  return useQuery({
    queryKey: ["projects-kpis"],
    queryFn: async () => {
      const { data: projects, error } = await supabase
        .from("ongoing_projects")
        .select("id, project_status, contract_value");

      if (error) throw error;

      const activeStatuses = ["يعمل", "active", "setup"];
      const activeProjects = projects?.filter(p => activeStatuses.includes(p.project_status || "")) || [];
      
      const totalProjects = projects?.length || 0;
      const totalContractValue = activeProjects.reduce((sum, p) => sum + (p.contract_value || 0), 0);
      const activeCount = activeProjects.length;

      // For at_risk and critical, we'd need CPI data - for now return 0
      return {
        totalProjects,
        totalContractValue,
        activeCount,
        atRiskCount: 0,
        criticalCount: 0,
      };
    },
  });
}

export function useClients() {
  return useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });
}

/** Whitelist: only send columns confirmed to exist on the live Supabase DB.
 *  The local types.ts lists columns that were never migrated. */
const VALID_DB_COLUMNS = new Set([
  "id", "project_code", "project_name",
  "contract_value", "currency", "project_status",
  "start_date", "project_manager", "phone", "notes",
  "advanced_payment", "est_sent_date", "delay_days", "actual_sent_date",
  "progress_statement", "progress_date", "invoice_status", "approval_date",
  "progress_sheet", "created_by", "created_at", "updated_at",
]);

function stripNonDBFields(project: Partial<Project>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(project as any)) {
    if (VALID_DB_COLUMNS.has(key)) {
      clean[key] = value;
    }
  }
  return clean;
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (project: Partial<Project>) => {
      const { data, error } = await supabase
        .from("ongoing_projects")
        .insert(stripNonDBFields(project))
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["ipcProjects"] });
      // Bridge: auto-sync to IPC projects
      syncProjectToIPC(data).catch(() => {});
      toast.success("تم إنشاء المشروع بنجاح");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase
        .from("ongoing_projects")
        .update(stripNonDBFields(updates as Partial<Project>))
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", data.id] });
      queryClient.invalidateQueries({ queryKey: ["projects-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["ipcProjects"] });
      // Bridge: auto-sync to IPC projects
      syncProjectToIPC(data).catch(() => {});
      toast.success("تم تحديث المشروع");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ongoing_projects")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects-kpis"] });
      toast.success("تم حذف المشروع");
    },
    onError: (err: any) => toast.error(err.message),
  });
}
