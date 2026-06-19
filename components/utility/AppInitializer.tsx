"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/store/useStore";
import { supabaseBrowser } from "@/lib/supabase/client";

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
  const silentRefetchUser = useStore((s) => s.silentRefetchUser);
  const isAuthInitialized = useStore((s) => s.isAuthInitialized);
  const user = useStore((s) => s.user);
  const loadProducts = useStore((s) => s.loadProducts);
  const refreshProducts = useStore((s) => s.refreshProducts);
  const fetchWishlist = useStore((s) => s.fetchWishlist);
  const fetchCart = useStore((s) => s.fetchCart);
  const fetchOrders = useStore((s) => s.fetchOrders);
  const fetchAddresses = useStore((s) => s.fetchAddresses);
  const productRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 1: Authenticate the user (runs exactly once on mount)
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Step 2: Subscribe to Supabase auth changes so new sessions (OTP, Google, etc.)
  // are reflected in the store without requiring a full page reload.
  //
  // IMPORTANT: Supabase fires TOKEN_REFRESHED (and often SIGNED_IN alongside it)
  // whenever the browser tab regains focus and the JWT is silently refreshed.
  // We must ignore those background token refresh events to prevent unnecessary
  // store resets, loading spinners, and full data re-fetches on every tab switch.
  // Only genuine user-initiated sign-in actions (OTP verify, OAuth, password) should
  // trigger forceRefetchUser().
  useEffect(() => {
    // Track whether the first SIGNED_IN after page load has already been handled.
    // INITIAL_SESSION fires immediately on mount with the existing session — we
    // skip it so we don't double-invoke forceRefetchUser() on top of fetchUser().
    let initialSessionHandled = false;

    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange((event: any) => {
      // TOKEN_REFRESHED: JWT silently refreshed in background (fires on tab focus).
      // INITIAL_SESSION: fired on first mount with the existing session from storage.
      // Both are normal background operations — never reset the store for these.
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        initialSessionHandled = true;
        return;
      }

      if (event === 'SIGNED_IN') {
        if (!initialSessionHandled) {
          // First SIGNED_IN on page load is the same session restored from storage —
          // fetchUser() in the separate effect already handles it.
          initialSessionHandled = true;
          return;
        }
        // If user already exists in store, this is usually a token refresh/rehydration
        // side-effect. Keep UX stable by doing a silent user refresh only.
        const currentState = useStore.getState();
        if (currentState.user?.id) {
          void silentRefetchUser();
          return;
        }

        // A genuine new sign-in (OTP verified, Google OAuth redirect, etc.).
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
  }, [forceRefetchUser, silentRefetchUser]);

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

    const channel = supabaseBrowser
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
      void supabaseBrowser.removeChannel(channel);
    };
  }, [isAuthInitialized, user?.id, fetchCart, fetchOrders]);

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

    const channel = supabaseBrowser
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
      void supabaseBrowser.removeChannel(channel);
    };
  }, [isAuthInitialized, refreshProducts]);

  return null;
}
