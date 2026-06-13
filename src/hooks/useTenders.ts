import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useAuth } from "@/stores/useAuthStore";

export type Tender = Tables<"tenders">;
export type TenderInsert = TablesInsert<"tenders">;
export type CostBreakdownItem = Tables<"cost_breakdown_items">;

export function useTenders() {
  return useQuery({
    queryKey: ["tenders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useTender(id: string | undefined) {
  return useQuery({
    queryKey: ["tenders", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenders")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCBSItems(tenderId: string | undefined) {
  return useQuery({
    queryKey: ["cbs", tenderId],
    enabled: !!tenderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_breakdown_items")
        .select("*")
        .eq("tender_id", tenderId!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTender() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tender: Omit<TenderInsert, "created_by" | "tender_number">) => {
      const { data, error } = await supabase
        .from("tenders")
        .insert({ ...tender, created_by: user!.id, tender_number: "" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenders"] }),
  });
}

export function useUpdateTender() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"tenders"> & { id: string }) => {
      const { data, error } = await supabase
        .from("tenders")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tenders"] });
      queryClient.invalidateQueries({ queryKey: ["tenders", data.id] });
    },
  });
}

export function useDeleteTender() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete CBS items first
      const { error: cbsError } = await supabase
        .from("cost_breakdown_items")
        .delete()
        .eq("tender_id", id);
      if (cbsError) throw cbsError;

      const { error } = await supabase
        .from("tenders")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenders"] }),
  });
}

export function useCreateCBSItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: TablesInsert<"cost_breakdown_items">) => {
      const { data, error } = await supabase
        .from("cost_breakdown_items")
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => queryClient.invalidateQueries({ queryKey: ["cbs", data.tender_id] }),
  });
}

export function useUpdateCBSItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"cost_breakdown_items"> & { id: string }) => {
      const { data, error } = await supabase
        .from("cost_breakdown_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => queryClient.invalidateQueries({ queryKey: ["cbs", data.tender_id] }),
  });
}

export function useDeleteCBSItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, tenderId }: { id: string; tenderId: string }) => {
      const { error } = await supabase
        .from("cost_breakdown_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return tenderId;
    },
    onSuccess: (tenderId) => queryClient.invalidateQueries({ queryKey: ["cbs", tenderId] }),
  });
}
