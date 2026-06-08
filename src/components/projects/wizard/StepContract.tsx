import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { ProjectFormData } from "@/pages/projects/ProjectCreatePage";

interface Props {
  form: ProjectFormData;
  updateForm: (u: Partial<ProjectFormData>) => void;
}

export default function StepContract({ form, updateForm }: Props) {
  // Auto-calculate duration
  useEffect(() => {
    if (form.start_date && form.end_date) {
      const diff = Math.ceil(
        (new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / (1000 * 60 * 60 * 24)
      );
      updateForm({ duration_days: diff > 0 ? diff : null });
    }
  }, [form.start_date, form.end_date]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">تفاصيل العقد</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>قيمة العقد</Label>
          <Input
            type="number"
            value={form.contract_value ?? ""}
            onChange={(e) => updateForm({ contract_value: e.target.value ? Number(e.target.value) : null })}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label>العملة</Label>
          <Select value={form.currency} onValueChange={(v) => updateForm({ currency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EGP">جنيه مصري (EGP)</SelectItem>
              <SelectItem value="AED">درهم إماراتي (AED)</SelectItem>
              <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>نوع العقد</Label>
          <Select value={form.contract_type} onValueChange={(v) => updateForm({ contract_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lump_sum">مقطوعية (Lump Sum)</SelectItem>
              <SelectItem value="remeasured">إعادة قياس (Remeasured)</SelectItem>
              <SelectItem value="cost_plus">تكلفة + ربح (Cost Plus)</SelectItem>
              <SelectItem value="design_build">تصميم وتنفيذ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>المدة (أيام)</Label>
          <Input
            type="number"
            value={form.duration_days ?? ""}
            onChange={(e) => updateForm({ duration_days: e.target.value ? Number(e.target.value) : null })}
            placeholder="عدد الأيام"
          />
        </div>

        <div className="space-y-2">
          <Label>تاريخ البداية</Label>
          <Input
            type="date"
            value={form.start_date}
            onChange={(e) => updateForm({ start_date: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>تاريخ الانتهاء</Label>
          <Input
            type="date"
            value={form.end_date}
            onChange={(e) => updateForm({ end_date: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>نسبة الاستقطاع (%)</Label>
          <Input
            type="number"
            value={form.retention_pct}
            onChange={(e) => updateForm({ retention_pct: Number(e.target.value) })}
          />
        </div>

        <div className="space-y-2">
          <Label>نسبة الدفعة المقدمة (%)</Label>
          <Input
            type="number"
            value={form.advance_payment_pct}
            onChange={(e) => updateForm({ advance_payment_pct: Number(e.target.value) })}
          />
        </div>

        <div className="space-y-2">
          <Label>فترة ضمان العيوب (شهور)</Label>
          <Input
            type="number"
            value={form.defects_liability_period}
            onChange={(e) => updateForm({ defects_liability_period: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}
