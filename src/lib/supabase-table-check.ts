/**
 * Shared Supabase table-availability utilities.
 *
 * Both useIPC and useIPCProjects need to detect "table not migrated"
 * errors and cache that state with a TTL. This module provides the
 * single implementation so the regex and TTL semantics stay in sync.
 */

const TABLE_MISSING_RE =
  /does not exist|schema cache|Could not find|relation .* does not exist|unavailable/i;

/** Detect Supabase errors indicating a table/schema is not yet migrated */
export function isTableMissingError(error: any): boolean {
  const msg = String(error?.message || "");
  return TABLE_MISSING_RE.test(msg);
}

/**
 * Factory for per-table availability guards with TTL-based recovery.
 *
 * Usage:
 *   const guard = createTableAvailabilityGuard("invoices");
 *   if (await guard.isAvailable()) { ... }
 *   guard.markAvailable();
 */
export function createTableAvailabilityGuard(tableName: string, ttlMs = 5 * 60 * 1000) {
  let available: boolean | null = null;
  let checkedAt = 0;

  return {
    /** True if we haven't detected the table as missing, or the TTL has expired. */
    shouldProbe(): boolean {
      if (available === null) return true;
      if (available === true) return true;
      // Table was flagged missing — only re-probe after TTL
      return (Date.now() - checkedAt) > ttlMs;
    },

    /** Cache a "table missing" result. */
    markUnavailable() {
      available = false;
      checkedAt = Date.now();
    },

    /** Cache a "table OK" result (e.g. after a successful query). */
    markAvailable() {
      available = true;
      checkedAt = Date.now();
    },

    /** Reset to unknown so the next probe runs unconditionally. */
    reset() {
      available = null;
      checkedAt = 0;
    },

    /** Read the cached availability (null = unknown, true/false = cached). */
    get cachedState(): boolean | null {
      if (available === false && (Date.now() - checkedAt) > ttlMs) {
        available = null; // TTL expired — reset to unknown
      }
      return available;
    },

    /** The table name this guard covers — for diagnostics. */
    tableName,
  };
}
