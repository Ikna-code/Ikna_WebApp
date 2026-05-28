import { StateCreator } from "zustand";
import { getAddressesByUserId, saveAddressAction, deleteAddressAction } from "@/backend/actions/settings"; // Assumed path

export interface AddressSlice {
  addresses: any[];
  isAddressesInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  fetchAddresses: (userId: string) => Promise<void>;
  saveAddress: (userId: string, data: any, addressId?: string | null) => Promise<void>;
  deleteAddress: (userId: string, addressId: string) => Promise<void>;
}

export const createAddressSlice: StateCreator<AddressSlice> = (set, get) => ({
  addresses: [],
  isAddressesInitialized: false,
  isLoading: false,
  error: null,

  fetchAddresses: async (userId: string) => {
    if (get().isAddressesInitialized) return;
    set({ isLoading: true });
    const res = await getAddressesByUserId(userId);
    if (res.success && res.data) {
      set({ addresses: res.data, isLoading: false, isAddressesInitialized: true });
    } else {
      set({ error: res.error, isLoading: false, isAddressesInitialized: true });
    }
  },

  saveAddress: async (userId, data, addressId = null) => {
    set({ isLoading: true });
    const res = await saveAddressAction(userId, data, addressId);
    if (res.success) {
      // Re-fetch addresses to get the latest list/default states
      const updated = await getAddressesByUserId(userId);
      if (updated.success) {
        set({ addresses: updated.data, isLoading: false, error: null });
      }
    } else {
      set({ error: res.error, isLoading: false });
    }
  },

  deleteAddress: async (userId, addressId) => {
    set({ isLoading: true });
    const res = await deleteAddressAction(userId, addressId);
    if (res.success) {
      set((state) => ({
        addresses: state.addresses.filter((a) => a.id !== addressId),
        isLoading: false,
      }));
    } else {
      set({ error: res.error, isLoading: false });
    }
  }
});