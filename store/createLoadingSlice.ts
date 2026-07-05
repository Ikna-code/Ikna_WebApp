import { StateCreator } from "zustand";

export interface LoadingSlice {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  incrementLoadingCount: () => void;
  decrementLoadingCount: () => void;
  loadingCount: number;
}

export const createLoadingSlice: StateCreator<LoadingSlice> = (set) => ({
  isLoading: false,
  loadingCount: 0,

  setIsLoading: (loading: boolean) =>
    set(() => ({
      isLoading: loading,
    })),

  incrementLoadingCount: () =>
    set((state) => ({
      loadingCount: state.loadingCount + 1,
      isLoading: true,
    })),

  decrementLoadingCount: () =>
    set((state) => {
      const newCount = Math.max(0, state.loadingCount - 1);
      return {
        loadingCount: newCount,
        isLoading: newCount > 0,
      };
    }),
});
