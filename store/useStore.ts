import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { createAuthSlice, AuthSlice } from "./createAuthSlice";
import { createCartSlice, CartSlice } from "./createCartSlice";
import { createProductSlice, ProductSlice } from "./createProductSlice";
import { createAddressSlice, AddressSlice } from "./createAddressSlice";

type StoreState = AuthSlice & CartSlice & ProductSlice & AddressSlice;

export const useStore = create<StoreState>()(
  devtools((...a) => ({
    ...createAuthSlice(...a),
    ...createCartSlice(...a),
    ...createProductSlice(...a),
    ...createAddressSlice(...a),
  }))
);