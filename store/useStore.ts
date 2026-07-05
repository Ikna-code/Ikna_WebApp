import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { createAuthSlice, AuthSlice } from "./createAuthSlice";
import { createCartSlice, CartSlice } from "./createCartSlice";
import { createProductSlice, ProductSlice } from "./createProductSlice";
import { createAddressSlice, AddressSlice } from "./createAddressSlice";
import { createAdminSlice, AdminSlice } from "./createAdminSlice";
import { createLoadingSlice, LoadingSlice } from "./createLoadingSlice";

type StoreState = AuthSlice & CartSlice & ProductSlice & AddressSlice & AdminSlice & LoadingSlice;

export const useStore = create<StoreState>()(
  devtools((...a) => ({
    ...createAuthSlice(...a),
    ...createCartSlice(...a),
    ...createProductSlice(...a),
    ...createAddressSlice(...a),
    ...createAdminSlice(...a),
    ...createLoadingSlice(...a),
  }))
);