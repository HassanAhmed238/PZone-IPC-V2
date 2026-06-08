import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useUpdateProject } from "@/hooks/useProjects";
import { Save } from "lucide-react";

interface Props {
  project: any;
}

export default function ProjectSettingsTab({ project }: Props) {
  const updateProject = useUpdateProject();
  const [status, setStatus] = useState(project.project_status || "setup");
  const [contractValue, setContractValue] = useState(project.contract_value || "");
  const [retentionPct, setRetentionPct] = useState(project.retention_pct || 10);
  const [advancePct, setAdvancePct] = useState(project.advance_payment_pct || 0);

  const handleSave = () => {
    updateProject.mutate({
      id: project.id,
      project_status: status,
      contract_value: contractValue ? Number(contractValue) : null,
      retention_pct: retentionPct,
    });
  };

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">إعدادات المشروع</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>حالة المشروع</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="setup">إعداد</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="on_hold">متوقف</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>قيمة العقد</Label>
              <Input
                type="number"
                value={contractValue}
                onChange={(e) => setContractValue(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>نسبة الاستقطاع (%)</Label>
              <Input
                type="number"
                value={retentionPct}
                onChange={(e) => setRetentionPct(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>نسبة الدفعة المقدمة (%)</Label>
              <Input
                type="number"
                value={advancePct}
                onChange={(e) => setAdvancePct(Number(e.target.value))}
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={updateProject.isPending} className="gap-2">
            <Save size={16} />
            {updateProject.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
