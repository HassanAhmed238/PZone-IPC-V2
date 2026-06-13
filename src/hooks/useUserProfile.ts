import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/stores/useAuthStore";

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  department: string | null;
  account_status?: "pending" | "approved" | "suspended";
  pending_full_name?: string | null;
  profile_change_status?: "none" | "pending" | "approved" | "rejected";
  profile_change_requested_at?: string | null;
  profile_change_reviewed_by?: string | null;
  profile_change_reviewed_at?: string | null;
  profile_change_rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export function useUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserProfile | null;
    },
  });
}

export function useRequestProfileNameChange() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fullName: string) => {
      if (!user) throw new Error("You must be signed in.");

      const requestedName = fullName.trim();
      if (requestedName.length < 2) {
        throw new Error("Name must be at least 2 characters.");
      }

      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          pending_full_name: requestedName,
          profile_change_status: "pending",
          profile_change_requested_at: new Date().toISOString(),
          profile_change_reviewed_by: null,
          profile_change_reviewed_at: null,
          profile_change_rejection_reason: null,
        })
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
  });
}
