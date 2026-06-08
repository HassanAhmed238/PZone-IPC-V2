import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ModuleAccessRecord {
  id: string;
  module_path: string;
  allowed_roles: string[];
}

export function useModuleAccess() {
  return useQuery({
    queryKey: ["contract_module_access"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_module_access")
        .select("id, module_path, allowed_roles");
      
      // Gracefully handle missing table — don't crash the entire app
      if (error) {
        if (/does not exist|schema cache|Could not find|relation/i.test(error.message || "")) {
          console.warn("[useModuleAccess] Table not found, using fallback roles:", error.message);
          return null; // Signal to consumers to use fallback
        }
        throw error;
      }
      return data as ModuleAccessRecord[];
    },
    // Don't retry if the table doesn't exist
    retry: (failureCount, error: any) => {
      if (/does not exist|schema cache|Could not find/i.test(error?.message || "")) return false;
      return failureCount < 1;
    },
    staleTime: 5 * 60 * 1000, // Module access doesn't change often
  });
}
