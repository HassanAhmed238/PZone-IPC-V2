import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TenderCBSItem {
  id: string;
  item_no: string | null;
  name: string;
  description: string | null;
  unit: string | null;
  quantity: number | null;
  unit_rate: number | null;
  total_cost: number | null;
  section: string | null;
  level: number;
  parent_id: string | null;
  item_type: string | null;
  supply_rate: number | null;
  install_rate: number | null;
  direct_cost: number | null;
}

export function useAvailableTenders(projectId: string | undefined) {
  return useQuery({
    queryKey: ["available-tenders-for-import", projectId],
    queryFn: async () => {
      // Get won tenders (or all if none won)
      const { data, error } = await supabase
        .from("tenders")
        .select("id, tender_number, title, status")
        .eq("status", "won")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

export function useImportFromTender() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tenderId,
      budgetHeaderId,
      projectId,
    }: {
      tenderId: string;
      budgetHeaderId: string;
      projectId: string;
    }) => {
      // 1. Fetch all CBS items from the tender
      const { data: cbsItems, error: cbsError } = await supabase
        .from("cost_breakdown_items")
        .select("*")
        .eq("tender_id", tenderId)
        .order("sort_order");

      if (cbsError) throw cbsError;
      if (!cbsItems?.length) throw new Error("لا توجد بنود في هذه المناقصة");

      // 2. Build parent map for section/activity resolution
      const itemMap = new Map<string, TenderCBSItem>();
      cbsItems.forEach((item) => itemMap.set(item.id, item as TenderCBSItem));

      // 3. Find leaf items (items with cost details) — level > 0
      // Level 0 = sections, Level 1+ = items
      const sections = cbsItems.filter((i) => i.level === 0);
      const items = cbsItems.filter((i) => i.level > 0);

      // Build section name map
      const sectionMap = new Map<string, string>();
      sections.forEach((s) => sectionMap.set(s.id, s.name));

      // 4. Group items and create budget lines
      let sortOrder = 0;
      const budgetLines: any[] = [];
      const costDetails: { lineIndex: number; costs: any[] }[] = [];

      for (const item of items) {
        // Resolve discipline from parent section
        let discipline = "عام";
        if (item.parent_id && sectionMap.has(item.parent_id)) {
          discipline = sectionMap.get(item.parent_id)!;
        } else if (item.section) {
          discipline = item.section;
        }

        const directCost = item.total_cost || (item.quantity || 0) * (item.unit_rate || 0);

        const budgetLine = {
          budget_header_id: budgetHeaderId,
          project_id: projectId,
          discipline,
          activity: item.name,
          cost_code: item.item_no || `ITM-${String(sortOrder + 1).padStart(3, "0")}`,
          description: item.description || item.name,
          unit: item.unit || "unit",
          boq_qty: item.quantity || 0,
          budget_qty: item.quantity || 0,
          qty_source: "boq" as const,
          qty_source_note: "مستورد من المناقصة",
          direct_cost_total: directCost,
          indirect_pct: 11,
          indirect_amount: directCost * 0.11,
          line_total: directCost * 1.11,
          sort_order: sortOrder,
        };

        budgetLines.push(budgetLine);

        // Build cost breakdown from item_type or supply/install rates
        const costs: any[] = [];

        if (item.supply_rate && item.supply_rate > 0) {
          costs.push({
            cost_type: "material",
            description: `توريد - ${item.name}`,
            unit: item.unit || "unit",
            qty: item.quantity || 0,
            unit_rate: item.supply_rate,
            amount: (item.quantity || 0) * item.supply_rate,
          });
        }

        if (item.install_rate && item.install_rate > 0) {
          costs.push({
            cost_type: "labor",
            description: `تركيب - ${item.name}`,
            unit: item.unit || "unit",
            qty: item.quantity || 0,
            unit_rate: item.install_rate,
            amount: (item.quantity || 0) * item.install_rate,
          });
        }

        // If no supply/install split, create a single material cost
        if (costs.length === 0 && directCost > 0) {
          costs.push({
            cost_type: item.item_type || "material",
            description: item.name,
            unit: item.unit || "unit",
            qty: item.quantity || 0,
            unit_rate: item.unit_rate || 0,
            amount: directCost,
          });
        }

        costDetails.push({ lineIndex: sortOrder, costs });
        sortOrder++;
      }

      if (budgetLines.length === 0) throw new Error("لا توجد بنود قابلة للاستيراد");

      // 5. Insert budget lines
      const { data: insertedLines, error: insertError } = await supabase
        .from("budget_lines")
        .insert(budgetLines)
        .select("id, sort_order");

      if (insertError) throw insertError;

      // 6. Insert cost details for each line
      const allCosts: any[] = [];
      for (const detail of costDetails) {
        const matchedLine = insertedLines?.find((l) => l.sort_order === detail.lineIndex);
        if (matchedLine && detail.costs.length > 0) {
          for (const cost of detail.costs) {
            allCosts.push({
              ...cost,
              budget_line_id: matchedLine.id,
            });
          }
        }
      }

      if (allCosts.length > 0) {
        const { error: costError } = await supabase
          .from("budget_line_costs")
          .insert(allCosts);

        if (costError) throw costError;
      }

      // 7. Update budget header totals
      const totalDirect = budgetLines.reduce((s, l) => s + (l.direct_cost_total || 0), 0);
      const totalIndirect = budgetLines.reduce((s, l) => s + (l.indirect_amount || 0), 0);
      const totalBudget = totalDirect + totalIndirect;

      const { error: updateError } = await supabase
        .from("budget_headers")
        .update({
          total_direct_cost: totalDirect,
          total_indirect_cost: totalIndirect,
          total_budget: totalBudget,
          expected_profit: 0, // Will be recalculated
        })
        .eq("id", budgetHeaderId);

      if (updateError) throw updateError;

      return { linesCount: budgetLines.length, costsCount: allCosts.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["budget-lines"] });
      queryClient.invalidateQueries({ queryKey: ["budget-headers"] });
      queryClient.invalidateQueries({ queryKey: ["budget-header"] });
      toast.success(
        `تم استيراد ${result.linesCount} بند و ${result.costsCount} عنصر تكلفة من المناقصة`
      );
    },
    onError: (err: any) => toast.error(err.message),
  });
}
