"use client";
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/layout/Header';

function DescriptionAccordion({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="mt-1.5 flex items-center gap-1 text-xs sm:text-sm font-extrabold tracking-widest text-[#840d5c] uppercase hover:opacity-70 transition-opacity"
      >
        Product Description
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <p className="mt-2 text-sm md:text-base text-[#321327]/85 leading-relaxed font-medium whitespace-pre-wrap">
          {description}
        </p>
      )}
    </div>
  );
}

function FabricTypeAccordion({ fabricType }: { fabricType?: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!fabricType) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="mt-1.5 flex items-center gap-1 text-xs sm:text-sm font-extrabold tracking-widest text-[#840d5c] uppercase hover:opacity-70 transition-opacity"
      >
        Fabric Type
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div className="mt-2">
          <span className="inline-flex text-[11px] font-bold text-white bg-[#840d5c] px-2.5 py-1 rounded-full capitalize shadow-sm">
            {fabricType}
          </span>
        </div>
      )}
    </div>
  );
}

function HygienePolicyAccordion() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="mt-1.5 flex items-center gap-1 text-xs sm:text-sm font-extrabold tracking-widest text-[#840d5c] uppercase hover:opacity-70 transition-opacity"
      >
        Reliable Shipping
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          <p className="text-xs sm:text-sm text-[#321327]/85 leading-relaxed font-medium">
            Due to hygiene and safety reasons, we do not accept returns or exchanges on intimate apparel.
            We kindly ask that you review sizing information carefully before placing your order.
          </p>
          <p className="text-xs sm:text-sm text-[#321327]/85 leading-relaxed font-medium">
            Thank you for your understanding and support in maintaining product hygiene and safety.
          </p>
        </div>
      )}
    </div>
  );
}
import {
  ShoppingBag,
  Star,
  ShieldCheck,
  Truck,
  ChevronLeft,
  ChevronDown,
  MessageSquare,
  X,
  XCircle,
  Trash2,
  Gift
} from 'lucide-react';

import ReviewSection from '@/app/reviews/page';
import { getReviews } from '@/backend/actions/review';
import { useStore } from '@/store/useStore';
import Footer from '@/components/layout/Footer';
import { getOptimizedSupabaseImageUrl } from '@/lib/supabaseImage';
import {
  getProductColorLabel,
  getProductSwatchColor,
} from '@/lib/productVariants';

const getProductSubCategoryKey = (item: any) =>
  String(
    item?.subCategory?.id ||
      item?.subCategoryId ||
      item?.subCategory?.slug ||
      item?.subCategory?.name ||
      item?.subCategoryName ||
      ''
  )
    .trim()
    .toLowerCase();

const getProductSubCategoryName = (item: any) =>
  String(
    item?.subCategory?.name ||
      item?.subCategoryName ||
      ''
  )
    .trim()
    .toUpperCase();

