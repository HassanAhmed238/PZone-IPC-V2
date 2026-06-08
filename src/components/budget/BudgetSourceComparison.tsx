import { useState } from "react";
import { BudgetLine, useUpdateBudgetLine } from "@/hooks/useBudget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, AlertTriangle } from "lucide-react";

interface BudgetSourceComparisonProps {
  budgetHeaderId: string;
  lines: BudgetLine[];
  canEdit: boolean;
}

const SOURCE_LABELS = {
  boq: "BOQ العقد",
  remeasured: "إعادة القياس",
  drawings: "الرسومات",
  manual: "يدوي",
};

const SOURCE_COLORS = {
  boq: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  remeasured: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  drawings: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  manual: "bg-muted text-muted-foreground",
};

export default function BudgetSourceComparison({
  budgetHeaderId,
  lines,
  canEdit,
}: BudgetSourceComparisonProps) {
  const updateLine = useUpdateBudgetLine();

  const calculateVariance = (line: BudgetLine) => {
    const values = [line.boq_qty, line.remeasured_qty, line.drawings_qty].filter(v => v > 0);
    if (values.length < 2) return 0;
    const max = Math.max(...values);
    const min = Math.min(...values);
    return min > 0 ? ((max - min) / min) * 100 : 0;
  };

  const handleSourceChange = (lineId: string, source: string) => {
    const line = lines.find(l => l.id === lineId);
    if (!line) return;

    let budgetQty = 0;
    switch (source) {
      case "boq":
        budgetQty = line.boq_qty;
        break;
      case "remeasured":
        budgetQty = line.remeasured_qty;
        break;
      case "drawings":
        budgetQty = line.drawings_qty;
        break;
      default:
        budgetQty = line.budget_qty;
    }

    updateLine.mutate({
      id: lineId,
      qty_source: source as any,
      budget_qty: budgetQty,
    });
  };

  const handleQtyChange = (lineId: string, field: string, value: number) => {
    updateLine.mutate({
      id: lineId,
      [field]: value,
    } as any);
  };

  return (
    <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/30">
        <h3 className="font-semibold text-foreground">مقارنة مصادر الكميات</h3>
        <p className="text-sm text-muted-foreground mt-1">
          قارن الكميات من المصادر الثلاثة واختر المصدر المعتمد لكل بند
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">الكود</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">الوصف</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">الوحدة</th>
              <th className="text-center px-4 py-3 font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20">
                BOQ العقد
              </th>
              <th className="text-center px-4 py-3 font-medium text-teal-600 bg-teal-50 dark:bg-teal-900/20">
                إعادة القياس
              </th>
              <th className="text-center px-4 py-3 font-medium text-purple-600 bg-purple-50 dark:bg-purple-900/20">
                الرسومات
              </th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">الفرق %</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">المصدر المعتمد</th>
              <th className="text-center px-4 py-3 font-medium text-foreground bg-primary/10">
                الكمية المعتمدة ✓
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-muted-foreground">
                  لا توجد بنود — أضف بنود من ورقة العمل
                </td>
              </tr>
            ) : (
              lines.map((line) => {
                const variance = calculateVariance(line);
                return (
                  <tr key={line.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{line.cost_code}</td>
                    <td className="px-4 py-3">{line.description}</td>
                    <td className="px-4 py-3 text-muted-foreground">{line.unit}</td>
                    <td className="px-4 py-3 bg-blue-50/50 dark:bg-blue-900/10">
                      {canEdit ? (
                        <Input
                          type="number"
                          value={line.boq_qty || ""}
                          onChange={(e) => handleQtyChange(line.id, "boq_qty", parseFloat(e.target.value) || 0)}
                          className="w-24 text-center h-8"
                        />
                      ) : (
                        <span className="text-center block">{line.boq_qty}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 bg-teal-50/50 dark:bg-teal-900/10">
                      {canEdit ? (
                        <Input
                          type="number"
                          value={line.remeasured_qty || ""}
                          onChange={(e) => handleQtyChange(line.id, "remeasured_qty", parseFloat(e.target.value) || 0)}
                          className="w-24 text-center h-8"
                        />
                      ) : (
                        <span className="text-center block">{line.remeasured_qty}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 bg-purple-50/50 dark:bg-purple-900/10">
                      {canEdit ? (
                        <Input
                          type="number"
                          value={line.drawings_qty || ""}
                          onChange={(e) => handleQtyChange(line.id, "drawings_qty", parseFloat(e.target.value) || 0)}
                          className="w-24 text-center h-8"
                        />
                      ) : (
                        <span className="text-center block">{line.drawings_qty}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-medium ${
                        variance > 25 ? "text-destructive" : variance > 10 ? "text-amber-600" : "text-muted-foreground"
                      }`}>
                        {variance > 0 ? `+${variance.toFixed(1)}%` : "—"}
                      </span>
                      {variance > 25 && <AlertTriangle className="inline ml-1 text-destructive" size={14} />}
                    </td>
                    <td className="px-4 py-3">
                      {canEdit ? (
                        <Select
                          value={line.qty_source}
                          onValueChange={(v) => handleSourceChange(line.id, v)}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="boq">BOQ العقد</SelectItem>
                            <SelectItem value="remeasured">إعادة القياس</SelectItem>
                            <SelectItem value="drawings">الرسومات</SelectItem>
                            <SelectItem value="manual">يدوي</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={SOURCE_COLORS[line.qty_source]}>
                          {SOURCE_LABELS[line.qty_source]}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 bg-primary/5 text-center">
                      <span className="font-bold text-primary flex items-center justify-center gap-1">
                        <Check size={14} />
                        {line.budget_qty}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
