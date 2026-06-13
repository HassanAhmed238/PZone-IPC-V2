/**
 * useMonthlyOverrides
 *
 * Stores per-month display overrides for "submitted", "approved", and "collection"
 * in localStorage. These are instant display-layer overrides — the chart reflects
 * the new value immediately without waiting for a DB round-trip.
 *
 * Key format: `${field}::${monthKey}` e.g. "collection::2026-04"
 * "Reset" is simply clearing the key — the original Google Sheet value returns.
 */

import { useCallback, useState } from "react";
import type { MonthlyFinancialSummary } from "./useFinancialSnapshot";

export type OverrideField = "submitted" | "approved" | "collection";

const STORAGE_KEY = "pzone:monthly_overrides_v2";

type OverrideMap = Record<string, number>; // key = `${field}::${monthKey}`

function loadOverrides(): OverrideMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OverrideMap) : {};
  } catch {
    return {};
  }
}

function saveOverrides(map: OverrideMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota errors
  }
}

function overrideKey(field: OverrideField, monthKey: string) {
  return `${field}::${monthKey}`;
}

export function useMonthlyOverrides() {
  const [overrides, setOverrides] = useState<OverrideMap>(loadOverrides);

  const setOverride = useCallback((field: OverrideField, monthKey: string, value: number) => {
    setOverrides((prev) => {
      const next = { ...prev, [overrideKey(field, monthKey)]: value };
      saveOverrides(next);
      return next;
    });
  }, []);

  const clearOverride = useCallback((field: OverrideField, monthKey: string) => {
    setOverrides((prev) => {
      const key = overrideKey(field, monthKey);
      if (!(key in prev)) return prev; // nothing to remove
      const next = { ...prev };
      delete next[key];
      saveOverrides(next);
      return next;
    });
  }, []);

  /** Returns true when a field+month has a user override (Reset is meaningful) */
  const hasOverride = useCallback(
    (field: OverrideField, monthKey: string) =>
      overrideKey(field, monthKey) in overrides,
    [overrides],
  );

  /** Merge all overrides onto the monthly array before rendering */
  const applyOverrides = useCallback(
    (monthly: MonthlyFinancialSummary[]): MonthlyFinancialSummary[] => {
      if (Object.keys(overrides).length === 0) return monthly;

      return monthly.map((m) => {
        const submittedOv = overrides[overrideKey("submitted", m.monthKey)];
        const approvedOv  = overrides[overrideKey("approved",  m.monthKey)];
        const collectionOv = overrides[overrideKey("collection", m.monthKey)];

        if (submittedOv === undefined && approvedOv === undefined && collectionOv === undefined) {
          return m;
        }

        return {
          ...m,
          submitted:      submittedOv   !== undefined ? submittedOv   : m.submitted,
          approved:       approvedOv    !== undefined ? approvedOv    : m.approved,
          actualCollected: collectionOv !== undefined ? collectionOv  : m.actualCollected,
        };
      });
    },
    [overrides],
  );

  return { overrides, setOverride, clearOverride, hasOverride, applyOverrides };
}

/** Encode the current overrides map into a URL-safe base64 string for sharing */
export function encodeOverridesParam(overrides: Record<string, number>): string | null {
  if (Object.keys(overrides).length === 0) return null;
  try {
    return btoa(encodeURIComponent(JSON.stringify(overrides)));
  } catch {
    return null;
  }
}

/** Decode an override map from a URL ?ov= param produced by encodeOverridesParam */
export function decodeOverridesParam(param: string): Record<string, number> | null {
  try {
    return JSON.parse(decodeURIComponent(atob(param))) as Record<string, number>;
  } catch {
    return null;
  }
}

