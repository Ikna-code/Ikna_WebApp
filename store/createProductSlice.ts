import { StateCreator } from "zustand";
import { getProductWithImages } from "@/backend/actions/products";
import { toggleWishlistAction, getWishlist } from "@/backend/actions/order";
import { createReview, getReviews, deleteReview } from "@/backend/actions/review";
import { extractIdFromSlug } from "@/lib/seo";

// Deduplicate concurrent detail requests (e.g., React Strict Mode double-invocation)
const productDetailInFlight = new Map<string, Promise<any>>();
const FULL_DETAIL_FLAG = "__fullImageCollection";
const PRODUCT_DETAIL_TIMEOUT_MS = 4000;

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("Product detail request timed out"));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

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
    const resolvedProductId = extractIdFromSlug(productId);
    if (!resolvedProductId) return null;

    const cached = get().productDetailsById[resolvedProductId];
    if (cached && !force) return cached;

    // If another call is already fetching this product, reuse that promise.
    const existingRequest = productDetailInFlight.get(resolvedProductId);
    if (existingRequest && !force) {
      return await existingRequest;
    }

    // Reuse only if we explicitly marked this product as fully hydrated.
    if (!force) {
      const fromProducts = get().products.find(
        (p: any) => p?.id === resolvedProductId && p?.[FULL_DETAIL_FLAG] === true
      );
      if (fromProducts) {
        set((state) => ({
          productDetailsById: {
            ...state.productDetailsById,
            [resolvedProductId]: fromProducts,
          },
        }));
        return fromProducts;
      }
    }

    set({ isLoading: true, error: null });
    const request = (async () => {
      try {
        const data = await withTimeout(
          getProductWithImages(resolvedProductId),
          PRODUCT_DETAIL_TIMEOUT_MS
        );
        if (!data) {
          set({ isLoading: false });
          return null;
        }

        set((state) => ({
          products: state.products.map((product: any) =>
            product?.id === resolvedProductId
              ? {
                  ...product,
                  ...data,
                  fabricType:
                    typeof data?.fabricType === "string" && data.fabricType.trim().length > 0
                      ? data.fabricType
                      : product?.fabricType || "cotton",
                  [FULL_DETAIL_FLAG]: true,
                }
              : product
          ),
          productDetailsById: {
            ...state.productDetailsById,
            [resolvedProductId]: {
              ...state.productDetailsById[resolvedProductId],
              ...data,
              fabricType:
                typeof data?.fabricType === "string" && data.fabricType.trim().length > 0
                  ? data.fabricType
                  : state.productDetailsById[resolvedProductId]?.fabricType || "cotton",
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
        productDetailInFlight.delete(resolvedProductId);
      }
    })();

    productDetailInFlight.set(resolvedProductId, request);
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