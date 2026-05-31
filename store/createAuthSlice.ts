import { StateCreator } from "zustand";
import { createClient } from "@/backend/lib/supabaseClient";
import { getUser } from "@/backend/actions/user";

export interface AuthSlice {
  user: any | null;
  isAuthInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  fetchUser: () => Promise<void>;
  clearUser: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set, get) => ({
  user: null,
  isAuthInitialized: false,
  isLoading: false,
  error: null,

  fetchUser: async () => {
    if (get().isAuthInitialized) return;
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        set({ error: error.message, isLoading: false, isAuthInitialized: true });
      } else if (!user) {
        set({ user: null, isLoading: false, isAuthInitialized: true });
      } else {
        const profileResponse = await getUser().catch(() => null);
        const dbUser = profileResponse?.ok ? profileResponse.user : null;

        set({
          user: {
            ...user,
            role: dbUser?.role ?? null,
          },
          isLoading: false,
          isAuthInitialized: true,
        });
      }
    } catch (e: any) {
      set({ error: e.message || "Failed to fetch user", isLoading: false, isAuthInitialized: true });
    }
  },

  clearUser: () => set({ user: null, isAuthInitialized: false }),
});