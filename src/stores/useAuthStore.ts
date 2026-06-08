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

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true,

  init: () => {
    let initialised = false;

    // Listen for auth state changes (fires AFTER getSession on first load)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Only update after initial session is loaded to avoid race condition
        if (initialised) {
          set({
            session,
            user: session?.user ?? null,
            loading: false,
          });
        }
      }
    );

    // Fetch current session — this is the authoritative first check
    supabase.auth.getSession().then(({ data: { session } }) => {
      initialised = true;
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
