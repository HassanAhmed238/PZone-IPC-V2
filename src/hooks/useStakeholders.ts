import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  SEED_STAKEHOLDERS,
  PM_ELIGIBLE_TITLES,
  type Stakeholder,
  type StakeholderType,
} from "@/data/stakeholderSeedData";

const STORAGE_KEY = "pzone_stakeholders";

/* ─── Helpers ─── */
function loadStakeholders(): Stakeholder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  // First load — seed from data
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_STAKEHOLDERS));
  return SEED_STAKEHOLDERS;
}

function saveStakeholders(data: Stakeholder[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ─── Queries ─── */

export function useStakeholders(filters?: {
  type?: StakeholderType;
  department?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["stakeholders", filters],
    queryFn: () => {
      let result = loadStakeholders();

      if (filters?.type) {
        result = result.filter((s) => s.type === filters.type);
      }
      if (filters?.department) {
        result = result.filter((s) => s.department === filters.department);
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.job_title.toLowerCase().includes(q) ||
            s.code.includes(q) ||
            s.email.toLowerCase().includes(q) ||
            s.company.toLowerCase().includes(q)
        );
      }

      return result;
    },
  });
}

/** Only employees eligible for project manager role */
export function useProjectManagers() {
  return useQuery({
    queryKey: ["stakeholders", "pm-eligible"],
    queryFn: () => {
      const all = loadStakeholders();
      return all.filter(
        (s) =>
          s.type === "employee" &&
          (PM_ELIGIBLE_TITLES.some((t) =>
            s.job_title.toLowerCase().includes(t.toLowerCase())
          ) ||
            s.job_title.toLowerCase().includes("manager") ||
            s.job_title.toLowerCase().includes("director"))
      );
    },
  });
}

/** All employees for team assignment */
export function useEmployees() {
  return useQuery({
    queryKey: ["stakeholders", "employees"],
    queryFn: () => loadStakeholders().filter((s) => s.type === "employee"),
  });
}

/* ─── Mutations ─── */

export function useCreateStakeholder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Stakeholder, "id">) => {
      const all = loadStakeholders();
      const id = `stk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newItem: Stakeholder = { ...input, id };
      all.push(newItem);
      saveStakeholders(all);
      return newItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stakeholders"] });
      toast.success("تم إضافة جهة الاتصال");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useUpdateStakeholder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Stakeholder> & { id: string }) => {
      const all = loadStakeholders();
      const idx = all.findIndex((s) => s.id === id);
      if (idx === -1) throw new Error("Not found");
      all[idx] = { ...all[idx], ...updates };
      saveStakeholders(all);
      return all[idx];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stakeholders"] });
      toast.success("تم تحديث البيانات");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useDeleteStakeholder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const all = loadStakeholders();
      const filtered = all.filter((s) => s.id !== id);
      saveStakeholders(filtered);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stakeholders"] });
      toast.success("تم الحذف");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

/** Get unique departments from current data */
export function useStakeholderDepartments() {
  return useQuery({
    queryKey: ["stakeholders", "departments"],
    queryFn: () => {
      const all = loadStakeholders();
      return [...new Set(all.map((s) => s.department).filter(Boolean))].sort();
    },
  });
}

/** Get unique companies from current data */
export function useStakeholderCompanies() {
  return useQuery({
    queryKey: ["stakeholders", "companies"],
    queryFn: () => {
      const all = loadStakeholders();
      return [...new Set(all.map((s) => s.company).filter(Boolean))].sort();
    },
  });
}
