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
  isCartInitialized: boolean;
  cartUserId: string | null;
  orders: any[];
  isOrdersInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  fetchCart: (userId: string, force?: boolean) => Promise<void>;
  fetchOrders: (force?: boolean) => Promise<void>;
  fetchAdminOrders: (force?: boolean) => Promise<void>;
  addItemToCart: (userId: string, productId: string, selectedSize: string, quantity?: number, category?: string, comboEligibleQuantity?: number, comboBundleId?: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  checkout: (userId: string, couponCode?: string | null) => Promise<any>;
  finalizePayment: (orderId: string, txId: string, provider: string) => Promise<any>;
  updateOrderStatus: (orderId: string, status: string) => Promise<any>;
}

export const createCartSlice: StateCreator<CartSlice> = (set, get) => ({
  cartItems: [],
  isCartInitialized: false,
  cartUserId: null,
  orders: [],
  isOrdersInitialized: false,
  isLoading: false,
  error: null,

  fetchOrders: async (force = false) => {
    if (!force && get().isOrdersInitialized) return;
    try {
      const response = await fetch('/api/orders', { cache: 'no-store' });
      if (response.status === 401) {
        set({ orders: [], isOrdersInitialized: true, error: null });
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      set({ orders: data, isOrdersInitialized: true, error: null });
    } catch (error) {
      console.error('Error fetching orders:', error);
      // Avoid permanent spinner states in consumer pages.
      set({ orders: [], isOrdersInitialized: true, error: 'Failed to fetch orders' });
    }
  },

  fetchAdminOrders: async (force = false) => {
    if (!force && get().isOrdersInitialized && get().orders.length > 0) return;
    try {
      const response = await fetch('/api/admin/orders', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch admin orders');
      const data = await response.json();
      set({ orders: data, isOrdersInitialized: true });
    } catch (error) {
      console.error('Error fetching admin orders:', error);
    }
  },

  fetchCart: async (userId, force = false) => {
    if (!force && get().isCartInitialized && get().cartUserId === userId) {
      return;
    }

    set({ isLoading: true, error: null });
    const res = await getCartItems(userId);
    // Explicitly check for success and items
    if (res?.success && Array.isArray(res.items)) {
      set({ cartItems: res.items, isLoading: false, isCartInitialized: true, cartUserId: userId });
    } else {
      set({ error: (res?.error as string) || "Failed to fetch cart", isLoading: false, isCartInitialized: true, cartUserId: userId });
    }
  },

  addItemToCart: async (userId, productId, selectedSize, quantity = 1, category, comboEligibleQuantity = 0, comboBundleId = "") => {
    set({ isLoading: true, error: null });
    try {
      const res = await addToCart(userId, productId, selectedSize, quantity, category, comboEligibleQuantity, comboBundleId);
      
      if (res?.success && res.cartItem) {
        // Rehydrate from DB so each cart item includes nested product fields (image/price).
        const cartRes = await getCartItems(userId);
        if (cartRes?.success && Array.isArray(cartRes.items)) {
          set({ cartItems: cartRes.items, isLoading: false, isCartInitialized: true, cartUserId: userId });
        } else {
          set({ isLoading: false });
        }
      } else {
        set({ error: (res?.error as string) || "Error adding item", isLoading: false });
      }
    } catch (err) {
      set({ error: "Network error occurred", isLoading: false });
    }
  },

  updateQuantity: async (cartItemId, quantity) => {
    // Optimistic update first so the UI responds instantly without losing product data.
    // The server response only contains the bare cartItem row (no product relation),
    // so we must NOT replace the item — only patch the quantity field.
    set((state) => ({
      cartItems: state.cartItems.map((item) =>
        item.id === cartItemId
          ? {
              ...item,
              quantity,
              comboEligibleQuantity: Math.min(
                Math.max(Number(item?.comboEligibleQuantity) || 0, 0),
                Math.max(Number(quantity) || 0, 0)
              ),
            }
          : item
      ),
    }));
    const res = await updateCartQuantity(cartItemId, quantity);
    if (!res?.success) {
      console.error("updateQuantity failed:", res?.error);
      const cartUserId = get().cartUserId;
      if (cartUserId) {
        await get().fetchCart(cartUserId, true);
      }
    }
  },

removeItem: async (cartItemId: string) => {
  try {
    const result = await removeFromCart(cartItemId);
    const res = result as any as { success: boolean; error?: string };

    if (res && res.success) {
      set((state) => ({
        cartItems: state.cartItems.filter((item) => item.id !== cartItemId),
      }));
    } else {
      const msg = res?.error || "Failed to remove item";
      set({ error: msg });
      console.error("removeItem failed:", msg);
    }
  } catch (err: any) {
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
  },

  updateOrderStatus: async (orderId, status) => {
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to update order status' }));
      throw new Error(errorData.error || 'Failed to update order status');
    }

    const updatedOrder = await response.json();
    set((state) => ({
      orders: state.orders.map((order) =>
        order.id === updatedOrder.id
          ? {
              ...order,
              ...updatedOrder,
              orderItems: (updatedOrder.orderItems || order.orderItems || []).map((item: any) => {
                const existingItem = (order.orderItems || []).find((oldItem: any) => oldItem.id === item.id);
                return {
                  ...existingItem,
                  ...item,
                };
              }),
            }
          : order
      ),
    }));

    return updatedOrder;
  },
});