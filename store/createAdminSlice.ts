import { StateCreator } from 'zustand';

export interface AdminSlice {
  isAdminMenuOpen: boolean;
  setAdminMenuOpen: (isOpen: boolean) => void;
  toggleAdminMenu: () => void;
}

export const createAdminSlice: StateCreator<AdminSlice> = (set) => ({
  isAdminMenuOpen: false,
  setAdminMenuOpen: (isOpen) => set({ isAdminMenuOpen: isOpen }),
  toggleAdminMenu: () => set((state) => ({ isAdminMenuOpen: !state.isAdminMenuOpen })),
});
