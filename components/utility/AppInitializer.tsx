"use client";

import { useEffect } from "react";
import { useStore } from "@/store/useStore";

/**
 * Bootstraps global data once when the app first loads.
 * Place this in layout.tsx — it renders nothing but triggers:
 *  - User authentication (once)
 *  - Product catalog fetch (once)
 *  - Cart, wishlist, orders, and addresses fetch (once, after user is known)
 */
export default function AppInitializer() {
  const fetchUser = useStore((s) => s.fetchUser);
  const isAuthInitialized = useStore((s) => s.isAuthInitialized);
  const user = useStore((s) => s.user);
  const loadProducts = useStore((s) => s.loadProducts);
  const fetchWishlist = useStore((s) => s.fetchWishlist);
  const fetchCart = useStore((s) => s.fetchCart);
  const fetchOrders = useStore((s) => s.fetchOrders);
  const fetchAddresses = useStore((s) => s.fetchAddresses);

  // Step 1: Authenticate the user (runs exactly once)
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

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
