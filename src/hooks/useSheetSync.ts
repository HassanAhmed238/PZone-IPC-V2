/**
 * React hook for syncing Google Sheet data to Supabase.
 * Provides progress tracking, error handling, and React Query invalidation.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  type SyncResult,
  type SheetConfig,
  MONTH_CONFIGS,
  discoverSheetConfigs,
  fetchMonthData,
  syncMonthToSupabase,
} from "@/lib/sheetSync";

export type MonthSyncStatus = "idle" | "fetching" | "syncing" | "done" | "error";

export interface MonthProgress {
  monthKey: string;
  label: string;
  status: MonthSyncStatus;
  result?: SyncResult;
  error?: string;
}

export interface SheetSyncState {
  isRunning: boolean;
  months: MonthProgress[];
  availableMonths: SheetConfig[];
  isLoadingMonths: boolean;
  monthLoadError?: string;
  completedCount: number;
  totalCount: number;
}

export function useSheetSync() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SheetSyncState>({
    isRunning: false,
    months: [],
    availableMonths: MONTH_CONFIGS,
    isLoadingMonths: false,
    completedCount: 0,
    totalCount: 0,
  });
  const abortRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadMonths = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      months: prev.isRunning ? prev.months : [],
      completedCount: prev.isRunning ? prev.completedCount : 0,
      totalCount: prev.isRunning ? prev.totalCount : 0,
      isLoadingMonths: true,
      monthLoadError: undefined,
    }));
    try {
      const availableMonths = await discoverSheetConfigs();
      setState((prev) => ({ ...prev, availableMonths, isLoadingMonths: false }));
      return availableMonths;
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        availableMonths: prev.availableMonths.length ? prev.availableMonths : MONTH_CONFIGS,
        isLoadingMonths: false,
        monthLoadError: err?.message || "Could not load sheet tabs",
      }));
      return MONTH_CONFIGS;
    }
  }, []);

  useEffect(() => {
    loadMonths();
  }, [loadMonths]);

  const startSync = useCallback(
    async (selectedMonths?: string[]) => {
      const configs = state.availableMonths.length ? state.availableMonths : MONTH_CONFIGS;
      const monthKeys = selectedMonths || configs.map((c) => c.key);
      abortRef.current = false;
      abortControllerRef.current = new AbortController();

      const initialMonths: MonthProgress[] = monthKeys.map((key) => ({
        monthKey: key,
        label: configs.find((c) => c.key === key)?.label || key,
        status: "idle",
      }));

      setState({
        isRunning: true,
        months: initialMonths,
        availableMonths: configs,
        isLoadingMonths: false,
        completedCount: 0,
        totalCount: monthKeys.length,
      });

      // Discover valid columns once
      let validColumns: Set<string> | undefined;

      for (let i = 0; i < monthKeys.length; i++) {
        if (abortRef.current) break;
        const monthKey = monthKeys[i];

        // Update status: fetching
        setState((prev) => ({
          ...prev,
          months: prev.months.map((m) =>
            m.monthKey === monthKey ? { ...m, status: "fetching" } : m,
          ),
        }));

        try {
          // Fetch CSV data from Google Sheet
          const invoices = await fetchMonthData(monthKey, configs, abortControllerRef.current.signal);

          if (abortRef.current) throw new Error("Sync aborted");

          if (invoices.length === 0) {
            setState((prev) => ({
              ...prev,
              completedCount: prev.completedCount + 1,
              months: prev.months.map((m) =>
                m.monthKey === monthKey
                  ? {
                      ...m,
                      status: "done",
                      result: {
                        monthKey,
                        label: configs.find((c) => c.key === monthKey)?.label || monthKey,
                        total: 0,
                        inserted: 0,
                        updated: 0,
                        collectionsInserted: 0,
                        collectionsUpdated: 0,
                        errors: [],
                      },
                    }
                  : m,
              ),
            }));
            continue;
          }

          // Update status: syncing
          setState((prev) => ({
            ...prev,
            months: prev.months.map((m) =>
              m.monthKey === monthKey ? { ...m, status: "syncing" } : m,
            ),
          }));

          // Sync to Supabase
          const result = await syncMonthToSupabase(
            supabase as any,
            monthKey,
            invoices,
            validColumns,
            configs,
            () => abortRef.current,
          );

          // Update status: done
          setState((prev) => ({
            ...prev,
            completedCount: prev.completedCount + 1,
            months: prev.months.map((m) =>
              m.monthKey === monthKey
                ? {
                    ...m,
                    status: result.errors.length > 0 ? "error" : "done",
                    result,
                    error: result.errors[0],
                  }
                : m,
            ),
          }));
        } catch (err: any) {
          const aborted = abortRef.current || err?.name === "AbortError" || /aborted/i.test(err?.message || "");
          setState((prev) => ({
            ...prev,
            completedCount: aborted ? prev.completedCount : prev.completedCount + 1,
            months: prev.months.map((m) =>
              m.monthKey === monthKey
                ? { ...m, status: "error", error: aborted ? "Aborted" : err?.message || "Unknown error" }
                : m,
            ),
          }));
          if (aborted) break;
        }
      }

      // Invalidate queries so the UI refreshes
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["collection_transactions"] });

      abortControllerRef.current = null;
      setState((prev) => ({ ...prev, isRunning: false }));
    },
    [queryClient, state.availableMonths],
  );

  const abort = useCallback(() => {
    abortRef.current = true;
    abortControllerRef.current?.abort();
  }, []);

  return {
    ...state,
    loadMonths,
    startSync,
    abort,
  };
}
