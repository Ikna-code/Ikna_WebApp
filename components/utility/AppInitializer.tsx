"use client";

import { useEffect, useMemo, useRef } from "react";
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
  const refreshProducts = useStore((s) => s.refreshProducts);
  const fetchWishlist = useStore((s) => s.fetchWishlist);
  const fetchCart = useStore((s) => s.fetchCart);
  const fetchOrders = useStore((s) => s.fetchOrders);
  const fetchAddresses = useStore((s) => s.fetchAddresses);
  const supabase = useMemo(() => createClient(), []);
  const productRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Step 2: Products are public, so load regardless of auth state.
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Step 3: Once auth is resolved, load user-specific data.
  useEffect(() => {
    if (!isAuthInitialized) return;

    // User-specific data only when logged in
    if (user?.id) {
      fetchCart(user.id);
      fetchWishlist(user.id);
      fetchOrders();
      fetchAddresses(user.id);
    }
  }, [isAuthInitialized, user?.id, fetchCart, fetchWishlist, fetchOrders, fetchAddresses]);

  // Step 3b: Keep user cart and orders in sync with DB changes in realtime.
  useEffect(() => {
    if (!isAuthInitialized || !user?.id) return;

    const scheduleCartRefresh = () => {
      void fetchCart(user.id, true);
    };

    const scheduleOrderRefresh = () => {
      void fetchOrders(true);
    };

    const channel = supabase
      .channel(`user-commerce-sync-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cart_items",
          filter: `userId=eq.${user.id}`,
        },
        scheduleCartRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `userId=eq.${user.id}`,
        },
        scheduleOrderRefresh
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAuthInitialized, user?.id, fetchCart, fetchOrders, supabase]);

  // Step 4: Keep product catalog in sync when Admin panel changes products/images.
  useEffect(() => {
    if (!isAuthInitialized) return;

    const scheduleProductRefresh = () => {
      if (productRefreshTimerRef.current) {
        clearTimeout(productRefreshTimerRef.current);
      }

      productRefreshTimerRef.current = setTimeout(() => {
        void refreshProducts();
      }, 250);
    };

    const channel = supabase
      .channel("products-store-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Product",
        },
        scheduleProductRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_images",
        },
        scheduleProductRefresh
      )
      .subscribe();

    return () => {
      if (productRefreshTimerRef.current) {
        clearTimeout(productRefreshTimerRef.current);
        productRefreshTimerRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [isAuthInitialized, refreshProducts, supabase]);

  return null;
}
