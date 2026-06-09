"use client";

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Script from "next/script";
import { Trash2, Plus, Minus, ChevronLeft, ShoppingBag, ArrowRight, ShieldCheck, Loader2, Sparkles, CreditCard, Truck, Gift, CheckCircle2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import { validateCouponForCart } from "@/backend/actions/coupon";
import { createOrder } from "@/backend/actions/order";
import { createRazorpayOrder } from "@/backend/actions/payment";
import { verifyPayment } from "@/backend/actions/verify";
import { useStore } from '@/store/useStore'; 
import { getOptimizedSupabaseImageUrl } from '@/lib/supabaseImage';

type CheckoutCartItem = {
  id: string;
  price: number;
  quantity: number;
};

type CheckoutSummary = {
  itemSubtotal: number;
  comboDiscount: number;
  orderDiscount: number;
  firstTimeDiscount: number;
  shippingFee: number;
  codCharge: number;
  finalGrandTotal: number;
};

type PaymentMethod = 'ONLINE' | 'COD';

type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string | undefined;
  amount: number;
  currency: string;
  name: string;
  image: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => Promise<void>;
  prefill: {
    name: string;
    email: string;
  };
  theme: {
    color: string;
  };
};

type RazorpayInstance = {
  open: () => void;
};

type RazorpayConstructor = new (options: RazorpayCheckoutOptions) => RazorpayInstance;

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

export const calculateCheckoutSummary = ({
  cartItems,
  isComboApplied,
  isFirstTimeUser,
  couponDiscount,
  paymentMethod,
}: {
  cartItems: CheckoutCartItem[];
  isComboApplied: boolean;
  isFirstTimeUser: boolean;
  couponDiscount: number;
  paymentMethod: string;
}): CheckoutSummary => {
  const itemSubtotal = roundCurrency(
    cartItems.reduce((acc, item) => {
      const unitPrice = Number(item?.price) || 0;
      const qty = Number(item?.quantity) || 0;
      return acc + Math.max(unitPrice, 0) * Math.max(qty, 0);
    }, 0)
  );

  // Combo discount and order value discount are mutually exclusive.
  const comboDiscount = isComboApplied ? roundCurrency(itemSubtotal * 0.1) : 0;
  const subtotalAfterCombo = roundCurrency(itemSubtotal - comboDiscount);

  const orderDiscount = isComboApplied ? 0 : Math.max(Number(couponDiscount || 0), 0);

  const firstTimeDiscount = isFirstTimeUser ? 100 : 0;
  const shippingFee = 0;
  
  // COD handling fee
  const codCharge = paymentMethod === 'COD' ? 100 : 0;

  const discountedTotal = roundCurrency(subtotalAfterCombo - orderDiscount - firstTimeDiscount);
  const finalGrandTotal = Math.max(0, roundCurrency(discountedTotal + shippingFee + codCharge));

  return {
    itemSubtotal,
    comboDiscount,
    orderDiscount,
    firstTimeDiscount,
    shippingFee,
    codCharge,
    finalGrandTotal,
  };
};

