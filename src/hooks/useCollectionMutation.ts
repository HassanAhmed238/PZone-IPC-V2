import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CollectionEditPayload {
  /** YYYY-MM format */
  monthKey: string;
  /** The NEW total collection for this month (not a delta) */
  newTotal: number;
  /** Current actual collected from the chart (sheet-synced + existing adjustments) */
  currentTotal: number;
}

/**
 * Upserts a manual collection adjustment for a given month.
 *
 * Strategy: instead of touching sheet-synced rows, we maintain a single
 * "manual_adjustment" row per month. The delta between the desired total
 * and the sheet-synced total is stored as the adjustment amount.
 */
export function useCollectionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ monthKey, newTotal, currentTotal }: CollectionEditPayload) => {
      const dedupeKey = `manual-adj::${monthKey}`;
      const collectionMonth = `${monthKey}-01`;
      const collectionDate = monthEndDate(monthKey);

      // Check if a manual adjustment already exists for this month
      const { data: existing } = await (supabase as any)
        .from("collection_transactions")
        .select("id, amount")
        .eq("dedupe_key", dedupeKey)
        .maybeSingle();

      // The sheet-synced total = currentTotal minus any existing manual adjustment
      const existingAdjustment = existing?.amount ?? 0;
      const sheetTotal = currentTotal - existingAdjustment;
      const adjustmentAmount = newTotal - sheetTotal;

      if (Math.abs(adjustmentAmount) < 0.01) {
        // No meaningful change — delete existing adjustment if any
        if (existing?.id) {
          await (supabase as any)
            .from("collection_transactions")
            .delete()
            .eq("id", existing.id);
        }
        return { action: "no-change" as const };
      }

      const row = {
        project_code: "__manual__",
        project_name: "Manual Adjustment",
        invoice_id: null,
        invoice_number: null,
        client: "Manual",
        collection_date: collectionDate,
        collection_month: collectionMonth,
        amount: Number(adjustmentAmount.toFixed(2)),
        currency: "EGP",
        reference_no: `Manual adjustment for ${monthKey}`,
        notes: `Chart edit: total set to ${newTotal.toLocaleString()}`,
        source_type: "manual_adjustment",
        source_file_name: null,
        source_row_key: null,
        dedupe_key: dedupeKey,
        status: "posted",
      };

      if (existing?.id) {
        const { error } = await (supabase as any)
          .from("collection_transactions")
          .update(row)
          .eq("id", existing.id);
        if (error) throw error;
        return { action: "updated" as const };
      }

      const { error } = await (supabase as any)
        .from("collection_transactions")
        .insert(row);
      if (error) throw error;
      return { action: "inserted" as const };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["collection_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow-transactions"] });
    },
  });
}

function monthEndDate(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}
