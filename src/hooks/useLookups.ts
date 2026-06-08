import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ─── Types ──────────────────────────────────────────────── */

export interface ProjectOption {
  id: string;
  project_code: string;
  project_name: string;
  client_name: string | null;
  zone: string | null;
  contract_value: number | null;
  project_status: string | null;
}

export interface ClientOption {
  name: string;
  count: number;
}

export interface ContractOption {
  id: string;
  title: string;
  contract_number: string | null;
  employer_name: string | null;
  contract_value: number | null;
  status: string | null;
}

/* ─── Hooks ──────────────────────────────────────────────── */

/** Fetch all projects from `ongoing_projects` for dropdown lists */
export function useProjectOptions() {
  return useQuery({
    queryKey: ["projectOptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ongoing_projects")
        .select("id, project_code, project_name, client_name, zone, contract_value, project_status")
        .order("project_code", { ascending: true });

      if (error) {
        console.warn("[Lookup] ongoing_projects query failed:", error.message);
        return [] as ProjectOption[];
      }
      return (data || []) as ProjectOption[];
    },
    staleTime: 5 * 60 * 1000, // cache 5 min
  });
}

/** Derive unique client names from projects */
export function useClientOptions() {
  return useQuery({
    queryKey: ["clientOptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ongoing_projects")
        .select("client_name")
        .not("client_name", "is", null);

      if (error) {
        console.warn("[Lookup] client lookup failed:", error.message);
        return [] as ClientOption[];
      }

      // Aggregate unique client names
      const map = new Map<string, number>();
      (data || []).forEach((row: any) => {
        const name = (row.client_name || "").trim();
        if (name) map.set(name, (map.get(name) || 0) + 1);
      });

      return Array.from(map.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Derive unique zones/sectors from projects */
export function useSectorOptions() {
  return useQuery({
    queryKey: ["sectorOptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ongoing_projects")
        .select("zone")
        .not("zone", "is", null);

      if (error) return [] as string[];

      const set = new Set<string>();
      (data || []).forEach((row: any) => {
        const z = (row.zone || "").trim();
        if (z) set.add(z);
      });

      return Array.from(set).sort();
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch contracts for linking */
export function useContractOptions() {
  return useQuery({
    queryKey: ["contractOptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, title, contract_number, employer_name, contract_value, status")
        .order("title", { ascending: true });

      if (error) {
        console.warn("[Lookup] contracts query failed:", error.message);
        return [] as ContractOption[];
      }
      return (data || []) as ContractOption[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
