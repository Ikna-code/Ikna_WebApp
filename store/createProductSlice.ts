import { StateCreator } from "zustand";
import { getAllProducts } from "@/backend/actions/products"; // Assumed path
import { toggleWishlistAction } from "@/backend/actions/order";
import { createReview, getReviews, deleteReview } from "@/backend/actions/review";

export interface ProductSlice {
  products: any[];
  wishlist: any[];
  currentProductReviews: any[];
  isLoading: boolean;
  error: string | null;
  loadProducts: () => Promise<void>;
  toggleWishlist: (userId: string, productId: string) => Promise<void>;
  fetchReviews: (productId: string) => Promise<void>;
  addReview: (userId: string, data: any) => Promise<void>;
}

export const createProductSlice: StateCreator<ProductSlice> = (set) => ({
  products: [],
  wishlist: [],
  currentProductReviews: [],
  isLoading: false,
  error: null,

  loadProducts: async () => {
    set({ isLoading: true });
    const products = await getAllProducts();
    set({ products, isLoading: false });
  },

  toggleWishlist: async (userId, productId) => {
    const res = await toggleWishlistAction(userId, productId); // Action linked from backend
    // Can update local wishlist representation here
  },

  fetchReviews: async (productId) => {
    const reviews = await getReviews(productId);
    set({ currentProductReviews: reviews });
  },

  addReview: async (userId, data) => {
    await createReview(userId, data);
    // Refresh the reviews list after addition
    const reviews = await getReviews(data.productId);
    set({ currentProductReviews: reviews });
  }
});