import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, DollarSign, Calendar, Target } from "lucide-react";

interface Props {
  project: any;
}

export default function ProjectOverviewTab({ project }: Props) {
  const { data: milestones = [] } = useQuery({
    queryKey: ["project-milestones", project.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_milestones")
        .select("*")
        .eq("project_id", project.id)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: budget } = useQuery({
    queryKey: ["project-budget-summary", project.budget_header_id],
    queryFn: async () => {
      if (!project.budget_header_id) return null;
      const { data, error } = await supabase
        .from("budget_headers")
        .select("total_budget, total_direct_cost, total_indirect_cost")
        .eq("id", project.budget_header_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!project.budget_header_id,
  });

  const contractValue = project.contract_value || 0;
  const budgetTotal = budget?.total_budget || 0;
  const margin = contractValue > 0 ? ((contractValue - budgetTotal) / contractValue) * 100 : 0;
  const triggeredMs = milestones.filter((m: any) => m.status !== "pending").length;

  const endDate = project.end_date ? new Date(project.end_date) : null;
  const daysRemaining = endDate
    ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6 mt-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">نسبة الإنجاز</p>
                <p className="text-2xl font-bold">{(project.completion_pct || 0).toFixed(0)}%</p>
              </div>
              <TrendingUp size={20} className="text-primary" />
            </div>
            <Progress value={project.completion_pct || 0} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">الميزانية المستهلكة</p>
                <p className="text-2xl font-bold">
                  {budgetTotal > 0
                    ? `${((budgetTotal / contractValue) * 100).toFixed(0)}%`
                    : "—"}
                </p>
              </div>
              <DollarSign size={20} className="text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">هامش الربح المتوقع</p>
                <p className={`text-2xl font-bold ${margin < 0 ? "text-destructive" : ""}`}>
                  {contractValue > 0 ? `${margin.toFixed(1)}%` : "—"}
                </p>
              </div>
              <TrendingUp size={20} className={margin < 0 ? "text-destructive" : "text-primary"} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">الأيام المتبقية</p>
                <p className="text-2xl font-bold">
                  {daysRemaining !== null ? (daysRemaining > 0 ? daysRemaining : "متأخر") : "—"}
                </p>
              </div>
              <Calendar size={20} className="text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Milestones Summary */}
      {milestones.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target size={16} />
              محطات الدفع ({triggeredMs}/{milestones.length} مكتملة)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {milestones.slice(0, 5).map((ms: any) => (
                <div key={ms.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>{ms.milestone_code}</span>
                    <span className="text-muted-foreground">{ms.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {ms.invoice_amount && (
                      <span className="font-mono text-xs">
                        {Number(ms.invoice_amount).toLocaleString()}
                      </span>
                    )}
                    <Badge
                      className={
                        ms.status === "paid"
                          ? "bg-green-500/20 text-green-400"
                          : ms.status === "invoiced"
                          ? "bg-blue-500/20 text-blue-400"
                          : ms.status === "triggered"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {ms.status === "paid" ? "مدفوع" : ms.status === "invoiced" ? "مفوتر" : ms.status === "triggered" ? "محقق" : "معلق"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
