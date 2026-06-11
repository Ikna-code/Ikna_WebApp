import { StateCreator } from "zustand";
import { getProductWithImages } from "@/backend/actions/products";
import { toggleWishlistAction, getWishlist } from "@/backend/actions/order";
import { createReview, getReviews, deleteReview } from "@/backend/actions/review";

// Deduplicate concurrent detail requests (e.g., React Strict Mode double-invocation)
const productDetailInFlight = new Map<string, Promise<any>>();
const FULL_DETAIL_FLAG = "__fullImageCollection";

export interface ProductSlice {
  products: any[];
  productDetailsById: Record<string, any>;
  wishlist: any[];
  isProductsInitialized: boolean;
  isWishlistInitialized: boolean;
  currentProductReviews: any[];
  isLoading: boolean;
  error: string | null;
  loadProducts: (force?: boolean) => Promise<void>;
  refreshProducts: () => Promise<void>;
  fetchProductDetails: (productId: string, force?: boolean) => Promise<any>;
  fetchWishlist: (userId: string) => Promise<void>;
  toggleWishlist: (userId: string, productId: string) => Promise<void>;
  fetchReviews: (productId: string) => Promise<void>;
  addReview: (userId: string, data: any) => Promise<void>;
}

export const createProductSlice: StateCreator<ProductSlice> = (set, get) => ({
  products: [],
  productDetailsById: {},
  wishlist: [],
  isProductsInitialized: false,
  isWishlistInitialized: false,
  currentProductReviews: [],
  isLoading: false,
  error: null,

  loadProducts: async (force = false) => {
    if (!force && get().isProductsInitialized) return;
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/products', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error("Failed to load products");
      }

      const payload = await response.json();
      const rows = Array.isArray(payload) ? payload : [];

      const hydratedProducts = rows.map((product: any) => {
        const images = Array.isArray(product?.images) ? product.images : [];
        const primary = images.find((img: any) => Boolean(img?.is_primary));
        const fallback = images[0];
        const imagePath = product?.image || primary?.image_path || fallback?.image_path || "";

        return {
          ...product,
          image: imagePath,
          product_images: images,
          [FULL_DETAIL_FLAG]: true,
        };
      });

      const fullDetailsById = hydratedProducts.reduce((acc: Record<string, any>, product: any) => {
        if (product?.id) {
          acc[product.id] = product;
        }
        return acc;
      }, {});

      set((state) => ({
        products: hydratedProducts,
        productDetailsById: {
          ...state.productDetailsById,
          ...fullDetailsById,
        },
        isLoading: false,
        isProductsInitialized: true,
      }));
    } catch (e: any) {
      set({ error: e?.message || "Failed to load products", isLoading: false });
    }
  },

  refreshProducts: async () => {
    await get().loadProducts(true);
  },

  fetchProductDetails: async (productId: string, force = false) => {
    if (!productId) return null;

    const cached = get().productDetailsById[productId];
    if (cached && !force) return cached;

    // If another call is already fetching this product, reuse that promise.
    const existingRequest = productDetailInFlight.get(productId);
    if (existingRequest && !force) {
      return await existingRequest;
    }

    // Reuse only if we explicitly marked this product as fully hydrated.
    if (!force) {
      const fromProducts = get().products.find(
        (p: any) => p?.id === productId && p?.[FULL_DETAIL_FLAG] === true
      );
      if (fromProducts) {
        set((state) => ({
          productDetailsById: {
            ...state.productDetailsById,
            [productId]: fromProducts,
          },
        }));
        return fromProducts;
      }
    }

    set({ isLoading: true, error: null });
    const request = (async () => {
      try {
        const data = await getProductWithImages(productId);
        if (!data) {
          set({ isLoading: false });
          return null;
        }

        set((state) => ({
          products: state.products.map((product: any) =>
            product?.id === productId
              ? {
                  ...data,
                  [FULL_DETAIL_FLAG]: true,
                }
              : product
          ),
          productDetailsById: {
            ...state.productDetailsById,
            [productId]: {
              ...data,
              [FULL_DETAIL_FLAG]: true,
            },
          },
          isLoading: false,
        }));

        return data;
      } catch (e: any) {
        set({ error: e?.message || "Failed to fetch product details", isLoading: false });
        return null;
      } finally {
        productDetailInFlight.delete(productId);
      }
    })();

    productDetailInFlight.set(productId, request);
    return await request;
  },

  fetchWishlist: async (userId: string) => {
    if (get().isWishlistInitialized) return;
    const items = await getWishlist(userId);
    set({ wishlist: items, isWishlistInitialized: true });
  },

  toggleWishlist: async (userId, productId) => {
    const res = await toggleWishlistAction(userId, productId);
    // Refetch wishlist to stay in sync after toggle
    const items = await getWishlist(userId);
    set({ wishlist: items });
  },

  fetchReviews: async (productId) => {
    const reviews = await getReviews(productId);
    set({ currentProductReviews: reviews });
  },

  addReview: async (userId, data) => {
    await createReview(userId, data);
    const reviews = await getReviews(data.productId);
    set({ currentProductReviews: reviews });
  }
});