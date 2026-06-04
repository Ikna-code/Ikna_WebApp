"use client";
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import {
  ShoppingBag,
  Star,
  ShieldCheck,
  Truck,
  ChevronLeft,
  MessageSquare,
  X,
  XCircle,
} from 'lucide-react';

import ReviewSection from '@/app/reviews/page';
import { useStore } from '@/store/useStore';
import Footer from '@/components/layout/Footer';
import { getOptimizedSupabaseImageUrl } from '@/lib/supabaseImage';
import {
  getProductCategoryKey,
  getProductColorLabel,
  getProductSwatchColor,
} from '@/lib/productVariants';

/* ---------------- COMPONENT ---------------- */

const SingleProductPage = () => {
  const { id } = useParams();
  const router = useRouter();

  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false); 
  const [selectedSize, setSelectedSize] = useState<string>('');

  const reviewRef = useRef<HTMLDivElement>(null);

  /* ---------------- LOCK BODY SCROLL ---------------- */
  useEffect(() => {
    if (isSizeGuideOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isSizeGuideOpen]);

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

  /* ---------------- PRODUCT ---------------- */

  const product = useMemo(() => {
    return productData && productData.id === productId ? productData : null;
  }, [productData, productId]);

  const categoryVariants = useMemo(() => {
    if (!product?.category) return product ? [product] : [];

    const productCategoryKey = getProductCategoryKey(product);
    const variants = products.filter((item: any) => {
      if (!item?.id) return false;
      return getProductCategoryKey(item) === productCategoryKey;
    });

    const includesCurrent = variants.some((item: any) => item.id === product.id);
    if (!includesCurrent && product) {
      return [product, ...variants];
    }

    return variants;
  }, [products, product]);

  /* ---------------- SORTED SIZES ARRAY FOR THE CHIP LIST ---------------- */
  const availableSizes = useMemo(() => {
    if (!product || !product.sizes || product.sizes.length === 0) return [];
    
    return [...product.sizes].sort((a, b) => {
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
  }, [product]);

  /* ---------------- COMBO STATE ---------------- */

  const comboTarget = 3;

  const comboSelected = useMemo(() => {
    if (!product || !cartItems) return 0;

    return cartItems.reduce((count: number, item: any) => {
      const itemCategory = item?.category || item?.product?.category;

      if (itemCategory && product?.category && 
          itemCategory.trim().toLowerCase() === product.category.trim().toLowerCase()) {
        return count + (item.quantity || 1);
      }

      return count;
    }, 0);
  }, [cartItems, product]);

  const comboRemaining = Math.max(comboTarget - comboSelected, 0);
  const comboProgress = Math.min((comboSelected / comboTarget) * 100, 100);

  /* ---------------- DYNAMIC FEATURES BY CATEGORY ---------------- */

  const braFeatures = useMemo(() => {
    const features = [
      { img: "/images/icons/Double_Layered_Cloth.png", label: "Double Layered" },
      { img: "/images/icons/Soft_Fabric.png", label: "Soft Fabric" },
    ];

    if (!product?.category) return features;

    const normalizedCategory = product.category.trim().toUpperCase();

    if (normalizedCategory === 'COMFY SUPPORTIVE MINIMIZER BRA') {
      features.unshift(
        { img: "/images/icons/Broad_Strap_3_Hook.png", label: "Broad Strap 3 Hook" },
        { img: "/images/icons/Minimizer_Moulded_Cups.png", label: "Moulded Cups" }
      );
    } else if (normalizedCategory === 'SIDE NET COVERAGE BRA') {
      features.unshift(
        { img: "/images/icons/Netted_Mesh.png", label: "Netted Mesh" }
      );
    }

    return features;
  }, [product?.category]);

  /* ---------------- REVIEW SCROLL ---------------- */

  const scrollToReviews = () => {
    reviewRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  /* ---------------- ADD TO BAG ---------------- */

  const handleAddToBag = async () => {
    const userId = user?.id;
    if (!userId) {
      alert("Please login first");
      return;
    }

    if (!selectedSize) {
      alert("Please select a size");
      return;
    }

    await addItemToCart(userId, product?.id, selectedSize, 1, product?.category);

    if (!useStore.getState().error) {
      alert("Added to bag!");
    }
  };

  /* ---------------- LOADING ---------------- */

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F3F5]">
        <div className="animate-pulse text-[#840d5c] font-bold tracking-widest">
          LOADING PRODUCT...
        </div>
      </div>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="bg-[#F9F3F5] min-h-screen flex flex-col">

      <Header />

      <main className="flex-grow flex flex-col px-4 md:px-8 pb-12">

        {/* BACK BUTTON */}
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

          {/* PRODUCT SECTION CARD */}
          <div className="flex flex-col lg:flex-row gap-8 bg-white p-4 lg:p-8 rounded-[3rem] shadow-sm border border-[#840d5c]/5 items-center lg:items-start overflow-hidden">

            {/* LEFT CONTAINER: THUMBNAILS Track */}
<div className="flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-y-auto no-scrollbar w-full md:w-24 lg:max-h-[550px] flex-shrink-0 py-0.5">
  {productData?.product_images?.map(
    (fileName: { image_path: string }, index: number) => (
      <button
        key={index}
        onClick={() => setActiveImgIdx(index)}
        className={`relative w-16 h-20 md:w-full md:h-28 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
          activeImgIdx === index
            ? 'border-[#840d5c] shadow-md'
            : 'border-transparent opacity-40 hover:opacity-100'
        }`}
      >
        <Image
          src={getOptimizedSupabaseImageUrl(fileName.image_path, { width: 220, quality: 70 })}
          alt="thumb"
          fill // 1. Added fill so it stretches nicely inside the button container
          sizes="(max-width: 768px) 64px, 96px" // 2. Added sizes since these are small thumbnails
          className="
            object-cover 
            w-full 
            h-full
          "
        />
      </button>
    )
  )}
</div>

            {/* MIDDLE CONTAINER: MAIN IMAGE CONTAINER */}
            <div className="relative flex-shrink-0 w-full md:w-[80%] lg:w-[500px] aspect-[4/5] lg:h-[550px] rounded-[2rem] overflow-hidden group bg-neutral-50/40">

              {/* FEATURE FLOATING PNG ICONS */}
              <div className="absolute top-0 bottom-0 right-2 md:right-4 z-20 flex flex-col justify-center gap-5 my-auto">
                {braFeatures.map((feature, i) => (
                  <div
                    key={i}
                    className="group/feat relative flex items-center justify-center"
                  >
                    {/* Removed hover background changes and text colors that interfere with pure image rendering */}
                    <div className="w-8 h-8 md:w-11 md:h-11 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-[#840d5c]/5 flex items-center justify-center transition-all duration-500 cursor-help overflow-hidden p-2">
                      <div className="relative w-full h-full">
                        <Image 
                          src={feature.img}
                          alt={feature.label}
                          fill
                          className="object-contain" 
                        />
                      </div>
                    </div>

                    <span className="absolute right-14 whitespace-nowrap bg-[#321327] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl opacity-0 translate-x-4 group-hover/feat:opacity-100 group-hover/feat:translate-x-0 transition-all pointer-events-none shadow-xl">
                      {feature.label}
                    </span>
                  </div>
                ))}
              </div>

              <Image
                src={getOptimizedSupabaseImageUrl(productData?.product_images[activeImgIdx]?.image_path, { width: 1200, quality: 75 })}
                alt="Product Main Image"
                fill
                priority
                className="object-contain p-6 transition-transform duration-1000 group-hover:scale-105"
              />
            </div>

            {/* RIGHT CONTAINER: TEXT DETAILS PANEL */}
            <div className="w-full flex-grow flex flex-col justify-center lg:pl-4">
              <div className="space-y-5 py-1">

                {/* HEADING DETAILS */}
                <header className="space-y-1.5">
                  <p className="text-[10px] font-bold tracking-[0.4em] text-[#840d5c] uppercase opacity-70">
                    Signature Collection
                  </p>

                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-[#321327] leading-[1.2] block tracking-normal break-words">
                    {product.name}
                  </h1>

                  {categoryVariants.length > 0 && (
                    <div className="pt-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#321327]/50 mb-2">
                        Colors
                      </p>
                      <div className="flex flex-wrap items-center gap-2.5">
                        {categoryVariants.map((variant: any, index: number) => {
                          const isActive = variant.id === product.id;
                          const colorLabel = getProductColorLabel(variant, index);
                          return (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() => {
                                if (variant.id === product.id) return;
                                router.push(`/product/${variant.id}`, {
                                  scroll: true,
                                });
                              }}
                              className={`h-6 w-6 rounded-full border transition-all ${
                                isActive
                                  ? 'border-[#321327] ring-2 ring-[#321327]/25'
                                  : 'border-[#321327]/20 hover:border-[#321327]/45'
                              }`}
                              style={{
                                backgroundColor: getProductSwatchColor(variant, index),
                              }}
                              title={colorLabel}
                              aria-label={`Show ${colorLabel}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={scrollToReviews}
                    className="flex items-center gap-3 hover:opacity-70 transition-opacity pt-0.5"
                  >
                    <div className="flex text-[#840d5c]">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          fill="currentColor"
                          strokeWidth={0}
                        />
                      ))}
                    </div>

                    <span className="text-[10px] font-bold text-[#321327] tracking-widest uppercase border-b border-[#321327]/20 pb-0.5">
                      824 Reviews
                    </span>
                  </button>
                </header>

                {/* PRICING FIELDS */}
                <div className="border-y border-[#840d5c]/10 py-3">
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl sm:text-3xl font-bold text-[#321327] tracking-tighter">
                      Rs.{product.price}
                    </span>

                    <span className="text-xs text-[#321327]/40 line-through">
                      Rs.485.00
                    </span>
                  </div>

                  <p className="text-[12px] text-[#321327]/60 mt-2 leading-relaxed font-medium">
                    {product.description ||
                      "Crafted with our proprietary seamless technology for a second-skin feel."}
                  </p>
                </div>

                {/* CONFIGURATION SELECTION */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-[#321327]">
                    <span>Size Available</span>
                    <button 
                      onClick={() => setIsSizeGuideOpen(true)}
                      className="text-[#840d5c] underline decoration-2 underline-offset-4 font-bold hover:opacity-80 transition-opacity"
                    >
                      Size Guide
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {availableSizes.map((size) => {
                      const isSelected = selectedSize === size;
                      return (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`min-w-[64px] h-5 px-0 border text-sm font-medium rounded-2xl transition-all duration-200 flex items-center justify-center active:scale-95 shadow-sm ${
                            isSelected
                              ? 'bg-black border-black text-white'
                              : 'bg-white border-[#321327]/10 text-[#321327] hover:border-[#840d5c]/40'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>

                  {/* ACTIONS TRIGGERS */}
                  <div className="flex flex-col gap-2.5 pt-1.5">
                    <button
                      onClick={handleAddToBag}
                      className="w-full text-white py-3 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 shadow-md transition-all active:scale-[0.98] bg-[#840d5c] hover:bg-[#321327] shadow-[#840d5c]/20"
                    >
                      <ShoppingBag size={16} />
                      Add To Bag
                    </button>

                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="w-full bg-white border-2 border-[#321327]/10 text-[#321327] py-3 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:border-[#840d5c] hover:text-[#840d5c] transition-all"
                    >
                      <MessageSquare size={14} />
                      Write A Review
                    </button>
                  </div>
                </div>

                {/* SHIPPING/COMPLIANCE REASSURANCES */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="flex items-center gap-3 p-2 bg-[#F9F3F5] rounded-xl border border-[#840d5c]/5">
                    <Truck size={18} className="text-[#840d5c]" />
                    <span className="text-[9px] font-bold uppercase text-[#321327]/60 leading-tight tracking-wider">
                      Express <br />Shipping
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-2 bg-[#F9F3F5] rounded-xl border border-[#840d5c]/5">
                    <ShieldCheck size={18} className="text-[#840d5c]" />
                    <span className="text-[9px] font-bold uppercase text-[#321327]/60 leading-tight tracking-wider">
                      Quality <br />Assured
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-2 bg-[#F9F3F5] rounded-xl border border-[#840d5c]/5">
                    <XCircle size={18} className="text-[#840d5c]" />
                    <span className="text-[9px] font-bold uppercase text-[#321327]/60 leading-tight tracking-wider">
                      No <br />Return Policy
                    </span>
                  </div>    
                </div>

              </div>
            </div>
          </div>

          {/* FULL WIDTH COMBO SECTION */}
          <div className="bg-white rounded-[2.5rem] border border-[#840d5c]/5 shadow-sm overflow-hidden">
            
            <div className="px-6 md:px-8 pt-8 pb-6 bg-gradient-to-b from-[#fff7fb] to-white">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
                
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#840d5c]/10 flex items-center justify-center flex-shrink-0 text-xl">
                    🎁
                  </div>
                  <div>
                    <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.3em] text-[#840d5c] mb-1">
                      Combo Offer
                    </p>
                    <h2 className="text-xl md:text-2xl font-serif text-[#321327] leading-tight">
                      Pick any 3 Bras from this collection
                    </h2>
                    <p className="text-lg md:text-xl font-bold text-[#840d5c] mt-1">
                      Get all 3 for just Rs.999
                    </p>
                    <p className="text-xs text-[#321327]/60 mt-1 max-w-lg leading-relaxed">
                      Mix colors, sizes and styles. Best combo pricing is automatically applied.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-start xl:justify-end gap-2.5 bg-[#fff7fb] p-3 rounded-2xl border border-[#840d5c]/5">
                  <div className="flex -space-x-4 hover:space-x-1 transition-all duration-300">
                    {[1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="relative w-14 h-18 md:w-16 md:h-20 rounded-xl overflow-hidden border-2 border-white bg-white shadow-sm flex-shrink-0"
                      >
                        <Image
                          src={getOptimizedSupabaseImageUrl(productData?.product_images[0]?.image_path, { width: 320, quality: 70 })}
                          alt="combo item"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="text-xl font-bold text-[#840d5c] px-1">=</div>

                  <div className="bg-[#840d5c] text-white px-4 py-2 rounded-xl flex flex-col items-center justify-center shadow-md">
                    <span className="text-[9px] uppercase tracking-wider opacity-70">Combo</span>
                    <span className="text-sm md:text-base font-bold whitespace-nowrap">Rs.999</span>
                  </div>
                </div>

              </div>

              <div className="mt-6 pt-5 border-t border-[#840d5c]/5">
                <div className="flex items-center justify-between gap-4 mb-2 text-xs">
                  <p className="font-bold text-[#321327]">
                    {comboRemaining > 0
                      ? `Add ${comboRemaining} more bras to unlock combo pricing.`
                      : "Combo unlocked successfully!"}
                  </p>
                  <span className="bg-[#840d5c]/10 text-[#840d5c] px-2.5 py-1 rounded-full font-bold text-[11px]">
                    {comboSelected}/{comboTarget} Selected
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#840d5c]/10 overflow-hidden">
                  <div
                    className="h-full bg-[#840d5c] rounded-full transition-all duration-500"
                    style={{ width: `${comboProgress}%` }}
                  />
                </div>
              </div>

            </div>

            <div className="px-6 md:px-8 py-4 bg-[#fff7fb] border-t border-[#840d5c]/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="text-xs">
                <span className="font-serif text-[#321327] font-bold block sm:inline mr-1">How it works:</span>
                <span className="text-[#321327]/60">Applied automatically in cart. No Coupon Needed.</span>
              </div>

              <div className="grid grid-cols-2 sm:flex items-center gap-x-4 gap-y-2">
                {[
                  "Browse Collection",
                  "Add Any 3 Bras",
                  "Auto Applied",
                  "Pay Just Rs.999"
                ].map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#840d5c] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#321327]/70 whitespace-nowrap">
                      {step}
                    </span>
                    {idx < 3 && <span className="hidden sm:inline text-[#840d5c]/30 text-xs">→</span>}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* BANNER IMAGES */}
          <div>
            <Image
              src={'/images/Confidence_Preview_4.png'}
              alt="Product Detail Image"
              width={1200}
              height={800}
              className="w-full h-auto rounded-3xl object-cover object-center shadow-lg"
            />
          </div>

          {/* REVIEWS TRACK */}
          <div ref={reviewRef}>
            <ReviewSection productId={id?.toString() || ''} />
          </div>

        </div>
      </main>

      {/* ---------------- RIGHT SIDE BRA SIZE GUIDE DRAWER ---------------- */}
      <div 
        className={`fixed inset-0 z-50 transition-visibility duration-300 ${
          isSizeGuideOpen ? "visible" : "invisible"
        }`}
      >
        <div 
          onClick={() => setIsSizeGuideOpen(false)}
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
            isSizeGuideOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <div 
          className={`absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl p-6 md:p-8 flex flex-col transform transition-transform duration-300 ease-in-out ${
            isSizeGuideOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#840d5c]/10 pb-4 mb-6">
            <div>
              <h3 className="text-xl font-serif text-[#321327]">Size Guide</h3>
              <p className="text-[10px] font-bold tracking-wider uppercase text-[#840d5c] mt-0.5">Find your perfect cup fit</p>
            </div>
            <button 
              onClick={() => setIsSizeGuideOpen(false)}
              className="p-2 rounded-full text-[#321327]/60 hover:text-[#840d5c] hover:bg-[#F9F3F5] transition-all"
            >
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
                  <tr className="hover:bg-[#F9F3F5]/30 transition-colors">
                    <td className="p-3.5 font-bold text-[#840d5c]">28</td>
                    <td className="p-3.5">27" - 28.5"</td>
                    <td className="p-3.5">
                      <span className="bg-[#840d5c]/5 text-[#840d5c] px-2 py-0.5 rounded font-bold text-[10px]">B</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F9F3F5]/30 transition-colors">
                    <td className="p-3.5 font-bold text-[#840d5c]">30</td>
                    <td className="p-3.5">29" - 30.5"</td>
                    <td className="p-3.5 space-x-1">
                      {['B', 'C'].map(cup => (
                        <span key={cup} className="bg-[#840d5c]/5 text-[#840d5c] px-2 py-0.5 rounded font-bold text-[10px]">{cup}</span>
                      ))}
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F9F3F5]/30 transition-colors">
                    <td className="p-3.5 font-bold text-[#840d5c]">32</td>
                    <td className="p-3.5">31" - 32.5"</td>
                    <td className="p-3.5 space-x-1">
                      {['B', 'C', 'D'].map(cup => (
                        <span key={cup} className="bg-[#840d5c]/5 text-[#840d5c] px-2 py-0.5 rounded font-bold text-[10px]">{cup}</span>
                      ))}
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F9F3F5]/30 transition-colors">
                    <td className="p-3.5 font-bold text-[#840d5c]">34</td>
                    <td className="p-3.5">33" - 34.5"</td>
                    <td className="p-3.5 space-x-1">
                      {['B', 'C', 'D'].map(cup => (
                        <span key={cup} className="bg-[#840d5c]/5 text-[#840d5c] px-2 py-0.5 rounded font-bold text-[10px]">{cup}</span>
                      ))}
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F9F3F5]/30 transition-colors">
                    <td className="p-3.5 font-bold text-[#840d5c]">36</td>
                    <td className="p-3.5">35" - 36.5"</td>
                    <td className="p-3.5 space-x-1">
                      {['B', 'C', 'D'].map(cup => (
                        <span key={cup} className="bg-[#840d5c]/5 text-[#840d5c] px-2 py-0.5 rounded font-bold text-[10px]">{cup}</span>
                      ))}
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F9F3F5]/30 transition-colors">
                    <td className="p-3.5 font-bold text-[#840d5c]">38</td>
                    <td className="p-3.5">37" - 38.5"</td>
                    <td className="p-3.5 space-x-1">
                      {['B', 'C'].map(cup => (
                        <span key={cup} className="bg-[#840d5c]/5 text-[#840d5c] px-2 py-0.5 rounded font-bold text-[10px]">{cup}</span>
                      ))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-[#F9F3F5] rounded-2xl p-4 border border-[#840d5c]/5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#321327]">How to measure:</h4>
              <div className="space-y-2 text-[11px] text-[#321327]/70 leading-relaxed">
                <p>
                  <strong className="text-[#840d5c]">1. Underbust (Band):</strong> Measure around your ribcage directly underneath your bust. Keep the tape level and snug.
                </p>
                <p>
                  <strong className="text-[#840d5c]">2. Overbust (Cup):</strong> Measure across the fullest section of your bust line without squeezing.
                </p>
              </div>
            </div>

            <p className="text-[10px] text-center text-[#321327]/40 font-medium">
              In between sizes? We always recommend ordering one size up for a more breathable, comfortable fit.
            </p>
          </div>

          <div className="pt-4 border-t border-[#840d5c]/10">
            <button 
              onClick={() => setIsSizeGuideOpen(false)}
              className="w-full text-white py-3 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] bg-[#840d5c] hover:bg-[#321327] transition-all"
            >
              Got It, Thanks
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default SingleProductPage;