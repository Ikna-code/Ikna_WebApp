"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Script from "next/script";
import { Trash2, Plus, Minus, ChevronLeft, ShoppingBag, ArrowRight, ShieldCheck, Loader2, Sparkles, TicketPercent, CheckCircle2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import { clearCart } from "@/backend/actions/order";
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

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

export const calculateCheckoutSummary = ({
  cartItems,
  isComboApplied,
  isFirstTimeUser,
  paymentMethod,
}: {
  cartItems: CheckoutCartItem[];
  isComboApplied: boolean;
  isFirstTimeUser: boolean;
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

  let orderDiscount = 0;
  if (!isComboApplied) {
    if (subtotalAfterCombo > 1299) {
      orderDiscount = 200;
    } else if (subtotalAfterCombo > 699) {
      orderDiscount = 100;
    }
  }

  const firstTimeDiscount = isFirstTimeUser ? 100 : 0;
  const shippingFee = 0;
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ONLINE');
  const [showAllMobileItems, setShowAllMobileItems] = useState(false);

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
      alert('Cash on delivery checkout is not enabled yet. Please use online payment for now.');
      return;
    }
    
    setIsProcessing(true);
    try {
      const orderData = await createRazorpayOrder(userId, couponCode || null);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, 
        amount: orderData.amount,
        currency: "INR",
        name: "Your Brand Name",
        description: "Order Checkout",
        order_id: orderData.orderId,
        handler: async function (response: any) {
          const result = await verifyPayment(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature,
            orderData.dbOrderId
          );

          if (result.success) {
            await clearCart(userId);
            if (fetchCart) await fetchCart(userId);
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

      const rzp = new (window as any).Razorpay(options);
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
  const comboEligibleEntry = Object.entries(categoryQuantities)
    .sort((firstEntry, secondEntry) => secondEntry[1] - firstEntry[1])
    .find(([, quantity]) => quantity >= comboTarget);
  const isComboApplied = Boolean(comboEligibleEntry);
  const checkoutSummary = calculateCheckoutSummary({
    cartItems: checkoutItems,
    isComboApplied,
    isFirstTimeUser: false,
    paymentMethod,
  });
  const totalSavings = roundCurrency(
    checkoutSummary.comboDiscount +
      checkoutSummary.orderDiscount +
      checkoutSummary.firstTimeDiscount
  );
  const originalCheckoutPrice = roundCurrency(
    checkoutSummary.itemSubtotal + checkoutSummary.shippingFee + checkoutSummary.codCharge
  );
  const discountStatus = isComboApplied
    ? 'Combo discount applied'
    : checkoutSummary.orderDiscount > 0
      ? 'Order discount applied'
      : normalizedCouponCode
        ? `Coupon ${normalizedCouponCode} entered, pending validation`
        : 'No discount applied';
  const comboStatusMessage = comboEligibleEntry
    ? `${comboEligibleEntry[1]} items qualify for combo pricing`
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10 items-start">
              
              {/* LEFT: ITEMS LIST */}
              <div className={`lg:col-span-2 space-y-4 md:space-y-5 ${cartItems.length > 4 ? 'lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto lg:pr-2' : ''}`}>
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

                {recommendedProducts.length > 0 && (
                  <section className="mt-4 sm:mt-6 rounded-2xl sm:rounded-[2rem] bg-white border border-[#840d5c]/8 p-4 sm:p-5 shadow-sm">
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

              {/* RIGHT: SUMMARY & CHECKOUT */}
              <div className="lg:col-span-1 lg:sticky lg:top-24 space-y-4 md:space-y-6 w-full">
                <div className="bg-[radial-gradient(circle_at_top,rgba(190,97,146,0.28),rgba(50,19,39,1)_55%)] text-white p-4 sm:p-5 lg:p-6 rounded-[2rem] sm:rounded-[2.4rem] shadow-[0_24px_80px_rgba(50,19,39,0.28)] space-y-4 sm:space-y-4 relative overflow-hidden border border-white/10 before:absolute before:inset-px before:rounded-[calc(2rem-1px)] sm:before:rounded-[calc(2.4rem-1px)] before:border before:border-white/5 before:pointer-events-none">
                  <div className="absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent"></div>
                  <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-[#840d5c] blur-3xl opacity-20"></div>
                  <div className="absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-[#f3d7e7]/10 blur-3xl opacity-70"></div>
                  
                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">Checkout</p>
                      <h2 className="mt-1.5 text-lg sm:text-xl font-serif">Order Summary</h2>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-[#ffdbe9] shadow-inner shadow-white/5">
                      <Sparkles size={15} />
                    </div>
                  </div>

                  <div className="relative z-10 grid grid-cols-1 sm:grid-cols-[1fr_auto] items-start sm:items-center gap-3 rounded-[1.35rem] border border-white/10 bg-white/6 px-3 py-3 sm:px-4 backdrop-blur-sm">
                    <div>
                      <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest opacity-60">
                        Payment Method
                      </p>
                      <p className="mt-1 text-[11px] sm:text-xs text-white/70">{discountStatus}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 rounded-full bg-[#f6e8ef]/10 p-1.5 border border-white/10 shadow-inner shadow-black/10 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('ONLINE')}
                        className={`rounded-full px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors min-w-[7.2rem] ${
                          paymentMethod === 'ONLINE'
                            ? 'bg-white text-[#321327]'
                            : 'text-white/70 hover:text-white'
                        }`}
                      >
                        Online
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('COD')}
                        className={`rounded-full px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors min-w-[7.2rem] ${
                          paymentMethod === 'COD'
                            ? 'bg-white text-[#321327]'
                            : 'text-white/70 hover:text-white'
                        }`}
                      >
                        COD
                      </button>
                    </div>
                  </div>

                  <div className="relative z-10 rounded-[1.35rem] border border-white/10 bg-white/6 p-4 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Original Checkout Price</p>
                        <p className="mt-1 text-sm text-white/50 line-through decoration-white/40">₹{originalCheckoutPrice.toLocaleString()}</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/75">
                        {discountStatus}
                      </span>
                    </div>
                    {comboStatusMessage && (
                      <p className="text-[11px] text-emerald-200/90 font-medium">{comboStatusMessage}</p>
                    )}
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Payable Now</p>
                        <p className="text-2xl sm:text-3xl font-bold">₹{checkoutSummary.finalGrandTotal.toLocaleString()}</p>
                      </div>
                      {totalSavings > 0 && (
                        <span className="rounded-full bg-emerald-300 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#1b3b2c]">
                          Saved ₹{totalSavings.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-[1.35rem] border border-white/8 bg-black/10 p-4 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em] relative z-10 backdrop-blur-sm">
                    <div className="flex justify-between col-span-2">
                      <span className="opacity-60">Items Total</span>
                      <span>₹{checkoutSummary.itemSubtotal.toLocaleString()}</span>
                    </div>
                    {checkoutSummary.comboDiscount > 0 && (
                      <div className="flex justify-between text-emerald-300 col-span-2">
                        <span>Combo Discount</span>
                        <span>-₹{checkoutSummary.comboDiscount.toLocaleString()}</span>
                      </div>
                    )}
                    {checkoutSummary.orderDiscount > 0 && (
                      <div className="flex justify-between text-emerald-300 col-span-2">
                        <span>Order Discount</span>
                        <span>-₹{checkoutSummary.orderDiscount.toLocaleString()}</span>
                      </div>
                    )}
                    {checkoutSummary.firstTimeDiscount > 0 && (
                      <div className="flex justify-between text-emerald-300 col-span-2">
                        <span>First Order</span>
                        <span>-₹{checkoutSummary.firstTimeDiscount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="opacity-60">Shipping</span>
                      <span className={checkoutSummary.shippingFee === 0 ? "text-green-400" : ""}>
                        {checkoutSummary.shippingFee === 0 ? 'FREE' : `₹${checkoutSummary.shippingFee}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">{paymentMethod === 'COD' ? 'COD Handling' : 'Online Checkout'}</span>
                      <span className={checkoutSummary.codCharge === 0 ? "text-green-400" : ""}>
                        {checkoutSummary.codCharge === 0 ? 'FREE' : `₹${checkoutSummary.codCharge}`}
                      </span>
                    </div>
                    <div className="flex justify-between col-span-2 border-t border-white/10 pt-2 mt-1 text-white">
                      <span>Total</span>
                      <span>₹{checkoutSummary.finalGrandTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  {isComboApplied ? (
                    <div className="relative z-10 rounded-[1.2rem] border border-dashed border-white/15 bg-white/5 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
                      Coupon codes are hidden while combo pricing is active.
                    </div>
                  ) : (
                    <div className="relative z-10 rounded-[1.35rem] border border-[#f4c8dc]/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(132,13,92,0.12))] p-3.5 sm:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f8d9e8] text-[#840d5c] shadow-[0_10px_25px_rgba(248,217,232,0.18)]">
                          <TicketPercent size={18} />
                        </div>
                        <div>
                          <label htmlFor="coupon" className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-white/60 block">
                            Coupon Code
                          </label>
                          <p className="mt-1 text-[11px] sm:text-xs text-white/70">Unlock extra savings before you pay.</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-col sm:flex-row gap-2">
                        <input
                          id="coupon"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="ENTER COUPON CODE"
                          className="w-full rounded-full bg-white/10 border border-white/20 px-4 py-3 text-xs tracking-wider uppercase placeholder:text-white/40 focus:outline-none focus:border-[#f8d9e8]/70 focus:bg-white/12"
                        />
                        <button
                          type="button"
                          className="rounded-full bg-white text-[#321327] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em]"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Checkout Action Button */}
                  <button 
                    onClick={handlePayment}
                    disabled={isProcessing || cartItems.length === 0}
                    className="w-full bg-[#840d5c] hover:bg-white hover:text-[#840d5c] py-4 sm:py-5 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] sm:text-[11px] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.98] relative z-10 disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : paymentMethod === 'COD' ? 'Place COD Order' : 'Pay Now'} <ArrowRight size={16} />
                  </button>
                </div>

                {/* Secure Badge */}
                <div className="flex items-center justify-center gap-2 opacity-40 py-2">
                  <ShieldCheck size={14} />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#321327]">
                    {paymentMethod === 'COD' ? 'COD Adds ₹100 Handling Charge' : 'Free Shipping On Online Checkout'}
                  </span>
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CartPage;