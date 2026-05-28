import { StateCreator } from "zustand";
import { 
  addToCart, 
  getCartItems, 
  updateCartQuantity, 
  removeFromCart, 
  createOrder,
  confirmPayment
} from "@/backend/actions/order";

export interface CartSlice {
  cartItems: any[];
  isLoading: boolean;
  error: string | null;
  fetchCart: (userId: string) => Promise<void>;
  addItemToCart: (userId: string, productId: string, selectedSize: string, quantity?: number, category?: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  checkout: (userId: string, couponCode?: string | null) => Promise<any>;
  finalizePayment: (orderId: string, txId: string, provider: string) => Promise<any>;
}

export const createCartSlice: StateCreator<CartSlice> = (set, get) => ({
  cartItems: [],
  isLoading: false,
  error: null,

  fetchCart: async (userId) => {
    set({ isLoading: true, error: null });
    const res = await getCartItems(userId);
    // Explicitly check for success and items
    if (res?.success && Array.isArray(res.items)) {
      set({ cartItems: res.items, isLoading: false });
    } else {
      set({ error: (res?.error as string) || "Failed to fetch cart", isLoading: false });
    }
  },

  addItemToCart: async (userId, productId, selectedSize, quantity = 1, category) => {
    set({ isLoading: true, error: null });
    try {
      const res = await addToCart(userId, productId, selectedSize, quantity, category);
      
      if (res?.success && res.cartItem) {
        const currentItems = get().cartItems;
        // Use a unique identifier (ID from DB) to check for existence
        const exists = currentItems.find(item => item.id === res.cartItem.id);
        
        let newItems;
        if (exists) {
          newItems = currentItems.map(item => 
            item.id === res.cartItem.id ? res.cartItem : item
          );
        } else {
          newItems = [...currentItems, res.cartItem];
        }
        
        set({ cartItems: newItems, isLoading: false });
      } else {
        set({ error: (res?.error as string) || "Error adding item", isLoading: false });
      }
    } catch (err) {
      set({ error: "Network error occurred", isLoading: false });
    }
  },

  updateQuantity: async (cartItemId, quantity) => {
    // Note: We don't set isLoading here to prevent the whole UI from flickering
    const res = await updateCartQuantity(cartItemId, quantity);
    if (res?.success && res.item) {
      set((state) => ({
        cartItems: state.cartItems.map(item => 
          item.id === cartItemId ? res.item : item
        )
      }));
    }
  },

removeItem: async (cartItemId: string) => {
  try {
    // 1. Manually define the expected response shape
    interface DeleteResponse {
      success: boolean;
      error?: string;
    }

    // 2. Assign the result to a typed variable
    // We cast to 'any' first to stop the "incompatible types" error
    const result = await removeFromCart(cartItemId);
    const res = result as any as DeleteResponse;

    if (res && res.success) {
      set((state) => ({
        cartItems: state.cartItems.filter((item) => item.id !== cartItemId),
      }));
    } else {
      set({ error: res?.error || "Failed to remove item" });
    }
  } catch (err) {
    set({ error: "A network error occurred." });
    console.error("Cart Slice Error:", err);
  }
},
  checkout: async (userId, couponCode = null) => {
    set({ isLoading: true });
    try {
      const orderRes = await createOrder(userId, couponCode);
      if (orderRes?.success) {
        set({ cartItems: [] });
        return { success: true, order: orderRes.order };
      }
      return orderRes;
    } finally {
      set({ isLoading: false });
    }
  },

  finalizePayment: async (orderId, txId, provider) => {
    return await confirmPayment(orderId, txId, provider);
  }
});