const CartPage = () => {
  // 1. STATE MANAGEMENT
  const [couponCode, setCouponCode] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ONLINE');
  const [showAllMobileItems, setShowAllMobileItems] = useState(false);
  const hasOfferToastHydratedRef = useRef(false);
  const hadComboOfferRef = useRef(false);

  // 2. GLOBAL STORE SELECTORS
  const user = useStore((state) => state.user);
  const isAuthInitialized = useStore((state) => state.isAuthInitialized);
  const cartItems = useStore((state) => state.cartItems);
  const fetchCart = useStore((state) => state.fetchCart);
  const storeRemoveItem = useStore((state) => state.removeItem);
  const storeUpdateQuantity = useStore((state) => state.updateQuantity);
  const products = useStore((state) => state.products);
  const loadProducts = useStore((state) => state.loadProducts);
  const isProductsInitialized = useStore((state) => state.isProductsInitialized);

  // 5. PAYMENT LOGIC
  const handlePayment = async () => {
    const userId = user?.id;
    if (!userId || cartItems.length === 0) return;

    if (paymentMethod === 'COD') {
      setIsProcessing(true);
      try {
        const codOrderRes = await createOrder(userId, appliedCouponCode || null, {
          clearCart: true,
          orderStatus: "PENDING",
          paymentMethod: "COD",
        });

        if (!codOrderRes?.success || !codOrderRes.order?.id) {
          throw new Error(codOrderRes?.error || "Could not place COD order.");
        }

        if (fetchCart) await fetchCart(userId, true);
        window.location.href = `/success?orderId=${codOrderRes.order.id}`;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not place COD order.";
        alert(message);
      } finally {
        setIsProcessing(false);
      }
      return;
    }
    
    setIsProcessing(true);
    try {
      const orderData = await createRazorpayOrder(userId, appliedCouponCode || null);
      const razorpayBrandImage = `${window.location.origin}/images/AI_images/logo1_ikna.png`;
      const razorpayAmount = Number(orderData.amount);

      const options: RazorpayCheckoutOptions = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, 
        amount: razorpayAmount,
        currency: "INR",
        name: "IKNA",
        image: razorpayBrandImage,
        description: "Order Checkout",
        order_id: orderData.orderId,
        handler: async function (response: RazorpaySuccessResponse) {
          const result = await verifyPayment(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature,
            orderData.dbOrderId
          );

          if (result.success) {
            if (fetchCart) await fetchCart(userId, true);
            window.location.href = `/success?orderId=${orderData.dbOrderId}`;
          } else {
            alert("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: (user?.email || '').split('@')[0],
          email: user?.email || '',
        },
        theme: { color: "#840d5c" },
      };

      const RazorpayCheckout = (window as Window & typeof globalThis & { Razorpay: RazorpayConstructor }).Razorpay;
      const rzp = new RazorpayCheckout(options);
      rzp.open();
    } catch (err) {
      console.error("Checkout error:", err);
      const message = err instanceof Error ? err.message : "";
      if (message.toLowerCase().includes("shipping address")) {
        alert("Shipping address not available. Please add an address before checkout.");
      } else {
        alert(message || "Could not initiate checkout.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // 6. UI ACTIONS: Linked directly to mutations + global state updates
  const updateQuantity = async (cartItemId: string, newQty: number) => {
    if (newQty < 1) return;
    await storeUpdateQuantity(cartItemId, newQty);
  };

  const removeItem = async (id: string) => {
    await storeRemoveItem(id);
  };

  const handleApplyCoupon = async () => {
    const userId = user?.id;
    if (!userId) return;

    const code = couponCode.trim().toUpperCase();
    if (!code) {
      toast.error('Please enter a coupon code.');
      return;
    }

    setIsApplyingCoupon(true);
    try {
      const validation = await validateCouponForCart(userId, code, checkoutSummary.itemSubtotal);
      if (!validation.success) {
        setAppliedCouponCode(null);
        setCouponDiscount(0);
        toast.error(validation.error);
        return;
      }

      setAppliedCouponCode(validation.code);
      setCouponDiscount(validation.discountAmount);
      setCouponCode(validation.code);
      toast.success(`Coupon ${validation.code} applied successfully.`);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  // 7. CALCULATIONS: Drive the cart UI from the checkout summary rules.
  const normalizedCouponCode = couponCode.trim().toUpperCase();
  const checkoutItems: CheckoutCartItem[] = cartItems.map((item) => ({
    id: item.id,
    price: Number(item?.Product?.price || item?.product?.price || item?.price || 0),
    quantity: Number(item?.quantity || 1),
  }));
  const comboTarget = 3;
  const categoryQuantities = cartItems.reduce<Record<string, number>>((acc, item) => {
    const rawCategory = item?.category || item?.Product?.category || item?.product?.category;
    const normalizedCategory = typeof rawCategory === 'string' ? rawCategory.trim().toLowerCase() : '';

    if (!normalizedCategory) {
      return acc;
    }

    acc[normalizedCategory] = (acc[normalizedCategory] || 0) + Number(item?.quantity || 1);
    return acc;
  }, {});
    const totalCartItems = cartItems.reduce((sum, item) => sum + (Number(item?.quantity) || 1), 0);
  const comboEligibleEntry = Object.entries(categoryQuantities)
    .sort((firstEntry, secondEntry) => secondEntry[1] - firstEntry[1])
    .find(([, quantity]) => quantity >= comboTarget);
  const isComboApplied = Boolean(comboEligibleEntry);
  const checkoutSummary = calculateCheckoutSummary({
    cartItems: checkoutItems,
    isComboApplied,
    isFirstTimeUser: false,
    couponDiscount,
    paymentMethod,
  });
  const totalSavings = roundCurrency(
    checkoutSummary.comboDiscount +
      checkoutSummary.orderDiscount +
      checkoutSummary.firstTimeDiscount
  );
  const originalCheckoutPrice = roundCurrency(
    checkoutSummary.itemSubtotal
  );
  const discountStatus = isComboApplied
    ? 'COMBO DISCOUNT APPLIED'
    : appliedCouponCode
      ? `${appliedCouponCode} APPLIED`
      : 'NO DISCOUNT';
      
  const comboStatusMessage = comboEligibleEntry
    ? `${totalCartItems} items qualify for combo pricing`
    : null;
  const hiddenMobileItemsCount = Math.max(cartItems.length - 3, 0);
  const visibleCartItems = showAllMobileItems ? cartItems : cartItems.slice(0, 3);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const syncListMode = () => setShowAllMobileItems(mediaQuery.matches);

    syncListMode();
    mediaQuery.addEventListener('change', syncListMode);

    return () => {
      mediaQuery.removeEventListener('change', syncListMode);
    };
  }, []);

  useEffect(() => {
    if (!isProductsInitialized) {
      loadProducts();
    }
  }, [isProductsInitialized, loadProducts]);

  useEffect(() => {
    if (!hasOfferToastHydratedRef.current) {
      hasOfferToastHydratedRef.current = true;
      hadComboOfferRef.current = isComboApplied;
      return;
    }

    if (isComboApplied && !hadComboOfferRef.current) {
      toast.success('Combo offer applied successfully.');
    }

    hadComboOfferRef.current = isComboApplied;
  }, [isComboApplied]);

  useEffect(() => {
    if (!appliedCouponCode) return;

    if (isComboApplied) {
      setAppliedCouponCode(null);
      setCouponDiscount(0);
      toast.info('Coupon removed because combo pricing is active.');
      return;
    }

    const minRequired = appliedCouponCode === 'SAVE200' ? 1299 : 699;
    if (checkoutSummary.itemSubtotal < minRequired) {
      setAppliedCouponCode(null);
      setCouponDiscount(0);
      toast.error(`Coupon ${appliedCouponCode} removed. Minimum order is ₹${minRequired}.`);
    }
  }, [appliedCouponCode, checkoutSummary.itemSubtotal, isComboApplied]);

  // Explicitly check combo eligibility whenever cart items change (add/remove)
  useEffect(() => {
    // This effect triggers whenever cartItems changes, ensuring combo eligibility is rechecked
    // The combo calculations (isComboApplied, etc.) already depend on cartItems and recalculate on render
    // This effect handles state management when combo eligibility changes
  }, [cartItems.length]); // Depends on cartItems length to detect add/remove

  // When combo becomes inactive (items removed), reset discount state to ensure correct calculation
  useEffect(() => {
    if (hadComboOfferRef.current && !isComboApplied) {
      setCouponDiscount(0);
      setAppliedCouponCode(null);
      toast.info('Combo offer no longer applies. Discounts have been reset.');
      hadComboOfferRef.current = false;
    }
  }, [isComboApplied]);

  const cartProductIds = new Set(
    cartItems
      .map((item) => item?.productId || item?.Product?.id || item?.product?.id || item?.id)
      .filter(Boolean)
  );

  const recommendedProducts = (products || [])
    .filter((product) => product?.id && !cartProductIds.has(product.id))
    .slice(0, 12);

  // 8. LOADING & EMPTY STATES
  if (!isAuthInitialized) {
    return (
      <div className="bg-[#FAF3F5] min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#840d5c]" size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-[#FAF3F5] min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <ShoppingBag className="text-[#840d5c]/20 mb-4" size={64} />
        <h2 className="text-xl sm:text-2xl font-serif text-[#321327] mb-2">Your bag is waiting</h2>
        <p className="text-xs sm:text-sm text-[#321327]/60 mb-6">Please log in to view your cart items.</p>
        <Link href="/" className="px-8 py-3.5 sm:px-10 sm:py-4 bg-[#840d5c] text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
          Login to Account
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF3F5] min-h-screen flex flex-col">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <Header />

      <main className="grow px-4 sm:px-6 md:px-8 py-6 md:py-12">
        <div className="max-w-6xl mx-auto w-full">
          
          {/* HEADER SECTION */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8 md:mb-10">
            <div className="space-y-1 md:space-y-2">
              <button onClick={() => window.history.back()} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#840d5c]/60 hover:text-[#840d5c] transition-all">
                <ChevronLeft size={14} /> Continue Shopping
              </button>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif text-[#321327]">Your Shopping Bag</h1>
            </div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#321327]/40">
              {cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'} Selected
            </p>
          </div>

          {cartItems.length === 0 ? (
            <div className="bg-white rounded-3xl sm:rounded-[3rem] p-8 sm:p-16 md:p-20 text-center space-y-6 border border-[#840d5c]/5 shadow-sm">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#FAF3F5] rounded-full flex items-center justify-center mx-auto text-[#840d5c]/30">
                <ShoppingBag size={32} className="sm:size-10" />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif text-[#321327]">Your bag is empty</h2>
              <Link href="/shop" className="inline-block px-8 py-3.5 sm:px-10 sm:py-4 bg-[#840d5c] text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full shadow-lg hover:bg-[#321327] transition-colors">
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-10 items-start">
              
              {/* LEFT: ITEMS LIST */}
              <div className={`lg:col-span-3 space-y-4 md:space-y-5 ${cartItems.length > 4 ? 'lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto lg:pr-2' : ''}`}>
                <div className="hidden lg:flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#321327]/45">
                  <span>Products In Cart</span>
                  {cartItems.length > 4 && <span>Scroll to view all {cartItems.length} items</span>}
                </div>

                {visibleCartItems.map((item) => {
                  const targetProduct = item?.Product || item?.product || item; 
                  const fallbackImage = targetProduct?.image || targetProduct?.image_path || '';
                  const fallbackName = targetProduct?.name || 'Product';
                  const fallbackPrice = targetProduct?.price || item?.price || 0;

                  return (
                    <div key={item.id} className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-[2.3rem] flex flex-col sm:flex-row gap-4 sm:gap-5 items-start sm:items-center border border-[#840d5c]/8 shadow-sm hover:shadow-md transition-all w-full">
                      
                      {/* Image Container */}
                      <div className="relative w-full sm:w-28 h-48 sm:h-36 bg-[#FAF9FA] rounded-xl sm:rounded-2xl overflow-hidden shrink-0 border border-[#840d5c]/5">
                        <Image src={getOptimizedSupabaseImageUrl(fallbackImage, { width: 400, quality: 70 })} alt={fallbackName} fill sizes="400px" className="object-cover" />
                      </div>

                      {/* Content Details */}
                      <div className="grow w-full space-y-3">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h3 className="text-base sm:text-lg font-serif text-[#321327] leading-tight">{fallbackName}</h3>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#840d5c]/60 mt-1">
                               Size {item.selectedSize || targetProduct?.size || 'M'}
                            </p>
                          </div>
                          <p className="text-base sm:text-lg font-bold text-[#321327] whitespace-nowrap">₹{fallbackPrice.toLocaleString()}</p>
                        </div>

                        {/* Actions row */}
                        <div className="flex justify-between items-center pt-2 border-t border-[#840d5c]/5 sm:border-none">
                          <div className="flex items-center gap-3 sm:gap-4 bg-[#FAF3F5] px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-[#840d5c]/10">
                            <button onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)} className="text-[#321327]/60 hover:text-[#840d5c] p-0.5"><Minus size={12} /></button>
                            <span className="text-xs font-bold text-[#321327] min-w-4 text-center">{item.quantity || 1}</span>
                            <button onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)} className="text-[#321327]/60 hover:text-[#840d5c] p-0.5"><Plus size={12} /></button>
                          </div>

                          <button onClick={() => removeItem(item.id)} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors py-1">
                            <Trash2 size={13} /> Remove
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 size={14} className="text-emerald-500" /> In stock
                        </div>
                      </div>

                    </div>
                  );
                })}

                {hiddenMobileItemsCount > 0 && (
                  <div className="lg:hidden">
                    <button
                      type="button"
                      onClick={() => setShowAllMobileItems((previous) => !previous)}
                      className="w-full rounded-2xl border border-[#840d5c]/15 bg-white px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#840d5c]"
                    >
                      {showAllMobileItems ? 'Show Less Items' : `Show ${hiddenMobileItemsCount} More Items`}
                    </button>
                  </div>
                )}


              </div>

              {/* RIGHT: SUMMARY & CHECKOUT MATCHING image_36c8bf.png EXACTLY */}
              <div className="lg:col-span-2 lg:sticky lg:top-24 space-y-4 w-full">
                <div className="bg-gradient-to-b from-[#7c0a53] to-[#800342] text-white p-6 rounded-[2.5rem] space-y-6 shadow-xl relative font-sans">
                  
                  {/* Summary Title */}
                  <div>
                    <h2 className="text-xl font-bold tracking-wide text-white">
                      YOUR SUMMARY
                    </h2>
                  </div>

                  {/* Payment Method Block Elements Layout Grid */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold tracking-wider text-white/70">
                      PAYMENT METHOD
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Online Block */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('ONLINE')}
                        className={`flex flex-col items-center justify-center py-4 px-3 rounded-2xl text-center transition-all ${
                          paymentMethod === 'ONLINE'
                            ? 'border-2 border-white bg-white/10 text-white'
                            : 'border border-white/20 bg-transparent text-white/50 hover:text-white/80'
                        }`}
                      >
                        <CreditCard className="w-5 h-5 mb-2" />
                        <span className="text-xs font-bold tracking-wide">ONLINE</span>
                        <span className="text-[11px] opacity-80 mt-1">(₹0 Extra)</span>
                      </button>

                      {/* COD Block */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('COD')}
                        className={`flex flex-col items-center justify-center py-4 px-3 rounded-2xl text-center transition-all ${
                          paymentMethod === 'COD'
                            ? 'border-2 border-white bg-white/10 text-white'
                            : 'border border-white/20 bg-transparent text-white/50 hover:text-white/80'
                        }`}
                      >
                        <Truck className="w-5 h-5 mb-2" />
                        <span className="text-xs font-bold tracking-wide">CASH ON DELIVERY</span>
                        <span className="text-[11px] opacity-80 mt-1">(₹100 Extra)</span>
                      </button>
                    </div>
                  </div>

                  {/* Coupon Block (Only shows when combo pricing is not overriding) */}
                  {!isComboApplied && (
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="ENTER COUPON"
                          className="w-full rounded-xl bg-white/10 px-3 py-2 text-xs uppercase tracking-wider text-white placeholder:text-white/40 outline-none focus:bg-white/15"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={isApplyingCoupon}
                          className="rounded-xl bg-white text-[#7c0a53] px-4 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-60 shrink-0"
                        >
                          {isApplyingCoupon ? '...' : 'Apply'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Payable Total Large Card Display Panel */}
                  <div className="rounded-3xl bg-white/5 border border-white/10 p-5 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-white/90">Payable Total</p>
                      <p className="text-5xl font-bold mt-1 tracking-tight text-white">
                        ₹{checkoutSummary.finalGrandTotal}
                      </p>
                    </div>
                    <hr className="border-white/10" />
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <p className="text-white/60 mb-0.5">Original Price:</p>
                        <p className="text-sm font-bold text-white">₹{originalCheckoutPrice}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/60 mb-0.5">Discount Applied:</p>
                        <p className="text-xs font-bold uppercase tracking-wide text-white">
                          {discountStatus}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Rows Breakdown Ledger White Card */}
                  <div className="rounded-[2rem] bg-white text-[#321327] p-5 space-y-4 shadow-sm font-sans">
                    <div className="flex justify-between items-center font-bold text-[11px] tracking-wider text-[#321327]/70">
                      <span>ITEMS TOTAL</span>
                      <span className="text-sm font-bold text-[#321327]">₹{checkoutSummary.itemSubtotal}</span>
                    </div>
                    
                    <hr className="border-dashed border-[#321327]/20" />
                    
                    <div className="flex items-center justify-between text-[11px] font-bold tracking-wider text-[#321327]/70">
                      <div className="w-1/2 flex justify-between pr-4 border-r border-dashed border-[#321327]/20">
                        <span>SHIPPING</span>
                        <span className="text-emerald-600 font-extrabold">FREE</span>
                      </div>
                      <div className="w-1/2 flex justify-between pl-4">
                        <span className="uppercase">
                          {paymentMethod === 'COD' ? 'COD CHARGE' : 'ONLINE CHECKOUT'}
                        </span>
                        <span className="text-emerald-600 font-extrabold">FREE</span>
                      </div>
                    </div>

                    <hr className="border-dashed border-[#321327]/20" />

                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 py-0.5">
                      <Gift size={14} className="fill-emerald-600 text-white" />
                      <span>
                        {comboStatusMessage ? comboStatusMessage : `${totalCartItems} items qualify for combo pricing`}
                      </span>
                    </div>

                    <hr className="border-dashed border-[#321327]/20" />

                    <div className="flex justify-between items-center pt-1 font-extrabold text-[#321327]">
                      <span className="text-xs tracking-widest">TOTAL</span>
                      <span className="text-lg text-[#7c0a53]">₹{checkoutSummary.finalGrandTotal}</span>
                    </div>
                  </div>

                  {/* Main Trigger Call-To-Action Pink Pill Button */}
                  <button 
                    onClick={handlePayment}
                    disabled={isProcessing || cartItems.length === 0}
                    className="w-full bg-[#bf0b6b] hover:bg-[#d6137c] text-white py-4 rounded-3xl font-extrabold tracking-widest text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-md disabled:opacity-40"
                  >
                    {isProcessing ? 'PROCESSING...' : 'PAY NOW'} <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>

                {/* Trust Badges Footer Grid matching the base alignment below component */}
                <div className="grid grid-cols-3 gap-1 pt-4 border-t border-[#7c0a53]/10 text-center text-[#321327]">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 border-r border-[#7c0a53]/10 px-1">
                    <Truck className="w-5 h-5 text-[#7c0a53]" />
                    <div className="text-left">
                      <p className="text-[9px] font-extrabold uppercase leading-none tracking-tight">FREE SHIPPING</p>
                      <p className="text-[9px] text-[#321327]/60 leading-tight mt-0.5">On online checkout</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 border-r border-[#7c0a53]/10 px-1">
                    <ShieldCheck className="w-5 h-5 text-[#7c0a53]" />
                    <div className="text-left">
                      <p className="text-[9px] font-extrabold uppercase leading-none tracking-tight">SECURE PAYMENT</p>
                      <p className="text-[9px] text-[#321327]/60 leading-tight mt-0.5">100% secure checkout</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-1">
                    <RotateCcw className="w-4 h-4 text-[#7c0a53]" />
                    <div className="text-left">
                      <p className="text-[9px] font-extrabold uppercase leading-none tracking-tight">EASY RETURNS</p>
                      <p className="text-[9px] text-[#321327]/60 leading-tight mt-0.5">7-day return policy</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
          
          {/* RECOMMENDED PRODUCTS SECTION */}
          {recommendedProducts.length > 0 && (
            <section className="mt-8 rounded-2xl sm:rounded-[2rem] bg-white border border-[#840d5c]/8 p-4 sm:p-5 shadow-sm">
              <div className="flex items-end justify-between gap-3 mb-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#840d5c]/65">Recommended</p>
                  <h5 className="text-lg sm:text-xl font-serif text-[#321327] uppercase ">You may like too</h5>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#321327]/45">Swipe</p>
              </div>

              <div className="overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2">
                <div className="flex gap-3 sm:gap-4">
                  {recommendedProducts.map((product) => {
                    const productImage =
                      product?.image ||
                      product?.image_path ||
                      product?.product_images?.[0]?.image_path ||
                      '';

                    return (
                      <Link
                        key={product.id}
                        href={`/product/${product.id}`}
                        className="snap-start shrink-0 w-[72%] sm:w-[46%] lg:w-[calc((100%-3rem)/4)] rounded-2xl border border-[#840d5c]/8 bg-[#fffafb] p-3 hover:shadow-md transition-shadow"
                      >
                        <div className="relative w-full h-40 sm:h-44 rounded-xl overflow-hidden bg-white border border-[#840d5c]/8">
                          <Image
                            src={getOptimizedSupabaseImageUrl(productImage, { width: 420, quality: 70 })}
                            alt={product?.name || 'Recommended product'}
                            fill
                            sizes="420px"
                            className="object-cover"
                          />
                        </div>
                        <div className="mt-3 space-y-1">
                          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#321327] line-clamp-2 min-h-[2.1rem]">
                            {product?.name || 'Product'}
                          </p>
                          <p className="text-sm font-bold text-[#840d5c]">₹{Number(product?.price || 0).toLocaleString()}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default CartPage;