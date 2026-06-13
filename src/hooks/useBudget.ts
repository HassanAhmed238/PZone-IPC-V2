import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/stores/useAuthStore";
import { toast } from "sonner";

export interface BudgetHeader {
  id: string;
  project_id: string;
  version: number;
  status: "draft" | "submitted" | "approved" | "locked";
  total_direct_cost: number;
  total_indirect_cost: number;
  total_budget: number;
  contract_value: number;
  expected_profit: number;
  profit_margin_pct: number;
  approved_by: string | null;
  approved_at: string | null;
  rejection_comment: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  notes: string | null;
  project?: {
    project_code: string;
    project_name: string;
    contract_value: number;
  };
}

export interface BudgetLine {
  id: string;
  budget_header_id: string;
  project_id: string;
  discipline: string | null;
  activity: string | null;
  cost_code: string | null;
  description: string | null;
  unit: string | null;
  boq_qty: number;
  remeasured_qty: number;
  drawings_qty: number;
  qty_source: "boq" | "remeasured" | "drawings" | "manual";
  budget_qty: number;
  qty_source_note: string | null;
  direct_cost_total: number;
  indirect_pct: number;
  indirect_amount: number;
  line_total: number;
  sort_order: number;
  notes: string | null;
}

export interface BudgetLineCost {
  id: string;
  budget_line_id: string;
  cost_type: "material" | "labor" | "equipment" | "subcontract";
  description: string | null;
  unit: string | null;
  qty: number;
  unit_rate: number;
  amount: number;
  supplier_id: string | null;
  notes: string | null;
}

export function useBudgetHeaders() {
  return useQuery({
    queryKey: ["budget-headers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_headers")
        .select(`
          *,
          project:ongoing_projects(project_code, project_name, contract_value)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BudgetHeader[];
    },
  });
}

export function useBudgetHeader(id: string | undefined) {
  return useQuery({
    queryKey: ["budget-header", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("budget_headers")
        .select(`
          *,
          project:ongoing_projects(project_code, project_name, contract_value)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as BudgetHeader;
    },
    enabled: !!id,
  });
}

export function useBudgetLines(budgetHeaderId: string | undefined) {
  return useQuery({
    queryKey: ["budget-lines", budgetHeaderId],
    queryFn: async () => {
      if (!budgetHeaderId) return [];
      const { data, error } = await supabase
        .from("budget_lines")
        .select("*")
        .eq("budget_header_id", budgetHeaderId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as BudgetLine[];
    },
    enabled: !!budgetHeaderId,
  });
}

export function useBudgetLineCosts(budgetLineId: string | undefined) {
  return useQuery({
    queryKey: ["budget-line-costs", budgetLineId],
    queryFn: async () => {
      if (!budgetLineId) return [];
      const { data, error } = await supabase
        .from("budget_line_costs")
        .select("*")
        .eq("budget_line_id", budgetLineId);
      if (error) throw error;
      return data as BudgetLineCost[];
    },
    enabled: !!budgetLineId,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (projectId: string) => {
      // Get project details
      const { data: project } = await supabase
        .from("ongoing_projects")
        .select("contract_value")
        .eq("id", projectId)
        .single();

      const { data, error } = await supabase
        .from("budget_headers")
        .insert({
          project_id: projectId,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-headers"] });
      toast.success("تم إنشاء الميزانية بنجاح");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useUpdateBudgetHeader() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BudgetHeader> & { id: string }) => {
      const { data, error } = await supabase
        .from("budget_headers")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["budget-headers"] });
      queryClient.invalidateQueries({ queryKey: ["budget-header", data.id] });
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useSubmitBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("budget_headers")
        .update({ status: "submitted" as any })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["budget-headers"] });
      queryClient.invalidateQueries({ queryKey: ["budget-header", data.id] });
      toast.success("تم تقديم الميزانية للاعتماد");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useApproveBudget() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("budget_headers")
        .update({
          status: "locked" as any,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["budget-headers"] });
      queryClient.invalidateQueries({ queryKey: ["budget-header", data.id] });
      toast.success("تم اعتماد الميزانية وقفلها");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useRejectBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      const { data, error } = await supabase
        .from("budget_headers")
        .update({
          status: "draft" as any,
          rejection_comment: comment,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["budget-headers"] });
      queryClient.invalidateQueries({ queryKey: ["budget-header", data.id] });
      toast.info("تم رفض الميزانية وإعادتها للتعديل");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useCreateBudgetLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (line: Partial<BudgetLine>) => {
      const { data, error } = await supabase
        .from("budget_lines")
        .insert(line as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["budget-lines", data.budget_header_id] });
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useUpdateBudgetLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BudgetLine> & { id: string }) => {
      const { data, error } = await supabase
        .from("budget_lines")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["budget-lines", data.budget_header_id] });
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useDeleteBudgetLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, budgetHeaderId }: { id: string; budgetHeaderId: string }) => {
      const { error } = await supabase
        .from("budget_lines")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return budgetHeaderId;
    },
    onSuccess: (budgetHeaderId) => {
      queryClient.invalidateQueries({ queryKey: ["budget-lines", budgetHeaderId] });
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useUpsertBudgetLineCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cost: Partial<BudgetLineCost> & { budget_line_id: string }) => {
      const { data, error } = await supabase
        .from("budget_line_costs")
        .upsert(cost as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["budget-line-costs", data.budget_line_id] });
    },
    onError: (err: any) => toast.error(err.message),
  });
}