const COMBO_ELIGIBLE_SUBCATEGORIES = new Set([
  'COMFY SUPPORTIVE MINIMIZER BRA',
  'EVERYDAY WEAR COMFY BRA',
]);

  const createComboBundleId = () => `combo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/* ---------------- TYPES ---------------- */
interface ComboSelection {
  id: string;
  product: any;
  size: string;
  colorVariantId: string;
  colorLabel: string;
  colorBg: string;
  imageSrc: string;
}

interface ToastState {
  message: string;
  type: 'success' | 'info' | 'error';
}

/* ---------------- COMPONENT ---------------- */
const SingleProductPage = () => {
  const { id } = useParams();
  const router = useRouter();

  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [reviewComposerSignal, setReviewComposerSignal] = useState(0);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false); 
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');

  /* ---------------- NOTIFICATION STATE ---------------- */
  const [toast, setToast] = useState<ToastState | null>(null);

  /* ---------------- COMBO STATES ---------------- */
  const [isComboChecked, setIsComboChecked] = useState(false);
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);
  const [comboItems, setComboItems] = useState<ComboSelection[]>([]);
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);

  const [currentComboSize, setCurrentComboSize] = useState<string>('');
  const [currentComboVariant, setCurrentComboVariant] = useState<any>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);

  const reviewRef = useRef<HTMLDivElement>(null);

  /* ---------------- SIDE EFFECTS ---------------- */
  useEffect(() => {
    if (isSizeGuideOpen || isComboModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isSizeGuideOpen, isComboModalOpen]);

  // Auto-hide toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  /* ---------------- STORE SELECTORS ---------------- */
  const cartItems = useStore((state) => state.cartItems);
  const addItemToCart = useStore((state) => state.addItemToCart);
  const user = useStore((state) => state.user);
  const fetchProductDetails = useStore((state) => state.fetchProductDetails);
  const products = useStore((state) => state.products);
  const loadProducts = useStore((state) => state.loadProducts);
  const isProductsInitialized = useStore((state) => state.isProductsInitialized);

  const productId = id?.toString() || '';
  const productData = useStore((state) =>
    productId ? state.productDetailsById[productId] : null
  );

  /* ---------------- INIT ---------------- */
  useEffect(() => {
    const initPage = async () => {
      try {
        if (!isProductsInitialized) {
          await loadProducts();
        }
        if (!productId || productData) return;
        await fetchProductDetails(productId);
      } catch (error) {
        console.error("Initialization error:", error);
      }
    };

    initPage();
  }, [
    productId,
    productData,
    fetchProductDetails,
    isProductsInitialized,
    loadProducts,
  ]);

  useEffect(() => {
    setActiveImgIdx(0);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [productId]);

  useEffect(() => {
    if (!productId) return;

    let isMounted = true;

    const loadReviewStats = async () => {
      try {
        const allReviews = await getReviews(productId);
        const total = allReviews.length;
        const sum = allReviews.reduce((acc: number, review: any) => acc + (Number(review?.rating) || 0), 0);

        if (!isMounted) return;

        setReviewCount(total);
        setAverageRating(total > 0 ? sum / total : 0);
      } catch (error) {
        console.error('Failed to load product reviews:', error);
        if (!isMounted) return;
        setReviewCount(0);
        setAverageRating(0);
      }
    };

    loadReviewStats();
    return () => {
      isMounted = false;
    };
  }, [productId]);

  /* ---------------- PRODUCT ---------------- */
  const product = useMemo(() => {
    if (!productData || !productId) return null;
    return String(productData.id) === String(productId) ? productData : null;
  }, [productData, productId]);

  useEffect(() => {
    if (product && !product.isDeleted && product.isActive) {
      setCurrentComboVariant(product);
      setSelectedVariantId(String(product.id));
      return;
    }

    if (isProductsInitialized && productId) {
      router.replace('/shop');
    }
  }, [product, isProductsInitialized, productId, router]);

  const activeVariant = useMemo(() => {
    if (!product) return null;

    const normalizedSelectedId = String(selectedVariantId || '').trim();
    if (!normalizedSelectedId) return product;

    const matched = products.find((item: any) => String(item?.id || '').trim() === normalizedSelectedId);
    return matched || product;
  }, [product, products, selectedVariantId]);

  const productImages = useMemo(() => {
    const rows = Array.isArray(activeVariant?.product_images)
      ? activeVariant.product_images
      : Array.isArray(activeVariant?.images)
        ? activeVariant.images
        : Array.isArray(productData?.product_images)
          ? productData.product_images
          : [];
    const filtered = rows
      .map((row: any) => String(row?.image_path || row?.image || '').trim())
      .filter(Boolean);

    if (filtered.length > 0) return filtered;

    const fallback = String(activeVariant?.image || productData?.image || product?.image || '').trim();
    return fallback ? [fallback] : [];
  }, [activeVariant, productData, product]);

  const normalizedActiveIndex = useMemo(() => {
    if (productImages.length === 0) return 0;
    return Math.min(activeImgIdx, productImages.length - 1);
  }, [activeImgIdx, productImages.length]);

  const galleryImageSrcs = useMemo(() => {
    return productImages.map((path: string) =>
      getOptimizedSupabaseImageUrl(path, { width: 1200, quality: 75 })
    ).filter(Boolean);
  }, [productImages]);

  const categoryVariants = useMemo(() => {
    const productSubCategoryKey = getProductSubCategoryKey(product);
    if (!productSubCategoryKey) return product ? [product] : [];

    const variants = products.filter((item: any) => {
      if (!item?.id) return false;
      return getProductSubCategoryKey(item) === productSubCategoryKey;
    });

    const includesCurrent = variants.some((item: any) => item.id === product.id);
    if (!includesCurrent && product) {
      return [product, ...variants];
    }

    return variants;
  }, [products, product]);

  const availableSizes = useMemo(() => {
    if (!activeVariant || !activeVariant.sizes || activeVariant.sizes.length === 0) return [];
    
    return [...activeVariant.sizes].sort((a, b) => {
      const matchA = a.match(/^(\d+)([A-Z]+)$/);
      const matchB = b.match(/^(\d+)([A-Z]+)$/);
      if (matchA && matchB) {
        const bandA = Number(matchA[1]);
        const bandB = Number(matchB[1]);
        if (bandA !== bandB) return bandA - bandB;
        return matchA[2].localeCompare(matchB[2]);
      }
      return a.localeCompare(b);
    });
  }, [activeVariant]);

  const isComboEligible = useMemo(() => {
    const subCategoryName = getProductSubCategoryName(activeVariant || product);
    return COMBO_ELIGIBLE_SUBCATEGORIES.has(subCategoryName);
  }, [activeVariant, product]);

  const comboTarget = 3;

  /* ---------------- FIXED DYNAMIC PRICE MATH ---------------- */
  const originalComboTotal = useMemo(() => {
    return comboItems.reduce((acc, curr) => {
      const parsedPrice = parseFloat(String(curr.product?.price || '0').replace(/[^0-9.]/g, '')) || 0;
      return acc + parsedPrice;
    }, 0);
  }, [comboItems]);

  const dynamicComboPrice = useMemo(() => {
    return Math.round(originalComboTotal * 0.90);
  }, [originalComboTotal]);

  const braFeatures = useMemo(() => {
    const baseFeatures = [
      { img: "/images/icons/Double_Layered_Cloth.png", label: "Double Layered" },
      { img: "/images/icons/Soft_Fabric.png", label: "Soft Fabric" },
    ];

    const productSignals = [
      activeVariant?.category,
      activeVariant?.subCategory?.name,
      (activeVariant as any)?.subCategoryName,
      activeVariant?.name,
    ]
      .map((value) => String(value || '').trim().toUpperCase())
      .filter(Boolean)
      .join(' | ');

    const isMinimizer =
      productSignals.includes('COMFY SUPPORTIVE MINIMIZER BRA') ||
      productSignals.includes('MINIMIZER');
    const isSideNetCoverage = productSignals.includes('SIDE NET COVERAGE BRA');
    const isBarelyThere = productSignals.includes('BARELY THERE - LIGHT PADDED, NON-WIRED COTTON BRA');
    const isEverydayWearComfy = productSignals.includes('EVERYDAY WEAR COMFY BRA');
    const isPaddedBra = productSignals.includes('PADDED BRA');

    const conditionalFeatures: { img: string; label: string }[] = [];

    if (isMinimizer) {
      conditionalFeatures.push(
        { img: "/images/icons/Minimizer_Moulded_Cups.png", label: "Moulded Cups" },
        { img: "/images/icons/Broad_Strap_3_Hook.png", label: "Broad Strap 3 Hook" }
      );
    }

    if (isSideNetCoverage) {
      conditionalFeatures.push({ img: "/images/icons/Netted_Mesh.png", label: "Netted Mesh" });
    }

    if (isBarelyThere || isEverydayWearComfy) {
      conditionalFeatures.push({ img: "/images/icons/detachable_strap.png", label: "Detachable Strap" });
    }

    // if (isBarelyThere) {
    //   conditionalFeatures.push({ img: "/images/icons/Light_fine_padded.jpeg", label: "Light Fine Padded" });
    // }

    if (isPaddedBra) {
      conditionalFeatures.push({ img: "/images/icons/Foam_Padding.jpeg", label: "Foam Padding" });
    }

    const deduped = [...conditionalFeatures, ...baseFeatures].filter(
      (feature, index, array) => array.findIndex((item) => item.img === feature.img) === index
    );

    return deduped;
  }, [activeVariant]);

  const scrollToReviews = () => {
    reviewRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const roundedAverageRating = useMemo(() => {
    return Math.round(averageRating);
  }, [averageRating]);

  const handleAddToBag = async () => {
    const userId = user?.id;
    if (!userId) {
      setToast({ message: "Please login first", type: 'error' });
      return;
    }
    if (!selectedSize) {
      setToast({ message: "Please select a size", type: 'info' });
      return;
    }
    if (!activeVariant || activeVariant.isDeleted || !activeVariant.isActive) {
      setToast({ message: 'Product is no longer available.', type: 'error' });
      return;
    }
    await addItemToCart(userId, activeVariant?.id, selectedSize, 1, activeVariant?.category, 0, '');
    if (!useStore.getState().error) {
      setToast({ message: "Added to bag!", type: 'success' });
    }
  };

  /* ---------------- COMBO ENGINE ACTIONS ---------------- */
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isComboEligible) {
      setIsComboChecked(false);
      return;
    }

    setIsComboChecked(e.target.checked);
    if (e.target.checked) {
      setIsComboModalOpen(true);
    }
  };

  useEffect(() => {
    if (isComboEligible) return;

    if (isComboChecked) setIsComboChecked(false);
    if (isComboModalOpen) setIsComboModalOpen(false);
    if (comboItems.length > 0) setComboItems([]);
  }, [isComboEligible, isComboChecked, isComboModalOpen, comboItems.length]);

  const addComboItemSlot = () => {
    if (!currentComboSize || !currentComboVariant) {
      setToast({ message: "Please choose both a size and color variant for this slot!", type: 'error' });
      return;
    }

    const candidateImages = Array.isArray(currentComboVariant?.product_images) ? currentComboVariant.product_images : [];
    const rawPath = candidateImages[0]?.image_path || currentComboVariant?.image || '';
    const imgUrl = getOptimizedSupabaseImageUrl(rawPath, { width: 220, quality: 70 });

    const newSlotItem: ComboSelection = {
      id: Math.random().toString(36).substring(2, 9),
      product: currentComboVariant,
      size: currentComboSize,
      colorVariantId: currentComboVariant.id,
      colorLabel: getProductColorLabel(currentComboVariant, 0),
      colorBg: getProductSwatchColor(currentComboVariant, 0),
      imageSrc: imgUrl
    };

    setComboItems((prev) => [...prev, newSlotItem]);
    setCurrentComboSize('');
  };

  const removeComboItemSlot = (idToRemove: string) => {
    setComboItems((prev) => prev.filter(item => item.id !== idToRemove));
  };

  const commitComboItemsToCart = async (applyComboPricing: boolean) => {
    const userId = user?.id;
    if (!userId) {
      setToast({ message: "Please login first", type: 'error' });
      return;
    }

    const comboBundleId = applyComboPricing ? createComboBundleId() : '';

    for (const item of comboItems) {
      await addItemToCart(
        userId,
        item.product.id,
        item.size,
        1,
        item.product.category,
        applyComboPricing ? 1 : 0,
        comboBundleId
      );
    }

    if (applyComboPricing) {
      setToast({ 
        message: `Success! 3 items added with Combo Price Applied: Rs.${dynamicComboPrice} (Original Price: Rs.${originalComboTotal})`, 
        type: 'success' 
      });
    } else {
      setToast({ 
        message: "Items added to bag with standard pricing calculations.", 
        type: 'info' 
      });
    }

    setComboItems([]);
    setIsComboModalOpen(false);
    setIsComboChecked(false);
  };

  const handleModalCloseRequest = () => {
    if (comboItems.length > 0 && comboItems.length < 3) {
      setShowDiscardPrompt(true);
    } else {
      setIsComboModalOpen(false);
      setIsComboChecked(false);
      setComboItems([]);
    }
  };

  const handleDiscardResponse = (shouldDiscard: boolean) => {
    setShowDiscardPrompt(false);
    if (shouldDiscard) {
      setComboItems([]);
      setIsComboModalOpen(false);
      setIsComboChecked(false);
    } else {
      commitComboItemsToCart(false);
    }
  };

  return (
    <div className="bg-[#F9F3F5] min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow flex flex-col px-4 md:px-8 pt-24 md:pt-28 pb-12">
        <div className="max-w-[1440px] mx-auto w-full">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#321327]/60 py-3 md:py-4 transition-colors hover:text-[#840d5c]"
          >
            <ChevronLeft size={12} />
            Back to Collection
          </button>
        </div>

        <div className="max-w-[1440px] mx-auto w-full space-y-8">
          <div className="flex flex-col lg:flex-row gap-8 bg-white p-4 lg:p-8 rounded-[3rem] shadow-sm border border-[#840d5c]/5 items-center lg:items-start overflow-hidden">
            
            {/* THUMBNAILS */}
            <div className="order-2 lg:order-1 flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-y-auto no-scrollbar w-full md:w-24 lg:max-h-[550px] flex-shrink-0 py-0.5">
              {productImages.map((imagePath: string, index: number) => {
                const thumbSrc = getOptimizedSupabaseImageUrl(imagePath, { width: 220, quality: 70 });
                if (!thumbSrc) return null;
                return (
                  <button
                    key={index}
                    onClick={() => setActiveImgIdx(index)}
                    className={`relative w-16 h-20 md:w-full md:h-28 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
                      normalizedActiveIndex === index
                        ? 'border-[#840d5c] shadow-md'
                        : 'border-transparent opacity-40 hover:opacity-100'
                    }`}
                  >
                    <Image src={thumbSrc} alt="thumb" fill sizes="96px" className="object-cover w-full h-full" />
                  </button>
                );
              })}
            </div>

            {/* MAIN IMAGE CONTAINER */}
            <div className="order-1 lg:order-2 relative flex-shrink-0 w-full md:w-[80%] lg:w-[500px] aspect-[4/5] lg:h-[550px] rounded-[2rem] overflow-hidden group bg-neutral-50/40">
              <div className="absolute top-0 bottom-0 right-2 md:right-4 z-20 flex flex-col justify-center gap-5 my-auto">
                {braFeatures.map((feature, i) => (
                  <div key={i} className="group/feat relative flex items-center justify-center">
                    <div className="w-8 h-8 md:w-11 md:h-11 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-[#840d5c]/5 flex items-center justify-center transition-all duration-500 cursor-help overflow-hidden p-2">
                      <div className="relative w-full h-full">
                        <Image src={feature.img} alt={feature.label} fill sizes="44px" className="object-contain" />
                      </div>
                    </div>
                    <span className="absolute right-14 whitespace-nowrap bg-[#321327] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl opacity-0 translate-x-4 group-hover/feat:opacity-100 group-hover/feat:translate-x-0 transition-all pointer-events-none shadow-xl">
                      {feature.label}
                    </span>
                  </div>
                ))}
              </div>

              {galleryImageSrcs.map((src: string, idx: number) => (
                <Image
                  key={src}
                  src={src}
                  alt={idx === 0 ? 'Product Main Image' : `Product Image ${idx + 1}`}
                  fill
                  priority={idx === 0}
                  sizes="500px"
                  className={`object-contain p-6 transition-opacity duration-300 ${
                    idx === normalizedActiveIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                />
              ))}
            </div>

            {/* TEXT DETAILS PANEL */}
            <div className="order-3 w-full flex-grow flex flex-col justify-center lg:pl-4">
              <div className="space-y-5 py-1">
                <header className="space-y-1.5">
                  <p className="text-[10px] font-bold tracking-[0.4em] text-[#840d5c] uppercase opacity-70">
                    Signature Collection
                  </p>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-[#321327] leading-[1.2] block tracking-normal break-words">
                    {activeVariant?.name}
                  </h1>

                  <button onClick={scrollToReviews} className="flex flex-wrap items-center gap-2.5 hover:opacity-70 transition-opacity pt-0.5">
                      <span className="flex items-center text-[#840d5c]">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={`stat-star-${i}`}
                            size={11}
                            fill={i < roundedAverageRating ? 'currentColor' : 'none'}
                            strokeWidth={i < roundedAverageRating ? 0 : 1.5}
                          />
                        ))}
                      </span>
                      <span className="text-xs font-bold text-[#321327]">{averageRating.toFixed(1)}</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#321327]/5 border border-[#321327]/15 text-[#321327]">
                      <MessageSquare size={12} className="text-[#840d5c]" />
                      <span className="text-[10px] font-bold tracking-wider uppercase">{reviewCount}</span>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-[#321327]/70">Reviews</span>
                    </span>
                  </button>

                  {categoryVariants.length > 0 && (
                    <div className="pt-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#321327]/50 mb-2">Colors</p>
                      <div className="flex flex-wrap items-center gap-2.5">
                        {categoryVariants.map((variant: any, index: number) => {
                          const isActive = String(variant.id) === String(activeVariant?.id);
                          const colorLabel = getProductColorLabel(variant, index);
                          return (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() => {
                                if (String(variant.id) === String(activeVariant?.id)) return;
                                setSelectedVariantId(String(variant.id));
                                setActiveImgIdx(0);
                                setSelectedSize('');
                                setCurrentComboVariant(variant);
                              }}
                              className={`h-6 w-6 rounded-full border transition-all ${
                                isActive ? 'border-[#321327] ring-2 ring-[#321327]/25' : 'border-[#321327]/20 hover:border-[#321327]/45'
                              }`}
                              style={{ backgroundColor: getProductSwatchColor(variant, index) }}
                              title={colorLabel}
                              aria-label={`Show ${colorLabel}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {isComboEligible && (
                    <label className="flex items-center gap-3 bg-[#840d5c]/5 border border-[#840d5c]/20 rounded-xl p-3 cursor-pointer select-none hover:bg-[#840d5c]/10 transition-colors max-w-sm">
                      <input 
                        type="checkbox"
                        checked={isComboChecked}
                        onChange={handleCheckboxChange}
                        className="w-4 h-4 rounded border-gray-300 text-[#840d5c] focus:ring-[#840d5c]"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[#321327]">Select pack of 3 & get combo</span>
                        <span className="text-[10px] text-[#840d5c] font-medium font-serif">Get 10% off on your bundle selection!</span>
                      </div>
                    </label>
                  )}
                </header>

                {/* PRICING & COMBO SELECTION */}
                <div className="border-y border-[#840d5c]/10 py-3 space-y-3">
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl sm:text-3xl font-bold text-[#321327] tracking-tighter">
                      Rs.{activeVariant?.price}
                    </span>

                  </div>



                  {/* DESCRIPTION WITH READ MORE */}
                  <div className="space-y-1">
                    <DescriptionAccordion
                      description={activeVariant?.description || "Crafted with our proprietary seamless technology for a second-skin feel."}
                    />
                    <FabricTypeAccordion fabricType={(activeVariant as any)?.fabricType} />
                    <HygienePolicyAccordion />
                  </div>
                </div>

                {/* SIZES */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-[#321327]">
                    <span>Size Available</span>
                    <button onClick={() => setIsSizeGuideOpen(true)} className="text-[#840d5c] underline decoration-2 underline-offset-4 font-bold hover:opacity-80 transition-opacity">
                      Size Guide
                    </button>
                  </div>

                  <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-2.5 sm:gap-3">
                    {availableSizes.map((size) => {
                      const isSelected = selectedSize === size;
                      return (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`w-full sm:w-auto sm:min-w-[64px] h-9 sm:h-8 border text-xs sm:text-sm font-medium rounded-xl sm:rounded-2xl transition-all duration-200 flex items-center justify-center active:scale-95 shadow-sm ${
                            isSelected ? 'bg-black border-black text-white' : 'bg-white border-[#321327]/10 text-[#321327] hover:border-[#840d5c]/40'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-2.5 pt-1.5">
                    <button
                      onClick={handleAddToBag}
                      className="w-full text-white py-3 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 shadow-md transition-all active:scale-[0.98] bg-[#840d5c] hover:bg-[#321327] shadow-[#840d5c]/20"
                    >
                      <ShoppingBag size={16} /> Add To Bag
                    </button>

                    <button
                      onClick={() => {
                        setReviewComposerSignal((prev) => prev + 1);
                        scrollToReviews();
                      }}
                      className="w-full bg-white border-2 border-[#321327]/10 text-[#321327] py-3 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:border-[#840d5c] hover:text-[#840d5c] transition-all"
                    >
                      <MessageSquare size={14} /> Write A Review
                    </button>
                  </div>
                </div>

                {/* TRUST ICONS */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="flex items-center gap-3 p-2 bg-[#F9F3F5] rounded-xl border border-[#840d5c]/5">
                    <Truck size={18} className="text-[#840d5c]" />
                    <span className="text-[9px] font-bold uppercase text-[#321327]/60 leading-tight tracking-wider">Express <br />Shipping</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-[#F9F3F5] rounded-xl border border-[#840d5c]/5">
                    <ShieldCheck size={18} className="text-[#840d5c]" />
                    <span className="text-[9px] font-bold uppercase text-[#321327]/60 leading-tight tracking-wider">Quality <br />Assured</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-[#F9F3F5] rounded-xl border border-[#840d5c]/5">
                    <XCircle size={18} className="text-[#840d5c]" />
                    <span className="text-[9px] font-bold uppercase text-[#321327]/60 leading-tight tracking-wider">No <br />Return Policy</span>
                  </div>    
                </div>



              </div>
            </div>
          </div>

          <div>
            <Image src={'/images/Confidence_Preview_4.png'} alt="Product Detail Image" width={1200} height={800} className="w-full h-auto rounded-3xl object-cover object-center shadow-lg" />
          </div>

          <div ref={reviewRef}>
            <ReviewSection productId={id?.toString() || ''} openComposerSignal={reviewComposerSignal} />
          </div>
        </div>
      </main>

      {/* ---------------- PACK OF 3 DYNAMIC COMBO MODAL ---------------- */}
      {isComboModalOpen && isComboEligible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="p-6 bg-[#840d5c]/5 border-b border-[#840d5c]/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="text-[#840d5c] animate-bounce" size={20} />
                <div>
                  <h3 className="text-lg font-serif text-[#321327]">Build Your Pack of 3 Combo</h3>
                  <p className="text-xs text-[#840d5c] font-medium">
                    {comboItems.length === 3 
                      ? `🎉 10% discount unlocked! Total: Rs.${dynamicComboPrice}` 
                      : "Choose 3 items to unlock 10% off the total purchase price"}
                  </p>
                </div>
              </div>
              <button onClick={handleModalCloseRequest} className="p-1.5 rounded-full hover:bg-black/5 transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-grow no-scrollbar">
              {comboItems.length < 3 ? (
                <div className="bg-[#F9F3F5]/60 border border-[#840d5c]/10 rounded-2xl p-4 space-y-4">
                  <p className="text-xs font-bold text-[#840d5c] uppercase tracking-wider">Configure Slot #{comboItems.length + 1}</p>
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative w-24 h-28 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 border">
                      {currentComboVariant && (
                        <Image 
                          src={getOptimizedSupabaseImageUrl((currentComboVariant.product_images && currentComboVariant.product_images[0]?.image_path) || currentComboVariant.image || '', { width: 220, quality: 70 })}
                          alt="Combo slot thumbnail" fill className="object-cover"
                        />
                      )}
                    </div>

                    <div className="flex-grow space-y-3 w-full">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider block mb-1">Select Color Variant:</span>
                        <div className="flex flex-wrap items-center gap-2">
                          {categoryVariants.map((variant: any, idx: number) => {
                            const isMatch = currentComboVariant?.id === variant.id;
                            return (
                              <button
                                key={variant.id} type="button" onClick={() => setCurrentComboVariant(variant)}
                                className={`h-6 w-6 rounded-full border transition-all ${isMatch ? 'ring-2 ring-[#840d5c] scale-110 border-black' : 'opacity-70'}`}
                                style={{ backgroundColor: getProductSwatchColor(variant, idx) }}
                                title={getProductColorLabel(variant, idx)}
                              />
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider block mb-1">Select Size:</span>
                        <select
                          value={currentComboSize} onChange={(e) => setCurrentComboSize(e.target.value)}
                          className="w-full text-xs rounded-xl border-gray-300 shadow-sm focus:border-[#840d5c] focus:ring-[#840d5c] bg-white p-2"
                        >
                          <option value="">-- Choose Size --</option>
                          {availableSizes.map(size => <option key={size} value={size}>{size}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center text-emerald-800 text-sm font-medium">
                  🎉 Bundle Complete! 10% Discount is ready to be locked in.
                </div>
              )}

              {/* LIST BUNDLE TRACK ITEMS - VISIBLE ON DESKTOP */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-[#321327] uppercase tracking-wider block">Your Bundle Track ({comboItems.length}/3)</span>
                {comboItems.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-4 text-center">No items configured yet. Build your slot above.</p>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto md:max-h-none md:overflow-visible pr-1 no-scrollbar">
                    {comboItems.map((item) => (
                      <div key={item.id} className="group relative flex items-center bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm transition-all hover:border-red-200">
                        <div className="flex items-center p-3 w-full transition-transform duration-300 ease-out transform group-hover:-translate-x-12 bg-white z-10">
                          <div className="relative w-12 h-16 rounded-lg bg-gray-50 overflow-hidden border flex-shrink-0">
                            <Image src={item.imageSrc} alt="Selected visual" fill className="object-cover" />
                          </div>
                          <div className="ml-3 flex-grow text-xs">
                            <h4 className="font-bold text-[#321327] line-clamp-1">{item.product?.name || 'Product'}</h4>
                            <p className="text-gray-500 mt-0.5">Size: <span className="font-bold text-black">{item.size}</span></p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: item.colorBg }} />
                              <span className="text-[10px] text-gray-400">{item.colorLabel}</span>
                            </div>
                          </div>
                          <div className="text-right text-xs pr-2">
                            <span className="font-bold text-gray-700 block">Rs.{item.product?.price}</span>
                            <span className="text-[10px] text-[#840d5c] font-semibold">Combo Spl</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeComboItemSlot(item.id)}
                          className="absolute right-0 top-0 bottom-0 w-12 bg-red-500 text-white flex items-center justify-center hover:bg-red-600 z-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Control Panel */}
            <div className="p-6 bg-gray-50 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs">
                <div className="flex items-center gap-1.5 font-bold text-gray-600">
                  <span>Total Original:</span>
                  <span>Rs.{originalComboTotal}</span>
                </div>
                <div className="font-bold text-[#840d5c] text-sm">
                  Combo Price: {comboItems.length === 3 ? `Rs.${dynamicComboPrice}` : "Pending 3 selections"}
                </div>
              </div>

              <div>
                {comboItems.length < 3 ? (
                  <button
                    onClick={addComboItemSlot} disabled={!currentComboSize}
                    className="w-full sm:w-auto bg-[#840d5c] text-white px-6 py-2.5 rounded-full font-bold uppercase tracking-wider text-[11px] transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#321327]"
                  >
                    Add Product
                  </button>
                ) : (
                  <button
                    onClick={() => commitComboItemsToCart(true)}
                    className="w-full sm:w-auto bg-emerald-600 text-white px-6 py-2.5 rounded-full font-bold uppercase tracking-wider text-[11px] transition-all hover:bg-emerald-700 shadow-md"
                  >
                    Complete Bundle
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* DISCARD PROMPT */}
      {showDiscardPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-gray-100">
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto text-xl">⚠️</div>
            <div>
              <h4 className="font-serif text-[#321327] text-base font-bold">Discard Combo Selections?</h4>
              <p className="text-xs text-gray-500 mt-1">You have configured {comboItems.length} item(s). Discard combo completely or add them at normal price rates?</p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={() => handleDiscardResponse(true)} className="bg-red-50 text-red-700 border border-red-200 py-2 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors">
                Yes, Discard
              </button>
              <button onClick={() => handleDiscardResponse(false)} className="bg-gray-900 text-white py-2 rounded-xl text-xs font-bold hover:bg-black transition-colors">
                No, Add Standard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIZE GUIDE DRAWER */}
      <div className={`fixed inset-0 z-50 transition-visibility duration-300 ${isSizeGuideOpen ? "visible" : "invisible"}`}>
        <div onClick={() => setIsSizeGuideOpen(false)} className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isSizeGuideOpen ? "opacity-100" : "opacity-0"}`} />
        <div className={`absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl p-6 md:p-8 flex flex-col transform transition-transform duration-300 ease-in-out ${isSizeGuideOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="flex items-center justify-between border-b border-[#840d5c]/10 pb-4 mb-6">
            <div>
              <h3 className="text-xl font-serif text-[#321327]">Size Guide</h3>
              <p className="text-[10px] font-bold tracking-wider uppercase text-[#840d5c] mt-0.5">Find your perfect cup fit</p>
            </div>
            <button onClick={() => setIsSizeGuideOpen(false)} className="p-2 rounded-full text-[#321327]/60 hover:text-[#840d5c] hover:bg-[#F9F3F5] transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto no-scrollbar space-y-6">
            <div className="border border-[#321327]/10 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs text-[#321327]">
                <thead className="bg-[#840d5c]/5 text-[10px] font-bold uppercase tracking-wider text-[#840d5c]">
                  <tr>
                    <th className="p-3.5">Band</th>
                    <th className="p-3.5">Underbust Range</th>
                    <th className="p-3.5">Available Cups</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#321327]/5 font-medium">
                  {['28', '30', '32', '34', '36', '38'].map((band, idx) => (
                    <tr key={band} className="hover:bg-[#F9F3F5]/30 transition-colors">
                      <td className="p-3.5 font-bold text-[#840d5c]">{band}</td>
                      <td className="p-3.5">{26 + idx * 2}" - {27.5 + idx * 2}"</td>
                      <td className="p-3.5 space-x-1">
                        {idx === 0 ? (
                          <span className="bg-[#840d5c]/5 text-[#840d5c] px-2 py-0.5 rounded font-bold text-[10px]">B</span>
                        ) : (
                          ['B', 'C', 'D'].slice(0, idx === 1 || idx === 5 ? 2 : 3).map(cup => (
                            <span key={cup} className="bg-[#840d5c]/5 text-[#840d5c] px-2 py-0.5 rounded font-bold text-[10px]">{cup}</span>
                          ))
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 border-t border-[#840d5c]/10">
            <button onClick={() => setIsSizeGuideOpen(false)} className="w-full text-white py-3 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] bg-[#840d5c] hover:bg-[#321327] transition-all">
              Got It, Thanks
            </button>
          </div>
        </div>
      </div>

      {/* TOAST NOTIFICATION CONTAINER */}
      {toast && (
        <div className="fixed top-5 right-5 z-[100] max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`p-4 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-medium backdrop-blur-md transition-all duration-300 ${
            toast.type === 'success' 
              ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800' 
              : toast.type === 'error'
              ? 'bg-red-50/95 border-red-200 text-red-800'
              : 'bg-[#321327]/95 border-[#840d5c]/20 text-white'
          }`}>
            <span>{toast.type === 'success' ? '🎉' : toast.type === 'error' ? '⚠️' : '✨'}</span>
            <p className="flex-grow">{toast.message}</p>
            <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100 ml-2 font-bold p-1">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default SingleProductPage;