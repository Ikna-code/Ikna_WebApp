import { StateCreator } from "zustand";
import { getAllProductsWithPrimaryImage, getProductWithImages } from "@/backend/actions/products";
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
  loadProducts: () => Promise<void>;
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

  loadProducts: async () => {
    if (get().isProductsInitialized) return;
    set({ isLoading: true, error: null });
    try {
      const products = await getAllProductsWithPrimaryImage();
      const baseProducts = Array.isArray(products) ? products : [];

      // First paint can use base cards, then hydrate full image collections into store.
      const detailEntries = await Promise.all(
        baseProducts
          .map((p: any) => p?.id)
          .filter(Boolean)
          .map(async (productId: string) => {
            const existingRequest = productDetailInFlight.get(productId);
            if (existingRequest) {
              const inFlightData = await existingRequest;
              return [productId, inFlightData] as const;
            }

            const request = getProductWithImages(productId)
              .catch(() => null)
              .finally(() => {
                productDetailInFlight.delete(productId);
              });

            productDetailInFlight.set(productId, request);

            const data = await request;
            return [productId, data] as const;
          })
      );

      const fullDetailsById: Record<string, any> = {};
      for (const [productId, data] of detailEntries) {
        if (data) {
          fullDetailsById[productId] = {
            ...data,
            [FULL_DETAIL_FLAG]: true,
          };
        }
      }

      const hydratedProducts = baseProducts.map((product: any) => {
        const full = fullDetailsById[product?.id];
        if (full) return full;
        return {
          ...product,
          [FULL_DETAIL_FLAG]: false,
        };
      });

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