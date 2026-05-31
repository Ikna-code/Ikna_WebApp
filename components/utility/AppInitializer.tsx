"use client";

import { useEffect, useMemo } from "react";
import { useStore } from "@/store/useStore";
import { createClient } from "@/backend/lib/supabaseClient";

/**
 * Bootstraps global data once when the app first loads.
 * Place this in layout.tsx — it renders nothing but triggers:
 *  - User authentication (once)
 *  - Product catalog fetch (once)
 *  - Cart, wishlist, orders, and addresses fetch (once, after user is known)
 */
export default function AppInitializer() {
  const fetchUser = useStore((s) => s.fetchUser);
  const forceRefetchUser = useStore((s) => s.forceRefetchUser);
  const isAuthInitialized = useStore((s) => s.isAuthInitialized);
  const user = useStore((s) => s.user);
  const loadProducts = useStore((s) => s.loadProducts);
  const fetchWishlist = useStore((s) => s.fetchWishlist);
  const fetchCart = useStore((s) => s.fetchCart);
  const fetchOrders = useStore((s) => s.fetchOrders);
  const fetchAddresses = useStore((s) => s.fetchAddresses);
  const supabase = useMemo(() => createClient(), []);

  // Step 1: Authenticate the user (runs exactly once on mount)
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Step 2: Subscribe to Supabase auth changes so new sessions (OTP, Google, etc.)
  // are reflected in the store without requiring a full page reload.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // Re-hydrate store user and user-scoped data after any sign-in.
        forceRefetchUser();
      } else if (event === 'SIGNED_OUT') {
        useStore.setState({
          user: null,
          isAuthInitialized: false,
          cartItems: [],
          isCartInitialized: false,
          cartUserId: null,
          orders: [],
          isOrdersInitialized: false,
          wishlist: [],
          isWishlistInitialized: false,
          addresses: [],
          isAddressesInitialized: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, forceRefetchUser]);

  // Step 2: Once auth is resolved, load products and user-specific data
  useEffect(() => {
    if (!isAuthInitialized) return;

    // Products are public — always load them
    loadProducts();

    // User-specific data only when logged in
    if (user?.id) {
      fetchCart(user.id);
      fetchWishlist(user.id);
      fetchOrders();
      fetchAddresses(user.id);
    }
  }, [isAuthInitialized, user?.id, loadProducts, fetchCart, fetchWishlist, fetchOrders, fetchAddresses]);

  return null;
}
