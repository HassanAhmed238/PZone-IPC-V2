import {
  useFinancialSnapshot,
  useMonthlyFinancialSummary,
  type AgingBucket,
  type FinancialSnapshot,
  type MonthlyFinancialSummary,
  type PortfolioFinancialSummary,
  type ProjectFinancialSummary,
} from "./useFinancialSnapshot";

export type ProjectFinancials = ProjectFinancialSummary & {
  total_collections: number;
  collection_efficiency: number;
};

export type PortfolioSummary = PortfolioFinancialSummary;
export type MonthlyFinancialTrend = MonthlyFinancialSummary;
export type { AgingBucket, FinancialSnapshot };

function withLegacyAliases(projects: ProjectFinancialSummary[]): ProjectFinancials[] {
  return projects.map((project) => ({
    ...project,
    total_collections: project.actual_collected,
    collection_efficiency: project.collection_efficiency,
  }));
}

export function useFinancialAnalytics() {
  const snapshot = useFinancialSnapshot();

  return {
    ...snapshot,
    projects: withLegacyAliases(snapshot.projects),
    monthlyTrend: snapshot.monthlyTrend,
  };
}

export function usePortfolioKPIs() {
  const { portfolio, isLoading } = useFinancialSnapshot();
  return { portfolio, isLoading };
}

export function useAgingAnalysis() {
  const { aging, isLoading } = useFinancialSnapshot();
  return { aging, isLoading };
}

export { useFinancialSnapshot, useMonthlyFinancialSummary };
