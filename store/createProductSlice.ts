import { StateCreator } from "zustand";
import { getProductWithImages } from "@/backend/actions/products";
import { toggleWishlistAction, getWishlist } from "@/backend/actions/order";
import { createReview, getReviews, deleteReview } from "@/backend/actions/review";
import { extractIdFromSlug } from "@/lib/seo";

// Deduplicate concurrent detail requests (e.g., React Strict Mode double-invocation)
const productDetailInFlight = new Map<string, Promise<any>>();
const wishlistToggleInFlight = new Map<string, Promise<void>>();
let productsRequestInFlight: Promise<void> | null = null;
const FULL_DETAIL_FLAG = "__fullImageCollection";
const PRODUCT_DETAIL_TIMEOUT_MS = 4000;

const dedupeWishlistItems = (items: any[]) => {
  const seen = new Set<string>();
  const deduped: any[] = [];

  for (const item of Array.isArray(items) ? items : []) {
    const id = String(item?.id || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    deduped.push(item);
  }

  return deduped;
};

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

    if (!force && productsRequestInFlight) {
      await productsRequestInFlight;
      return;
    }

    set({ isLoading: true, error: null });

    const request = (async () => {
      try {
        const response = await fetch('/api/products', { cache: 'force-cache' });
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
      } finally {
        productsRequestInFlight = null;
      }
    })();

    productsRequestInFlight = request;
    await request;
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
    set({ wishlist: dedupeWishlistItems(items), isWishlistInitialized: true });
  },

  toggleWishlist: async (userId, productId) => {
    const key = `${userId}:${productId}`;
    const existingToggle = wishlistToggleInFlight.get(key);
    if (existingToggle) {
      await existingToggle;
      return;
    }

    const togglePromise = (async () => {
      const previousWishlist = get().wishlist;
      const currentlyWished = previousWishlist.some((item: any) => item?.id === productId);

      // Optimistic UI update so the heart state changes instantly.
      set((state) => {
        if (currentlyWished) {
          return {
            wishlist: state.wishlist.filter((item: any) => item?.id !== productId),
          };
        }

        const fallbackProduct =
          state.products.find((product: any) => product?.id === productId) ||
          state.productDetailsById[productId] ||
          { id: productId };

        return {
          wishlist: dedupeWishlistItems([...state.wishlist, fallbackProduct]),
        };
      });

      const res = await toggleWishlistAction(userId, productId);
      if (!res?.success) {
        set({ wishlist: previousWishlist });
        throw new Error(res?.error || "Failed to toggle wishlist");
      }
    })();

    wishlistToggleInFlight.set(key, togglePromise);

    try {
      await togglePromise;
    } finally {
      wishlistToggleInFlight.delete(key);
    }
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