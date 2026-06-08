import * as XLSX from "xlsx";
import { CostBreakdownItem } from "@/hooks/useTenders";

interface ExportOptions {
  tenderTitle: string;
  tenderNumber: string;
  items: CostBreakdownItem[];
}

export function exportBOQToExcel({ tenderTitle, tenderNumber, items }: ExportOptions) {
  const childrenOf = (parentId: string | null) =>
    items.filter((i) => i.parent_id === parentId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const getSubtotalCost = (parentId: string): number => {
    const children = childrenOf(parentId);
    return children.reduce((sum, c) => {
      if (childrenOf(c.id).length > 0) return sum + getSubtotalCost(c.id);
      return sum + (c.total_cost || 0);
    }, 0);
  };

  const getSubtotalSelling = (parentId: string): number => {
    const children = childrenOf(parentId);
    return children.reduce((sum, c) => {
      if (childrenOf(c.id).length > 0) return sum + getSubtotalSelling(c.id);
      return sum + (c.selling_total || c.total_cost || 0);
    }, 0);
  };

  const rootItems = childrenOf(null);

  // Build rows in Marakez format
  const rows: any[][] = [];

  // Header row
  rows.push([
    "Item No.",
    "Description",
    "Unit",
    "Qty",
    "Supply Rate",
    "Install Rate",
    "Unit Rate",
    "Total Cost",
    "Markup %",
    "Selling Rate",
    "Selling Total",
  ]);

  for (const section of rootItems) {
    const sectionCost = getSubtotalCost(section.id);
    const sectionSelling = getSubtotalSelling(section.id);

    // Section header row
    rows.push([
      "",
      section.name,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);

    const sectionChildren = childrenOf(section.id);

    for (const activity of sectionChildren) {
      const actChildren = childrenOf(activity.id);
      const isLeaf = actChildren.length === 0;

      if (isLeaf) {
        // Leaf item
        const supplyRate = (activity as any).supply_rate || 0;
        const installRate = (activity as any).install_rate || 0;
        const unitRate = activity.unit_rate || 0;
        const totalCost = activity.total_cost || 0;
        const markupPct = activity.markup_pct || 0;
        const sellingRate = activity.selling_rate || unitRate;
        const sellingTotal = activity.selling_total || totalCost;

        rows.push([
          (activity as any).item_no || "",
          activity.name,
          activity.unit || "",
          activity.quantity || 0,
          supplyRate,
          installRate,
          unitRate,
          totalCost,
          markupPct,
          sellingRate,
          sellingTotal,
        ]);
      } else {
        // Activity with children
        rows.push([
          "",
          `  ${activity.name}`,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ]);

        for (const item of actChildren) {
          const supplyRate = (item as any).supply_rate || 0;
          const installRate = (item as any).install_rate || 0;
          const unitRate = item.unit_rate || 0;
          const totalCost = item.total_cost || 0;
          const markupPct = item.markup_pct || 0;
          const sellingRate = item.selling_rate || unitRate;
          const sellingTotal = item.selling_total || totalCost;

          rows.push([
            (item as any).item_no || "",
            `    ${item.name}`,
            item.unit || "",
            item.quantity || 0,
            supplyRate,
            installRate,
            unitRate,
            totalCost,
            markupPct,
            sellingRate,
            sellingTotal,
          ]);
        }

        // Activity subtotal
        const actCost = getSubtotalCost(activity.id);
        const actSelling = getSubtotalSelling(activity.id);
        rows.push([
          "",
          `  Sub-Total: ${activity.name}`,
          "",
          "",
          "",
          "",
          "",
          actCost,
          "",
          "",
          actSelling,
        ]);
      }
    }

    // Section subtotal
    rows.push([
      "",
      `TOTAL: ${section.name}`,
      "",
      "",
      "",
      "",
      "",
      sectionCost,
      "",
      "",
      sectionSelling,
    ]);

    // Empty separator
    rows.push([]);
  }

  // Grand total
  const grandCost = rootItems.reduce((s, r) => s + getSubtotalCost(r.id), 0);
  const grandSelling = rootItems.reduce((s, r) => s + getSubtotalSelling(r.id), 0);
  rows.push([
    "",
    "GRAND TOTAL",
    "",
    "",
    "",
    "",
    "",
    grandCost,
    "",
    "",
    grandSelling,
  ]);

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws["!cols"] = [
    { wch: 10 },  // Item No
    { wch: 45 },  // Description
    { wch: 8 },   // Unit
    { wch: 10 },  // Qty
    { wch: 14 },  // Supply Rate
    { wch: 14 },  // Install Rate
    { wch: 14 },  // Unit Rate
    { wch: 16 },  // Total Cost
    { wch: 10 },  // Markup %
    { wch: 14 },  // Selling Rate
    { wch: 16 },  // Selling Total
  ];

  XLSX.utils.book_append_sheet(wb, ws, "BOQ");
  XLSX.writeFile(wb, `BOQ_${tenderNumber}_${tenderTitle.replace(/\s+/g, "_")}.xlsx`);
}
