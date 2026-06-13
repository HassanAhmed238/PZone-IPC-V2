import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("useIPCProjects helper functions", () => {
  let isTableMissingError: any;
  let readIPCProjectsQuery: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const module = await import("@/hooks/useIPCProjects");
    isTableMissingError = module.isTableMissingError;
    readIPCProjectsQuery = module.readIPCProjectsQuery;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("isTableMissingError", () => {
    it("matches standard missing table / cache errors", () => {
      expect(isTableMissingError({ message: "relation \"ipc_projects\" does not exist" })).toBe(true);
      expect(isTableMissingError({ message: "Could not find ipc_projects in schema cache" })).toBe(true);
      expect(isTableMissingError({ message: "relation does not exist" })).toBe(true);
    });

    it("matches unavailable error messages", () => {
      expect(isTableMissingError({ message: "Database connection is unavailable" })).toBe(true);
      expect(isTableMissingError({ message: "unavailable" })).toBe(true);
      expect(isTableMissingError({ message: "UNAVAILABLE" })).toBe(true);
    });

    it("does not match other errors", () => {
      expect(isTableMissingError({ message: "permission denied for table ipc_projects" })).toBe(false);
      expect(isTableMissingError({ message: "violates foreign key constraint" })).toBe(false);
      expect(isTableMissingError(null)).toBe(false);
      expect(isTableMissingError(undefined)).toBe(false);
    });
  });

  describe("readIPCProjectsQuery table availability caching and TTL", () => {
    it("resolves the query when table is available", async () => {
      const mockQuery = Promise.resolve({ data: "success_data", error: null });
      const result = await readIPCProjectsQuery(mockQuery);
      expect(result).toEqual({ data: "success_data", error: null });
    });

    it("caches unavailable state on table missing error and bypasses future queries", async () => {
      // First call fails with table missing/unavailable error
      const mockQuery1 = Promise.resolve({ data: null, error: { message: "unavailable" } });
      const result1 = await readIPCProjectsQuery(mockQuery1);
      expect(result1).toEqual({ data: null, error: { message: "unavailable" } });

      // Second call has a query that would succeed if executed
      const mockQuery2 = Promise.resolve({ data: "should_not_be_seen", error: null });
      // But it should be bypassed and return the cached error
      const result2 = await readIPCProjectsQuery(mockQuery2);
      expect(result2).toEqual({ data: null, error: { message: "ipc_projects table unavailable" } });
    });

    it("recovers and retries query after 5-minute TTL has expired", async () => {
      // 1. Fail with table missing error
      const mockQuery1 = Promise.resolve({ data: null, error: { message: "unavailable" } });
      await readIPCProjectsQuery(mockQuery1);

      // 2. Query within TTL (e.g. 4 minutes later) - should still be bypassed
      vi.advanceTimersByTime(4 * 60 * 1000);
      const mockQuery2 = Promise.resolve({ data: "success", error: null });
      const result2 = await readIPCProjectsQuery(mockQuery2);
      expect(result2).toEqual({ data: null, error: { message: "ipc_projects table unavailable" } });

      // 3. Fast forward past TTL (e.g. 2 more minutes, total 6 minutes)
      vi.advanceTimersByTime(2 * 60 * 1000);

      // 4. Query should now be retried (not bypassed) and return the actual resolved promise
      const mockQuery3 = Promise.resolve({ data: "recovered_success", error: null });
      const result3 = await readIPCProjectsQuery(mockQuery3);
      expect(result3).toEqual({ data: "recovered_success", error: null });
    });
  });
});
