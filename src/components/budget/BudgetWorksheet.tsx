import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BudgetLine,
  BudgetLineCost,
  useCreateBudgetLine,
  useUpdateBudgetLine,
  useDeleteBudgetLine,
  useBudgetLineCosts,
  useUpsertBudgetLineCost,
} from "@/hooks/useBudget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Package,
  Users,
  Truck,
  Hammer,
} from "lucide-react";

interface BudgetWorksheetProps {
  budgetHeaderId: string;
  lines: BudgetLine[];
  canEdit: boolean;
  projectId: string;
}

const COST_TYPE_CONFIG = {
  material: { label: "مواد", icon: Package, color: "border-l-red-500" },
  labor: { label: "عمالة", icon: Users, color: "border-l-amber-500" },
  equipment: { label: "معدات", icon: Truck, color: "border-l-blue-500" },
  subcontract: { label: "مقاول باطن", icon: Hammer, color: "border-l-purple-500" },
};

const DISCIPLINES = ["Electrical", "Civil", "HVAC", "Mechanical", "Plumbing", "Fire Fighting"];

export default function BudgetWorksheet({
  budgetHeaderId,
  lines,
  canEdit,
  projectId,
}: BudgetWorksheetProps) {
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const [newLine, setNewLine] = useState({
    discipline: "",
    activity: "",
    cost_code: "",
    description: "",
    unit: "",
  });

  const createLine = useCreateBudgetLine();
  const updateLine = useUpdateBudgetLine();
  const deleteLine = useDeleteBudgetLine();

  const toggleExpand = (lineId: string) => {
    setExpandedLines((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) {
        next.delete(lineId);
      } else {
        next.add(lineId);
      }
      return next;
    });
  };

  const handleAddLine = () => {
    if (!newLine.cost_code || !newLine.description) return;
    createLine.mutate({
      budget_header_id: budgetHeaderId,
      project_id: projectId,
      ...newLine,
      sort_order: lines.length,
    });
    setNewLine({ discipline: "", activity: "", cost_code: "", description: "", unit: "" });
  };

  const handleDeleteLine = (id: string) => {
    deleteLine.mutate({ id, budgetHeaderId });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-EG", {
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  // Group lines by discipline
  const groupedLines = lines.reduce((acc, line) => {
    const discipline = line.discipline || "غير مصنف";
    if (!acc[discipline]) acc[discipline] = [];
    acc[discipline].push(line);
    return acc;
  }, {} as Record<string, BudgetLine[]>);

  const totalDirect = lines.reduce((sum, l) => sum + (l.direct_cost_total || 0), 0);
  const totalIndirect = lines.reduce((sum, l) => sum + (l.indirect_amount || 0), 0);
  const grandTotal = totalDirect + totalIndirect;

  return (
    <div className="space-y-4">
      {/* Add New Line */}
      {canEdit && (
        <div className="bg-card rounded-xl p-4 border border-border shadow-card">
          <h4 className="font-medium text-foreground mb-3">إضافة بند جديد</h4>
          <div className="grid grid-cols-6 gap-3">
            <Select
              value={newLine.discipline}
              onValueChange={(v) => setNewLine((p) => ({ ...p, discipline: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="القسم" />
              </SelectTrigger>
              <SelectContent>
                {DISCIPLINES.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="النشاط"
              value={newLine.activity}
              onChange={(e) => setNewLine((p) => ({ ...p, activity: e.target.value }))}
            />
            <Input
              placeholder="الكود"
              value={newLine.cost_code}
              onChange={(e) => setNewLine((p) => ({ ...p, cost_code: e.target.value }))}
            />
            <Input
              placeholder="الوصف"
              value={newLine.description}
              onChange={(e) => setNewLine((p) => ({ ...p, description: e.target.value }))}
              className="col-span-2"
            />
            <div className="flex gap-2">
              <Input
                placeholder="الوحدة"
                value={newLine.unit}
                onChange={(e) => setNewLine((p) => ({ ...p, unit: e.target.value }))}
              />
              <Button onClick={handleAddLine} disabled={createLine.isPending}>
                <Plus size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lines by Discipline */}
      <div className="space-y-4">
        {Object.entries(groupedLines).map(([discipline, disciplineLines]) => {
          const disciplineTotal = disciplineLines.reduce((sum, l) => sum + (l.line_total || 0), 0);
          return (
            <div key={discipline} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="font-semibold text-foreground">{discipline}</span>
                <span className="text-sm text-muted-foreground">
                  إجمالي: <span className="font-bold text-foreground">{formatCurrency(disciplineTotal)} EGP</span>
                </span>
              </div>

              <div className="divide-y divide-border">
                {disciplineLines.map((line) => (
                  <BudgetLineRow
                    key={line.id}
                    line={line}
                    isExpanded={expandedLines.has(line.id)}
                    onToggle={() => toggleExpand(line.id)}
                    canEdit={canEdit}
                    onDelete={() => handleDeleteLine(line.id)}
                    onUpdate={(updates) => updateLine.mutate({ id: line.id, ...updates })}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grand Total Summary */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-card">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground uppercase">Direct Cost</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(totalDirect)} EGP</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Indirect Cost</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(totalIndirect)} EGP</p>
          </div>
          <div className="col-span-2 bg-primary/10 rounded-lg p-3">
            <p className="text-xs text-primary uppercase">TOTAL BUDGET</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(grandTotal)} EGP</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BudgetLineRowProps {
  line: BudgetLine;
  isExpanded: boolean;
  onToggle: () => void;
  canEdit: boolean;
  onDelete: () => void;
  onUpdate: (updates: Partial<BudgetLine>) => void;
}

function BudgetLineRow({ line, isExpanded, onToggle, canEdit, onDelete, onUpdate }: BudgetLineRowProps) {
  const { data: costs } = useBudgetLineCosts(isExpanded ? line.id : undefined);
  const upsertCost = useUpsertBudgetLineCost();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-EG", { maximumFractionDigits: 0 }).format(value || 0);
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="px-4 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </Button>
        </CollapsibleTrigger>

        <div className="flex-1 grid grid-cols-8 gap-4 items-center text-sm">
          <span className="font-mono text-xs text-muted-foreground">{line.cost_code}</span>
          <span className="col-span-2">{line.description}</span>
          <span className="text-muted-foreground">{line.activity}</span>
          <span className="text-center">{line.unit}</span>
          <span className="text-center font-medium">{line.budget_qty}</span>
          <span className="text-right font-medium">{formatCurrency(line.direct_cost_total)}</span>
          <span className="text-right font-bold text-primary">{formatCurrency(line.line_total)}</span>
        </div>

        {canEdit && (
          <Button variant="ghost" size="icon" onClick={onDelete} className="h-6 w-6 text-destructive hover:text-destructive">
            <Trash2 size={14} />
          </Button>
        )}
      </div>

      <CollapsibleContent>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-muted/20 px-4 py-4 border-t border-border"
            >
              <CostBreakdownTable
                lineId={line.id}
                costs={costs || []}
                canEdit={canEdit}
                budgetQty={line.budget_qty}
                indirectPct={line.indirect_pct}
                onIndirectChange={(pct) => onUpdate({ indirect_pct: pct })}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface CostBreakdownTableProps {
  lineId: string;
  costs: BudgetLineCost[];
  canEdit: boolean;
  budgetQty: number;
  indirectPct: number;
  onIndirectChange: (pct: number) => void;
}

function CostBreakdownTable({ lineId, costs, canEdit, budgetQty, indirectPct, onIndirectChange }: CostBreakdownTableProps) {
  const upsertCost = useUpsertBudgetLineCost();
  const [newCost, setNewCost] = useState({
    cost_type: "material" as const,
    description: "",
    unit: "",
    qty: 0,
    unit_rate: 0,
  });

  const handleAddCost = () => {
    if (!newCost.description) return;
    upsertCost.mutate({
      budget_line_id: lineId,
      ...newCost,
      amount: newCost.qty * newCost.unit_rate,
    });
    setNewCost({ cost_type: "material", description: "", unit: "", qty: 0, unit_rate: 0 });
  };

  const directTotal = costs.reduce((sum, c) => sum + (c.amount || 0), 0);
  const indirectAmount = directTotal * (indirectPct / 100);

  return (
    <div className="space-y-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground uppercase">
            <th className="text-left py-2 w-28">النوع</th>
            <th className="text-left py-2">الوصف</th>
            <th className="text-center py-2 w-20">الوحدة</th>
            <th className="text-center py-2 w-20">الكمية</th>
            <th className="text-center py-2 w-24">السعر</th>
            <th className="text-right py-2 w-28">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {costs.map((cost) => {
            const config = COST_TYPE_CONFIG[cost.cost_type];
            const Icon = config.icon;
            return (
              <tr key={cost.id} className={`border-l-4 ${config.color}`}>
                <td className="py-2">
                  <span className="flex items-center gap-1 text-xs">
                    <Icon size={12} />
                    {config.label}
                  </span>
                </td>
                <td className="py-2">{cost.description}</td>
                <td className="py-2 text-center text-muted-foreground">{cost.unit}</td>
                <td className="py-2 text-center">{cost.qty}</td>
                <td className="py-2 text-center">{cost.unit_rate}</td>
                <td className="py-2 text-right font-medium">{cost.amount.toLocaleString()}</td>
              </tr>
            );
          })}

          {/* Add new cost row */}
          {canEdit && (
            <tr className="border-t border-dashed">
              <td className="py-2">
                <Select
                  value={newCost.cost_type}
                  onValueChange={(v) => setNewCost((p) => ({ ...p, cost_type: v as any }))}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="material">مواد</SelectItem>
                    <SelectItem value="labor">عمالة</SelectItem>
                    <SelectItem value="equipment">معدات</SelectItem>
                    <SelectItem value="subcontract">مقاول باطن</SelectItem>
                  </SelectContent>
                </Select>
              </td>
              <td className="py-2">
                <Input
                  placeholder="الوصف"
                  value={newCost.description}
                  onChange={(e) => setNewCost((p) => ({ ...p, description: e.target.value }))}
                  className="h-7 text-xs"
                />
              </td>
              <td className="py-2">
                <Input
                  placeholder="وحدة"
                  value={newCost.unit}
                  onChange={(e) => setNewCost((p) => ({ ...p, unit: e.target.value }))}
                  className="h-7 text-xs text-center"
                />
              </td>
              <td className="py-2">
                <Input
                  type="number"
                  value={newCost.qty || ""}
                  onChange={(e) => setNewCost((p) => ({ ...p, qty: parseFloat(e.target.value) || 0 }))}
                  className="h-7 text-xs text-center"
                />
              </td>
              <td className="py-2">
                <Input
                  type="number"
                  value={newCost.unit_rate || ""}
                  onChange={(e) => setNewCost((p) => ({ ...p, unit_rate: parseFloat(e.target.value) || 0 }))}
                  className="h-7 text-xs text-center"
                />
              </td>
              <td className="py-2">
                <Button size="sm" onClick={handleAddCost} className="h-7 text-xs w-full">
                  <Plus size={12} />
                </Button>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex items-center justify-end gap-6 pt-2 border-t border-border text-sm">
        <span className="text-muted-foreground">Direct: <strong>{directTotal.toLocaleString()}</strong></span>
        <span className="text-muted-foreground flex items-center gap-2">
          Indirect ({indirectPct}%):
          {canEdit ? (
            <Input
              type="number"
              value={indirectPct}
              onChange={(e) => onIndirectChange(parseFloat(e.target.value) || 0)}
              className="w-16 h-6 text-xs text-center"
            />
          ) : (
            <strong>{indirectAmount.toLocaleString()}</strong>
          )}
        </span>
        <span className="font-bold text-primary">
          Total: {(directTotal + indirectAmount).toLocaleString()} EGP
        </span>
      </div>
    </div>
  );
}
