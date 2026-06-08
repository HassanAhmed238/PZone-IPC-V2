import { useState } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useEmployees, useProjectManagers } from "@/hooks/useStakeholders";
import type { ProjectFormData, TeamMemberData } from "@/pages/projects/ProjectCreatePage";

interface Props {
  form: ProjectFormData;
  updateForm: (u: Partial<ProjectFormData>) => void;
}

const ROLES = [
  { value: "pm", label: "مدير المشروع" },
  { value: "deputy_pm", label: "نائب مدير المشروع" },
  { value: "site_engineer", label: "مهندس موقع" },
  { value: "cost_controller", label: "مراقب تكاليف" },
  { value: "procurement_officer", label: "مسؤول مشتريات" },
  { value: "qc_engineer", label: "مهندس جودة" },
  { value: "safety_officer", label: "مسؤول سلامة" },
  { value: "document_controller", label: "مراقب وثائق" },
  { value: "mep_coordinator", label: "MEP Coordinator" },
  { value: "surveyor", label: "مساح" },
  { value: "technical_office", label: "مكتب فني" },
  { value: "planner", label: "مخطط" },
];

const ACCESS_LEVELS = [
  { value: "full", label: "كامل" },
  { value: "read_only", label: "قراءة فقط" },
  { value: "limited", label: "محدود" },
];

export default function StepTeam({ form, updateForm }: Props) {
  const team = form.team;
  const { data: employees = [] } = useEmployees();
  const [memberSearch, setMemberSearch] = useState("");

  const filteredEmployees = memberSearch
    ? employees.filter(
        (e) =>
          e.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
          e.job_title.toLowerCase().includes(memberSearch.toLowerCase()) ||
          e.code.includes(memberSearch)
      )
    : employees;

  const setTeam = (t: TeamMemberData[]) => updateForm({ team: t });

  const addMember = () => {
    setTeam([
      ...team,
      {
        user_id: "",
        role_in_project: "site_engineer",
        access_level: "full",
        start_date: new Date().toISOString().split("T")[0],
      },
    ]);
  };

  const removeMember = (i: number) => {
    setTeam(team.filter((_, idx) => idx !== i));
  };

  const updateMember = (i: number, updates: Partial<TeamMemberData>) => {
    const updated = [...team];
    updated[i] = { ...updated[i], ...updates };
    setTeam(updated);
  };

  /** Resolve name for display */
  const getMemberName = (userId: string) => {
    const e = employees.find((e) => e.id === userId);
    return e ? `${e.name} (${e.job_title})` : "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">فريق العمل</h2>
        <Button variant="outline" size="sm" onClick={addMember} className="gap-2">
          <Plus size={14} />
          إضافة عضو
        </Button>
      </div>

      {team.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>لم يتم تعيين أعضاء فريق بعد</p>
          <p className="text-sm mt-1">يمكنك إضافة أعضاء الآن أو لاحقاً من صفحة المشروع</p>
          <Button variant="outline" onClick={addMember} className="mt-3 gap-2">
            <Plus size={16} />
            إضافة عضو
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {team.map((member, i) => (
            <div
              key={i}
              className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 rounded-lg border bg-card"
            >
              <div className="space-y-1">
                <Label className="text-xs">العضو (من دليل الموظفين)</Label>
                <Select
                  value={member.user_id}
                  onValueChange={(v) => updateMember(i, { user_id: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="اختر من الموظفين">
                      {member.user_id ? getMemberName(member.user_id) : "اختر من الموظفين"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        placeholder="بحث بالاسم أو الكود..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    {filteredEmployees.slice(0, 30).map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{e.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {e.job_title} • {e.code}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                    {filteredEmployees.length === 0 && (
                      <div className="text-center py-3 text-xs text-muted-foreground">
                        لا يوجد نتائج
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">الدور</Label>
                <Select
                  value={member.role_in_project}
                  onValueChange={(v) => updateMember(i, { role_in_project: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">مستوى الوصول</Label>
                <Select
                  value={member.access_level}
                  onValueChange={(v) => updateMember(i, { access_level: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCESS_LEVELS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">تاريخ البدء</Label>
                <Input
                  type="date"
                  value={member.start_date}
                  onChange={(e) => updateMember(i, { start_date: e.target.value })}
                  className="h-9"
                />
              </div>

              <div className="flex items-end">
                <Button size="icon" variant="ghost" onClick={() => removeMember(i)} className="h-9 w-9">
                  <Trash2 size={14} className="text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
