import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useProjectManagers, useStakeholderCompanies } from "@/hooks/useStakeholders";
import type { ProjectFormData } from "@/pages/projects/ProjectCreatePage";

interface Props {
  form: ProjectFormData;
  updateForm: (u: Partial<ProjectFormData>) => void;
}

export default function StepBasicInfo({ form, updateForm }: Props) {
  const { data: projectManagers = [] } = useProjectManagers();
  const { data: companies = [] } = useStakeholderCompanies();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">المعلومات الأساسية</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>كود المشروع</Label>
          <Input
            value={form.project_code}
            onChange={(e) => updateForm({ project_code: e.target.value })}
            placeholder="PRJ-2026-001"
            className="font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label>اسم المشروع (إنجليزي) *</Label>
          <Input
            value={form.project_name}
            onChange={(e) => updateForm({ project_name: e.target.value })}
            placeholder="Project Name"
          />
        </div>

        <div className="space-y-2">
          <Label>اسم المشروع (عربي)</Label>
          <Input
            value={form.name_ar}
            onChange={(e) => updateForm({ name_ar: e.target.value })}
            placeholder="اسم المشروع"
          />
        </div>

        <div className="space-y-2">
          <Label>العميل</Label>
          <Select value={form.client_id} onValueChange={(v) => updateForm({ client_id: v })}>
            <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>مدير المشروع</Label>
          <Select value={form.project_manager} onValueChange={(v) => updateForm({ project_manager: v })}>
            <SelectTrigger><SelectValue placeholder="اختر مدير المشروع" /></SelectTrigger>
            <SelectContent>
              {projectManagers.map((pm) => (
                <SelectItem key={pm.id} value={pm.name}>
                  {pm.name} — {pm.job_title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>نوع المشروع</Label>
          <Select value={form.project_type} onValueChange={(v) => updateForm({ project_type: v })}>
            <SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="construction">إنشاءات</SelectItem>
              <SelectItem value="fit_out">تشطيبات</SelectItem>
              <SelectItem value="infrastructure">بنية تحتية</SelectItem>
              <SelectItem value="maintenance">صيانة</SelectItem>
              <SelectItem value="design_build">تصميم وتنفيذ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>القطاع</Label>
          <Select value={form.sector} onValueChange={(v) => updateForm({ sector: v })}>
            <SelectTrigger><SelectValue placeholder="اختر القطاع" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="commercial">تجاري</SelectItem>
              <SelectItem value="residential">سكني</SelectItem>
              <SelectItem value="industrial">صناعي</SelectItem>
              <SelectItem value="government">حكومي</SelectItem>
              <SelectItem value="hospitality">ضيافة</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>الموقع / المنطقة</Label>
          <Input
            value={form.zone}
            onChange={(e) => updateForm({ zone: e.target.value })}
            placeholder="المدينة أو المنطقة"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>ملاحظات</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => updateForm({ notes: e.target.value })}
            placeholder="ملاحظات إضافية..."
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
