import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialSnapshot } from "@/hooks/useFinancialSnapshot";
import {
  type CollectionImportRow,
  validateCollectionImportRows,
  toCollectionTransactionInsert,
} from "@/lib/collection-import";

function invalidateFinancialQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["collection-transactions"] });
  queryClient.invalidateQueries({ queryKey: ["cash-flow-transactions"] });
  queryClient.invalidateQueries({ queryKey: ["cash-flow-forecasts"] });
  queryClient.invalidateQueries({ queryKey: ["invoices"] });
}

export function useCollectionImportPreview(rows: CollectionImportRow[]) {
  const snapshot = useFinancialSnapshot();

  return useMemo(
    () => validateCollectionImportRows({
      rows,
      projects: snapshot.projects,
      existingCollections: snapshot.collections,
    }),
    [rows, snapshot.projects, snapshot.collections],
  );
}

export function usePostCollectionImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rows: ReturnType<typeof useCollectionImportPreview>["validRows"]) => {
      const inserts = rows.map(toCollectionTransactionInsert);
      if (inserts.length === 0) return [];

      const { data, error } = await (supabase as any)
        .from("collection_transactions")
        .insert(inserts)
        .select();

      if (error) throw error;
      return data || [];
    },
    onSuccess: (data) => {
      invalidateFinancialQueries(queryClient);
      toast.success(`Imported ${data.length} collection row(s) as validated ledger entries.`);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to import collection rows.");
    },
  });
}

export function useCollectionPostingActions() {
  const queryClient = useQueryClient();

  const post = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase as any).rpc("post_collection_transaction", { row_id: id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateFinancialQueries(queryClient);
      toast.success("Collection posted.");
    },
    onError: (error: any) => toast.error(error?.message || "Failed to post collection."),
  });

  const reverse = useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { data, error } = await (supabase as any).rpc("reverse_collection_transaction", {
        row_id: id,
        reversal_note: note || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateFinancialQueries(queryClient);
      toast.success("Collection reversed.");
    },
    onError: (error: any) => toast.error(error?.message || "Failed to reverse collection."),
  });

  return { post, reverse };
}
