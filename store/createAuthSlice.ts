import { StateCreator } from "zustand";
// import { syncUser } from "@/backend/actions/user"; // Assumed path for syncUser

export interface AuthSlice {
  user: any | null;
  isLoading: boolean;
  error: string | null;
  // syncUserSession: (supabaseUser: any) => Promise<void>;
  clearUser: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  user: null,
  isLoading: false,
  error: null,

  // syncUserSession: async (supabaseUser) => {
  //   set({ isLoading: true, error: null });
  //   try {
  //     const res = await syncUser(supabaseUser);
  //     if (res.success) {
  //       set({ user: res.user, isLoading: false });
  //     } else {
  //       set({ error: typeof res.error === "string" ? res.error : "Failed to sync", isLoading: false });
  //     }
  //   } catch (e: any) {
  //     set({ error: e.message || "Failed to sync user", isLoading: false });
  //   }
  // },

  clearUser: () => set({ user: null }),
});