import { StateCreator } from "zustand";
import { supabaseBrowser } from "@/lib/supabase/client";
import { getUser } from "@/backend/actions/user";

export interface AuthSlice {
  user: any | null;
  isAuthInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  fetchUser: () => Promise<void>;
  forceRefetchUser: () => Promise<void>;
  silentRefetchUser: () => Promise<void>;
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
      const { data: { user }, error } = await supabaseBrowser.auth.getUser();
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

  forceRefetchUser: async () => {
    // Full re-initialization for explicit user-initiated sign-ins.
    // This resets isAuthInitialized so the step-3 effect re-runs and
    // reloads cart, wishlist, orders and addresses for the new session.
    set({ isAuthInitialized: false });
    const slice = get() as AuthSlice;
    await slice.fetchUser();
  },

  silentRefetchUser: async () => {
    // Updates the user profile in-place WITHOUT resetting isAuthInitialized.
    // Use this for background token refreshes (TOKEN_REFRESHED) so no loading
    // spinners appear and no data re-fetches are triggered across the app.
    try {
      const { data: { user }, error } = await supabaseBrowser.auth.getUser();
      if (error || !user) return;

      const profileResponse = await getUser().catch(() => null);
      const dbUser = profileResponse?.ok ? profileResponse.user : null;

      set({
        user: {
          ...user,
          role: dbUser?.role ?? null,
        },
      });
    } catch {
      // Silently ignore — do not change any loading or initialized state.
    }
  },

  clearUser: () => set({ user: null, isAuthInitialized: false }),
});