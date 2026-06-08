import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type ProjectNotebook = Tables<"project_notebooks">;

/**
 * Get all notebooks linked to a specific project.
 */
export function useProjectNotebooks(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-notebooks", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_notebooks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProjectNotebook[];
    },
    enabled: !!projectId,
  });
}

/**
 * Get all notebooks linked to a specific contract.
 */
export function useContractNotebooks(contractId: string | undefined) {
  return useQuery({
    queryKey: ["contract-notebooks", contractId],
    queryFn: async () => {
      if (!contractId) return [];
      const { data, error } = await supabase
        .from("project_notebooks")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProjectNotebook[];
    },
    enabled: !!contractId,
  });
}

/**
 * Find an existing notebook by notebook_id (NLM UUID).
 */
export function useNotebookByNlmId(notebookId: string | undefined) {
  return useQuery({
    queryKey: ["notebook-by-nlm", notebookId],
    queryFn: async () => {
      if (!notebookId) return null;
      const { data, error } = await supabase
        .from("project_notebooks")
        .select("*")
        .eq("notebook_id", notebookId)
        .maybeSingle();
      if (error) throw error;
      return data as ProjectNotebook | null;
    },
    enabled: !!notebookId,
  });
}

/**
 * Link (upsert) a NotebookLM notebook to a contract/project.
 * If the notebook_id already exists, it updates instead of failing.
 */
export function useLinkNotebook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      contractId: string;
      projectId?: string | null;
      notebookId: string;
      notebookTitle: string;
      sourceType?: string;
    }) => {
      // Upsert: try to insert, on conflict update
      const row: TablesInsert<"project_notebooks"> = {
        contract_id: input.contractId,
        project_id: input.projectId || null,
        notebook_id: input.notebookId,
        notebook_title: input.notebookTitle,
        source_type: input.sourceType || "contract",
        synced_at: new Date().toISOString(),
      };

      // Check if exists
      const { data: existing } = await supabase
        .from("project_notebooks")
        .select("id")
        .eq("notebook_id", input.notebookId)
        .maybeSingle();

      if (existing) {
        // Update synced_at
        const { data, error } = await supabase
          .from("project_notebooks")
          .update({ synced_at: new Date().toISOString(), notebook_title: input.notebookTitle })
          .eq("notebook_id", input.notebookId)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("project_notebooks")
          .insert(row)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contract-notebooks", data.contract_id] });
      queryClient.invalidateQueries({ queryKey: ["project-notebooks", data.project_id] });
      queryClient.invalidateQueries({ queryKey: ["notebook-by-nlm"] });
    },
  });
}

/**
 * Delete a notebook link.
 */
export function useUnlinkNotebook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, contractId, projectId }: { id: string; contractId?: string; projectId?: string }) => {
      const { error } = await supabase.from("project_notebooks").delete().eq("id", id);
      if (error) throw error;
      return { contractId, projectId };
    },
    onSuccess: ({ contractId, projectId }) => {
      if (contractId) queryClient.invalidateQueries({ queryKey: ["contract-notebooks", contractId] });
      if (projectId) queryClient.invalidateQueries({ queryKey: ["project-notebooks", projectId] });
    },
  });
}
