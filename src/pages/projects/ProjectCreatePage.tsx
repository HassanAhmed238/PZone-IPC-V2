import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, Building2, FileText, Import, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/stores/useAuthStore";
import { useCreateProject, useClients } from "@/hooks/useProjects";
import StepBasicInfo from "@/components/projects/wizard/StepBasicInfo";
import StepContract from "@/components/projects/wizard/StepContract";
import StepTenderImport from "@/components/projects/wizard/StepTenderImport";
import StepMilestones from "@/components/projects/wizard/StepMilestones";
import StepTeam from "@/components/projects/wizard/StepTeam";
import { toast } from "sonner";

const STEPS = [
  { key: "basic", label: "معلومات أساسية", icon: Building2 },
  { key: "contract", label: "تفاصيل العقد", icon: FileText },
  { key: "tender", label: "استيراد من مناقصة", icon: Import },
  { key: "milestones", label: "محطات الدفع", icon: Target },
  { key: "team", label: "فريق العمل", icon: Users },
];

export interface ProjectFormData {
  // Step 1
  project_code: string;
  project_name: string;
  name_ar: string;
  client_id: string;
  project_type: string;
  sector: string;
  zone: string;
  project_manager: string;
  notes: string;
  // Step 2
  contract_value: number | null;
  currency: string;
  contract_type: string;
  start_date: string;
  end_date: string;
  duration_days: number | null;
  retention_pct: number;
  advance_payment_pct: number;
  defects_liability_period: number;
  // Step 3
  tender_id: string | null;
  budget_header_id: string | null;
  // Step 4
  milestones: MilestoneData[];
  // Step 5
  team: TeamMemberData[];
}

export interface MilestoneData {
  name: string;
  milestone_type: string;
  trigger_progress: number | null;
  trigger_date: string | null;
  trigger_deliverable: string | null;
  invoice_amount: number | null;
  invoice_pct: number | null;
  planned_date: string;
  sort_order: number;
}

export interface TeamMemberData {
  user_id: string;
  role_in_project: string;
  access_level: string;
  start_date: string;
}

const generateCode = () => {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, "0");
  return `PRJ-${year}-${seq}`;
};

export default function ProjectCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createProject = useCreateProject();
  const [step, setStep] = useState(0);

  const [form, setForm] = useState<ProjectFormData>({
    project_code: generateCode(),
    project_name: "",
    name_ar: "",
    client_id: "",
    project_type: "",
    sector: "",
    zone: "",
    project_manager: "",
    notes: "",
    contract_value: null,
    currency: "EGP",
    contract_type: "lump_sum",
    start_date: "",
    end_date: "",
    duration_days: null,
    retention_pct: 10,
    advance_payment_pct: 0,
    defects_liability_period: 12,
    tender_id: null,
    budget_header_id: null,
    milestones: [],
    team: [],
  });

  const updateForm = (updates: Partial<ProjectFormData>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const canNext = () => {
    if (step === 0) return form.project_name.trim() !== "";
    return true;
  };

  const handleSubmit = async () => {
    if (!user) return;
    try {
      const projectData: any = {
        project_code: form.project_code,
        project_name: form.project_name,
        name_ar: form.name_ar || null,
        client_id: form.client_id || null,
        project_type: form.project_type || null,
        sector: form.sector || null,
        zone: form.zone || null,
        project_manager: form.project_manager || null,
        notes: form.notes || null,
        contract_value: form.contract_value,
        currency: form.currency,
        contract_type: form.contract_type,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        duration_days: form.duration_days,
        retention_pct: form.retention_pct,
        tender_id: form.tender_id,
        budget_header_id: form.budget_header_id,
        created_by: user.id,
        project_status: "setup",
      };

      const result = await createProject.mutateAsync(projectData);
      
      // Insert milestones if any
      if (form.milestones.length > 0 && result?.id) {
        const { supabase } = await import("@/integrations/supabase/client");
        const milestonesData = form.milestones.map((m, i) => ({
          project_id: result.id,
          milestone_code: `MS-${String(i + 1).padStart(2, "0")}`,
          name: m.name,
          milestone_type: m.milestone_type as "date_based" | "progress_based" | "deliverable_based",
          trigger_progress: m.trigger_progress,
          trigger_date: m.trigger_date,
          trigger_deliverable: m.trigger_deliverable,
          invoice_amount: m.invoice_amount,
          invoice_pct: m.invoice_pct,
          retention_amount: m.invoice_amount ? m.invoice_amount * (form.retention_pct / 100) : null,
          net_payable: m.invoice_amount
            ? m.invoice_amount - (m.invoice_amount * (form.retention_pct / 100))
            : null,
          planned_date: m.planned_date || null,
          sort_order: i,
          status: "pending" as const,
        }));
        await supabase.from("project_milestones").insert(milestonesData);
      }

      // Insert team if any
      if (form.team.length > 0 && result?.id) {
        const { supabase } = await import("@/integrations/supabase/client");
        const teamData = form.team.map((t) => ({
          project_id: result.id,
          user_id: t.user_id,
          role_in_project: t.role_in_project as any,
          access_level: t.access_level as "full" | "read_only" | "limited",
          start_date: t.start_date || null,
          is_active: true,
        }));
        await supabase.from("project_team").insert(teamData);
      }

      navigate(`/projects/${result.id}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">إنشاء مشروع جديد</h1>
        <p className="text-muted-foreground text-sm">أكمل الخطوات التالية لإنشاء المشروع</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={s.key} className="flex items-center flex-1">
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isDone
                    ? "bg-primary/20 text-primary cursor-pointer"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? <Check size={16} /> : <Icon size={16} />}
                <span className="hidden md:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${i < step ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && <StepBasicInfo form={form} updateForm={updateForm} />}
              {step === 1 && <StepContract form={form} updateForm={updateForm} />}
              {step === 2 && <StepTenderImport form={form} updateForm={updateForm} />}
              {step === 3 && <StepMilestones form={form} updateForm={updateForm} />}
              {step === 4 && <StepTeam form={form} updateForm={updateForm} />}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => (step === 0 ? navigate("/projects") : setStep(step - 1))}
          className="gap-2"
        >
          <ArrowRight size={16} />
          {step === 0 ? "العودة للقائمة" : "السابق"}
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="gap-2">
            التالي
            <ArrowLeft size={16} />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={createProject.isPending} className="gap-2">
            <Check size={16} />
            {createProject.isPending ? "جاري الإنشاء..." : "إنشاء المشروع"}
          </Button>
        )}
      </div>
    </div>
  );
}
