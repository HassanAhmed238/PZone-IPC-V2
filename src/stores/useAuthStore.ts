import { create } from "zustand";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/* ─── Auth Store ───────────────────────────────────────────
   Zustand-based auth store replacing React Context.
   Subscribes to Supabase auth state on init().
   ──────────────────────────────────────────────────────── */

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** Call once at app startup (e.g. in App.tsx or main.tsx) */
  init: () => () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,

  init: () => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        set({
          session,
          user: session?.user ?? null,
          loading: false,
        });
      }
    );

    // Fetch current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({
        session,
        user: session?.user ?? null,
        loading: false,
      });
    });

    // Return cleanup function
    return () => subscription.unsubscribe();
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));

/* ─── Backward-compatible hook ─────────────────────────────
   Drop-in replacement for the old useAuth() context hook.
   All existing imports of `useAuth` can be redirected here.
   ──────────────────────────────────────────────────────── */
export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const signOut = useAuthStore((s) => s.signOut);
  return { session, user, loading, signOut };
}
