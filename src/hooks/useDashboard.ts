import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialSnapshot } from "./useFinancialSnapshot";

export interface DashboardMetrics {
  totalProjects: number;
  totalContractValue: number;
  totalAdvancedPayment: number;
  activeProjects: number;
  delayedProjects: number;
  completedProjects: number;
  atRiskProjects: number;
  totalSubmitted: number;
  totalApproved: number;
  totalApprovedNet: number;
  totalCollections: number;
  totalForecastCashIn: number;
  totalCashOut: number;
  totalForecastCashOut: number;
  totalOutstanding: number;
  collectionRate: number;
  netActualCash: number;
  netForecastCash: number;
  statusData: { name: string; value: number; color: string }[];
  recentProjects: any[];
  revenueData: { month: string; submitted: number; approved: number; collected: number; forecast: number }[];
  cashFlowData: { month: string; cashIn: number; cashOut: number; forecastIn: number; forecastOut: number; netForecast: number }[];
  topRisks: { severity: string; message: string; project_code: string; value?: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  Active: "hsl(178, 55%, 35%)",
  Delayed: "hsl(0, 72%, 50%)",
  Completed: "hsl(210, 60%, 55%)",
  Stopped: "hsl(25, 90%, 55%)",
};

function normalizeProjectStatus(status: string | null | undefined) {
  const value = (status || "").toLowerCase();
  if (value.includes("delay") || value.includes("متأخر")) return "Delayed";
  if (value.includes("complete") || value.includes("منتهي") || value.includes("مكتمل")) return "Completed";
  if (value.includes("stop") || value.includes("hold") || value.includes("متوقف")) return "Stopped";
  return "Active";
}

export function useDashboard() {
  const projectQuery = useQuery({
    queryKey: ["dashboard-projects"],
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ongoing_projects")
        .select("id, project_name, project_status, contract_value, advanced_payment, project_manager, completion_pct, overall_progress, created_at");
      if (error) throw error;
      return data || [];
    },
  });

  const snapshot = useFinancialSnapshot();

  const metrics = useMemo((): DashboardMetrics | null => {
    const projects = projectQuery.data;
    if (!projects) return null;

    let activeProjects = 0;
    let delayedProjects = 0;
    let completedProjects = 0;
    let atRiskProjects = 0;
    let totalAdvancedPayment = 0;

    projects.forEach((project) => {
      totalAdvancedPayment += Number(project.advanced_payment) || 0;
      const status = normalizeProjectStatus(project.project_status);
      if (status === "Active") activeProjects++;
      else if (status === "Delayed") delayedProjects++;
      else if (status === "Completed") completedProjects++;
      else atRiskProjects++;
    });

    const statusData = [
      { name: "Active", value: activeProjects, color: STATUS_COLORS.Active },
      { name: "Delayed", value: delayedProjects, color: STATUS_COLORS.Delayed },
      { name: "Completed", value: completedProjects, color: STATUS_COLORS.Completed },
      { name: "Stopped", value: atRiskProjects, color: STATUS_COLORS.Stopped },
    ].filter((item) => item.value > 0);

    const recentProjects = [...projects]
      .sort((a, b) => (Number(b.contract_value) || 0) - (Number(a.contract_value) || 0))
      .slice(0, 5)
      .map((project) => ({
        name: project.project_name || "Unnamed Project",
        pm: project.project_manager || "Unassigned",
        progress: Number(project.overall_progress ?? project.completion_pct ?? 0) || 0,
        status: normalizeProjectStatus(project.project_status),
        value: Number(project.contract_value) || 0,
      }));

    const revenueData = snapshot.monthly.map((month) => ({
      month: month.month,
      submitted: Number((month.submitted / 1_000_000).toFixed(2)),
      approved: Number((month.approved / 1_000_000).toFixed(2)),
      collected: Number((month.actualCollected / 1_000_000).toFixed(2)),
      forecast: Number((month.forecastCashIn / 1_000_000).toFixed(2)),
    }));

    const cashFlowData = snapshot.monthly.map((month) => ({
      month: month.month,
      cashIn: Number((month.actualCollected / 1_000_000).toFixed(2)),
      cashOut: Number((month.actualCashOut / 1_000_000).toFixed(2)),
      forecastIn: Number((month.forecastCashIn / 1_000_000).toFixed(2)),
      forecastOut: Number((month.forecastCashOut / 1_000_000).toFixed(2)),
      netForecast: Number((month.netForecast / 1_000_000).toFixed(2)),
    }));

    return {
      totalProjects: snapshot.portfolio.project_count || projects.length,
      totalContractValue: snapshot.portfolio.total_contract_value,
      totalAdvancedPayment,
      activeProjects,
      delayedProjects,
      completedProjects,
      atRiskProjects,
      totalSubmitted: snapshot.portfolio.total_submitted,
      totalApproved: snapshot.portfolio.total_approved,
      totalApprovedNet: snapshot.portfolio.total_approved_net,
      totalCollections: snapshot.portfolio.total_collections,
      totalForecastCashIn: snapshot.portfolio.total_forecast_cash_in,
      totalCashOut: snapshot.portfolio.total_cash_out,
      totalForecastCashOut: snapshot.portfolio.total_forecast_cash_out,
      totalOutstanding: snapshot.portfolio.total_outstanding,
      collectionRate: snapshot.portfolio.overall_collection_rate,
      netActualCash: snapshot.portfolio.net_actual_cash,
      netForecastCash: snapshot.portfolio.net_forecast_cash,
      statusData,
      recentProjects,
      revenueData,
      cashFlowData,
      topRisks: snapshot.risks.slice(0, 8),
    };
  }, [projectQuery.data, snapshot]);

  return {
    data: metrics,
    isLoading: projectQuery.isLoading || snapshot.isLoading,
    error: projectQuery.error || snapshot.error,
  };
}
