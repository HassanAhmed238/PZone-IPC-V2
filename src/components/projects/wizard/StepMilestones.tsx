import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { ProjectFormData, MilestoneData } from "@/pages/projects/ProjectCreatePage";

interface Props {
  form: ProjectFormData;
  updateForm: (u: Partial<ProjectFormData>) => void;
}

const TEMPLATES = {
  four: [
    { name: "تجهيز الموقع", milestone_type: "date_based", invoice_pct: 15 },
    { name: "اكتمال الأساسات", milestone_type: "progress_based", invoice_pct: 30, trigger_progress: 30 },
    { name: "اكتمال الهيكل", milestone_type: "progress_based", invoice_pct: 30, trigger_progress: 65 },
    { name: "التسليم النهائي", milestone_type: "progress_based", invoice_pct: 25, trigger_progress: 100 },
  ],
  six: [
    { name: "تجهيز الموقع", milestone_type: "date_based", invoice_pct: 10 },
    { name: "أعمال الأساسات", milestone_type: "progress_based", invoice_pct: 20, trigger_progress: 20 },
    { name: "الهيكل الإنشائي", milestone_type: "progress_based", invoice_pct: 20, trigger_progress: 40 },
    { name: "الأعمال الميكانيكية والكهربائية", milestone_type: "progress_based", invoice_pct: 20, trigger_progress: 65 },
    { name: "التشطيبات", milestone_type: "progress_based", invoice_pct: 20, trigger_progress: 85 },
    { name: "التسليم النهائي", milestone_type: "progress_based", invoice_pct: 10, trigger_progress: 100 },
  ],
};

export default function StepMilestones({ form, updateForm }: Props) {
  const milestones = form.milestones;
  const contractValue = form.contract_value || 0;

  const setMilestones = (ms: MilestoneData[]) => updateForm({ milestones: ms });

  const addMilestone = () => {
    setMilestones([
      ...milestones,
      {
        name: "",
        milestone_type: "progress_based",
        trigger_progress: null,
        trigger_date: null,
        trigger_deliverable: null,
        invoice_amount: null,
        invoice_pct: null,
        planned_date: "",
        sort_order: milestones.length,
      },
    ]);
  };

  const removeMilestone = (i: number) => {
    setMilestones(milestones.filter((_, idx) => idx !== i));
  };

  const updateMilestone = (i: number, updates: Partial<MilestoneData>) => {
    const updated = [...milestones];
    updated[i] = { ...updated[i], ...updates };

    // Auto-calc amount from pct
    if (updates.invoice_pct !== undefined && contractValue) {
      updated[i].invoice_amount = (contractValue * (updates.invoice_pct || 0)) / 100;
    }
    if (updates.invoice_amount !== undefined && contractValue) {
      updated[i].invoice_pct = ((updates.invoice_amount || 0) / contractValue) * 100;
    }

    setMilestones(updated);
  };

  const applyTemplate = (key: "four" | "six") => {
    const template = TEMPLATES[key];
    setMilestones(
      template.map((t, i) => ({
        name: t.name,
        milestone_type: t.milestone_type,
        trigger_progress: t.trigger_progress || null,
        trigger_date: null,
        trigger_deliverable: null,
        invoice_pct: t.invoice_pct,
        invoice_amount: contractValue ? (contractValue * t.invoice_pct) / 100 : null,
        planned_date: "",
        sort_order: i,
      }))
    );
  };

  const totalAmount = milestones.reduce((s, m) => s + (m.invoice_amount || 0), 0);
  const totalPct = milestones.reduce((s, m) => s + (m.invoice_pct || 0), 0);
  const isValid = contractValue ? Math.abs(totalAmount - contractValue) < 1 : true;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">محطات الدفع</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => applyTemplate("four")}>
            قالب 4 محطات
          </Button>
          <Button size="sm" variant="outline" onClick={() => applyTemplate("six")}>
            قالب 6 محطات
          </Button>
        </div>
      </div>

      {milestones.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>لم يتم إضافة محطات دفع بعد</p>
          <Button variant="outline" onClick={addMilestone} className="mt-3 gap-2">
            <Plus size={16} />
            إضافة محطة
          </Button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right w-[180px]">المحطة</TableHead>
                  <TableHead className="text-right w-[120px]">النوع</TableHead>
                  <TableHead className="text-right w-[80px]">الشرط</TableHead>
                  <TableHead className="text-right w-[100px]">النسبة %</TableHead>
                  <TableHead className="text-right w-[120px]">المبلغ</TableHead>
                  <TableHead className="text-right w-[120px]">التاريخ المخطط</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {milestones.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Input
                        value={m.name}
                        onChange={(e) => updateMilestone(i, { name: e.target.value })}
                        placeholder="اسم المحطة"
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={m.milestone_type}
                        onValueChange={(v) => updateMilestone(i, { milestone_type: v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date_based">تاريخ</SelectItem>
                          <SelectItem value="progress_based">نسبة إنجاز</SelectItem>
                          <SelectItem value="deliverable_based">تسليم</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {m.milestone_type === "progress_based" ? (
                        <Input
                          type="number"
                          value={m.trigger_progress ?? ""}
                          onChange={(e) =>
                            updateMilestone(i, { trigger_progress: e.target.value ? Number(e.target.value) : null })
                          }
                          placeholder="%"
                          className="h-8 text-sm w-16"
                        />
                      ) : m.milestone_type === "date_based" ? (
                        <Input
                          type="date"
                          value={m.trigger_date || ""}
                          onChange={(e) => updateMilestone(i, { trigger_date: e.target.value })}
                          className="h-8 text-xs"
                        />
                      ) : (
                        <Input
                          value={m.trigger_deliverable || ""}
                          onChange={(e) => updateMilestone(i, { trigger_deliverable: e.target.value })}
                          placeholder="التسليم"
                          className="h-8 text-xs"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={m.invoice_pct ?? ""}
                        onChange={(e) =>
                          updateMilestone(i, { invoice_pct: e.target.value ? Number(e.target.value) : null })
                        }
                        className="h-8 text-sm w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={m.invoice_amount ?? ""}
                        onChange={(e) =>
                          updateMilestone(i, { invoice_amount: e.target.value ? Number(e.target.value) : null })
                        }
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={m.planned_date}
                        onChange={(e) => updateMilestone(i, { planned_date: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => removeMilestone(i)} className="h-8 w-8">
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={addMilestone} className="gap-2">
              <Plus size={14} />
              إضافة محطة
            </Button>

            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                المجموع: <strong>{totalPct.toFixed(1)}%</strong> — {totalAmount.toLocaleString()} {form.currency}
              </span>
              {contractValue > 0 && !isValid && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle size={12} />
                  لا يساوي قيمة العقد ({contractValue.toLocaleString()})
                </Badge>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
