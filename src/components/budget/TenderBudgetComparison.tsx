import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BudgetLine, BudgetHeader } from "@/hooks/useBudget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Download,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import * as XLSX from "xlsx";

interface TenderBudgetComparisonProps {
  budgetHeader: BudgetHeader;
  budgetLines: BudgetLine[];
}

interface TenderItem {
  id: string;
  item_no: string;
  name: string;
  description: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  total_cost: number;
  section: string;
}

export default function TenderBudgetComparison({
  budgetHeader,
  budgetLines,
}: TenderBudgetComparisonProps) {
  // Get tender items for this project's tender
  const { data: tenderItems, isLoading } = useQuery({
    queryKey: ["tender-items-for-budget", budgetHeader.project_id],
    queryFn: async () => {
      // First find a tender related to this project (won tender)
      const { data: tenders } = await supabase
        .from("tenders")
        .select("id")
        .eq("status", "won")
        .limit(1);

      if (!tenders?.length) return [];

      const tenderId = tenders[0].id;

      const { data, error } = await supabase
        .from("cost_breakdown_items")
        .select("*")
        .eq("tender_id", tenderId)
        .gt("level", 0)
        .order("sort_order");

      if (error) throw error;
      return data as TenderItem[];
    },
  });

  // Calculate comparison data
  const comparisonData = useMemo(() => {
    if (!tenderItems?.length || !budgetLines?.length) return [];

    // Group budget lines by discipline
    const budgetByDiscipline: Record<string, number> = {};
    budgetLines.forEach((line) => {
      const disc = line.discipline || "أخرى";
      budgetByDiscipline[disc] = (budgetByDiscipline[disc] || 0) + (line.line_total || 0);
    });

    // Group tender items by section
    const tenderBySection: Record<string, number> = {};
    tenderItems.forEach((item) => {
      const sec = item.section || "أخرى";
      tenderBySection[sec] = (tenderBySection[sec] || 0) + (item.total_cost || 0);
    });

    // Combine for chart
    const allKeys = new Set([...Object.keys(budgetByDiscipline), ...Object.keys(tenderBySection)]);
    return Array.from(allKeys).map((key) => ({
      name: key,
      tender: tenderBySection[key] || 0,
      budget: budgetByDiscipline[key] || 0,
      variance: (budgetByDiscipline[key] || 0) - (tenderBySection[key] || 0),
      variancePct:
        tenderBySection[key] > 0
          ? (((budgetByDiscipline[key] || 0) - tenderBySection[key]) / tenderBySection[key]) * 100
          : 0,
    }));
  }, [tenderItems, budgetLines]);

  // Calculate totals
  const totals = useMemo(() => {
    const tenderTotal = tenderItems?.reduce((sum, item) => sum + (item.total_cost || 0), 0) || 0;
    const budgetTotal = budgetLines?.reduce((sum, line) => sum + (line.line_total || 0), 0) || 0;
    const variance = budgetTotal - tenderTotal;
    const variancePct = tenderTotal > 0 ? (variance / tenderTotal) * 100 : 0;

    // Calculate margins
    const contractValue = budgetHeader?.project?.contract_value || budgetHeader.contract_value || 0;
    const tenderMargin = contractValue > 0 ? ((contractValue - tenderTotal) / contractValue) * 100 : 0;
    const budgetMargin = contractValue > 0 ? ((contractValue - budgetTotal) / contractValue) * 100 : 0;
    const marginChange = budgetMargin - tenderMargin;

    return {
      tenderTotal,
      budgetTotal,
      variance,
      variancePct,
      tenderMargin,
      budgetMargin,
      marginChange,
      contractValue,
    };
  }, [tenderItems, budgetLines, budgetHeader]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const exportToExcel = () => {
    const exportData = comparisonData.map((item) => ({
      "القسم / التخصص": item.name,
      "تقدير المناقصة": item.tender,
      "تكلفة الميزانية": item.budget,
      الفرق: item.variance,
      "نسبة الفرق %": item.variancePct.toFixed(1),
    }));

    // Add totals row
    exportData.push({
      "القسم / التخصص": "الإجمالي",
      "تقدير المناقصة": totals.tenderTotal,
      "تكلفة الميزانية": totals.budgetTotal,
      الفرق: totals.variance,
      "نسبة الفرق %": totals.variancePct.toFixed(1),
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tender vs Budget");
    XLSX.writeFile(wb, `tender_vs_budget_${budgetHeader.project?.project_code || "export"}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {totals.variance > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="text-amber-600 shrink-0" size={20} />
          <span className="text-amber-800 dark:text-amber-200">
            ⚠️ الميزانية أعلى من تقدير المناقصة بـ {totals.variancePct.toFixed(1)}% — هامش الربح
            انخفض من {totals.tenderMargin.toFixed(1)}% إلى {totals.budgetMargin.toFixed(1)}%
          </span>
        </div>
      )}

      {totals.variance < 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="text-emerald-600 shrink-0" size={20} />
          <span className="text-emerald-800 dark:text-emerald-200">
            ✅ الميزانية أقل من تقدير المناقصة بـ {Math.abs(totals.variancePct).toFixed(1)}% — هامش
            ربح إضافي متاح {Math.abs(totals.marginChange).toFixed(1)}%
          </span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-xs text-muted-foreground uppercase">تقدير المناقصة</p>
          <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(totals.tenderTotal)}</p>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-xs text-muted-foreground uppercase">تكلفة الميزانية</p>
          <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(totals.budgetTotal)}</p>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-xs text-muted-foreground uppercase">الفرق</p>
          <p
            className={`text-lg font-bold mt-1 flex items-center gap-1 ${
              totals.variance > 0 ? "text-red-600" : "text-emerald-600"
            }`}
          >
            {totals.variance > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {formatCurrency(Math.abs(totals.variance))}
          </p>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-xs text-muted-foreground uppercase">هامش المناقصة</p>
          <p className="text-lg font-bold text-foreground mt-1">{totals.tenderMargin.toFixed(1)}%</p>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-xs text-muted-foreground uppercase">هامش الميزانية</p>
          <p
            className={`text-lg font-bold mt-1 ${
              totals.budgetMargin >= 15
                ? "text-emerald-600"
                : totals.budgetMargin >= 5
                ? "text-amber-600"
                : "text-red-600"
            }`}
          >
            {totals.budgetMargin.toFixed(1)}%
          </p>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-xs text-muted-foreground uppercase">تغير الهامش</p>
          <p
            className={`text-lg font-bold mt-1 ${
              totals.marginChange >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {totals.marginChange >= 0 ? "+" : ""}
            {totals.marginChange.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <BarChart3 size={18} className="text-primary" />
            مقارنة حسب التخصص
          </h3>
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <Download size={14} className="mr-2" />
            تصدير Excel
          </Button>
        </div>

        {comparisonData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} className="text-xs" />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="tender" name="تقدير المناقصة" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="budget" name="تكلفة الميزانية" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            لا توجد بيانات كافية للمقارنة
          </div>
        )}
      </div>

      {/* Detailed Comparison Table */}
      <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                التخصص / القسم
              </th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                تقدير المناقصة
              </th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                تكلفة الميزانية
              </th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">الفرق</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">نسبة الفرق</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {comparisonData.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                  لا توجد بيانات للمقارنة
                </td>
              </tr>
            ) : (
              <>
                {comparisonData.map((item, index) => (
                  <tr
                    key={index}
                    className={`border-b border-border last:border-0 ${
                      item.variance > 0
                        ? "bg-amber-50/50 dark:bg-amber-900/10"
                        : item.variance < 0
                        ? "bg-emerald-50/50 dark:bg-emerald-900/10"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3">{formatCurrency(item.tender)}</td>
                    <td className="px-4 py-3">{formatCurrency(item.budget)}</td>
                    <td
                      className={`px-4 py-3 font-medium ${
                        item.variance > 0 ? "text-red-600" : item.variance < 0 ? "text-emerald-600" : ""
                      }`}
                    >
                      {item.variance > 0 ? "+" : ""}
                      {formatCurrency(item.variance)}
                    </td>
                    <td
                      className={`px-4 py-3 font-medium ${
                        Math.abs(item.variancePct) > 10 ? "text-red-600" : ""
                      }`}
                    >
                      {item.variancePct > 0 ? "+" : ""}
                      {item.variancePct.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3">
                      {item.variance > 0 ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          <TrendingUp size={12} className="mr-1" />
                          زيادة
                        </Badge>
                      ) : item.variance < 0 ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                          <TrendingDown size={12} className="mr-1" />
                          توفير
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          متطابق
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}

                {/* Totals Row */}
                <tr className="bg-muted/50 font-bold">
                  <td className="px-4 py-3">الإجمالي</td>
                  <td className="px-4 py-3">{formatCurrency(totals.tenderTotal)}</td>
                  <td className="px-4 py-3">{formatCurrency(totals.budgetTotal)}</td>
                  <td
                    className={`px-4 py-3 ${
                      totals.variance > 0 ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    {totals.variance > 0 ? "+" : ""}
                    {formatCurrency(totals.variance)}
                  </td>
                  <td
                    className={`px-4 py-3 ${
                      totals.variancePct > 0 ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    {totals.variancePct > 0 ? "+" : ""}
                    {totals.variancePct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3">—</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
