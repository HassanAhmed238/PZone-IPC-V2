import { useMemo } from "react";
import { useInvoices, Invoice } from "./useIPC";
import { useFinancialAnalytics, type ProjectFinancials, type AgingBucket, type MonthlyFinancialTrend } from "./useFinancialAnalytics";
import type { CollectionTransaction } from "./useFinancialSnapshot";

export interface CollectionRecord {
  id: string;
  zone: string | null;
  project_name: string;
  project_code: string;
  contract_value: number;
  ipc_no: string | null;
  approved_date: string | null;
  received_date: string | null;
  submitted_date: string | null;
  cumulative_gross_value: number;
  total_deduction: number;
  total_net_value: number;
  collections: number;
  collection_date: string | null;
  collection_ref: string | null;
  collection_notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function mapInvoiceToCollection(r: Invoice): CollectionRecord {
  return {
    id: r.id,
    zone: r.sector,
    project_name: r.project_name,
    project_code: r.project_code,
    contract_value: Number(r.contract_value) || 0,
    ipc_no: r.invoice_number,
    approved_date: r.approval_date,
    received_date: r.collection_date,
    submitted_date: r.submitted_date,
    cumulative_gross_value: Number(r.approved_total || r.work_total) || 0,
    total_deduction: Number(r.approved_deductions || r.total_deductions) || 0,
    total_net_value: Number(r.approved_net_total || r.net_total) || 0,
    collections: Number(r.total_collections) || 0,
    collection_date: r.collection_date,
    collection_ref: null,
    collection_notes: r.approval_notes,
    status: r.status,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

/** Fetch all invoices that have collections > 0 from invoices table */
export function useCollections() {
  const query = useInvoices();
  const mapped = useMemo(() => {
    return (query.data || [])
      .filter((inv) => (inv.total_collections || 0) > 0)
      .map(mapInvoiceToCollection);
  }, [query.data]);

  return {
    ...query,
    data: mapped,
  } as any;
}

/** All invoices — used to compute project-level summaries including non-collected */
export function useAllInvoicesForCollections() {
  const query = useInvoices();
  const mapped = useMemo(() => {
    return (query.data || []).map(mapInvoiceToCollection);
  }, [query.data]);

  return {
    ...query,
    data: mapped,
  } as any;
}

/**
 * Cumulative-safe collection analytics using the shared financial analytics layer.
 * Uses "latest IPC per project" pattern to avoid double-counting cumulative IPC values.
 */
export interface CollectionAnalytics {
  /** Per-project financials (cumulative-safe) */
  projects: ProjectFinancials[];
  /** Total collected across all projects */
  totalCollected: number;
  /** Total outstanding across all projects */
  totalOutstanding: number;
  /** Total approved net across all projects */
  totalApprovedNet: number;
  /** Overall collection rate (0-1) */
  collectionRate: number;
  /** Number of projects with any collections */
  projectsWithCollections: number;
  /** Aging buckets for outstanding amounts */
  aging: AgingBucket[];
  /** Ledger-backed monthly summary */
  monthly: MonthlyFinancialTrend[];
  /** Actual collection transaction rows, or legacy rows until migration is applied */
  transactions: CollectionTransaction[];
  /** Indicates whether collections came from new ledger tables or legacy invoice totals */
  sourceMode: "ledger" | "legacy";
  isLoading: boolean;
}

export function useCollectionAnalytics(): CollectionAnalytics {
  const { projects, portfolio, aging, monthlyTrend, collections, sourceMode, isLoading } = useFinancialAnalytics();

  const projectsWithCollections = useMemo(
    () => projects.filter((p) => p.total_collections > 0).length,
    [projects]
  );

  return {
    projects,
    totalCollected: portfolio.total_collections,
    totalOutstanding: portfolio.total_outstanding,
    totalApprovedNet: portfolio.total_approved_net,
    collectionRate: portfolio.overall_collection_rate,
    projectsWithCollections,
    aging,
    monthly: monthlyTrend,
    transactions: collections,
    sourceMode,
    isLoading,
  };
}
