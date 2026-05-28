"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Script from "next/script";
import { Trash2, Plus, Minus, ChevronLeft, ShoppingBag, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import { updateCartQuantity, removeFromCart, clearCart } from "@/backend/actions/order";
import { createRazorpayOrder } from "@/backend/actions/payment";
import { verifyPayment } from "@/backend/actions/verify";
import { IMAGE_BASE_URL } from '@/public/constants/constants';
import { useStore } from '@/store/useStore'; 

const CartPage = () => {
  // 1. STATE MANAGEMENT
  const [couponCode, setCouponCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // 2. GLOBAL STORE SELECTORS
  const user = useStore((state) => state.user);
  const isAuthInitialized = useStore((state) => state.isAuthInitialized);
  const cartItems = useStore((state) => state.cartItems);
  const fetchCart = useStore((state) => state.fetchCart); 

  // 5. PAYMENT LOGIC
  const handlePayment = async () => {
    const userId = user?.id;
    if (!userId || cartItems.length === 0) return;
    
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
      alert("Could not initiate checkout.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 6. UI ACTIONS: Linked directly to mutations + global state updates
  const updateQuantity = async (cartItemId: string, newQty: number) => {
    const userId = user?.id;
    if (newQty < 1) return;
    
    const response = await updateCartQuantity(cartItemId, newQty);
    
    if (response.success && userId && fetchCart) {
      await fetchCart(userId);
    } else if (!response.success) {
      alert("Could not update item quantity.");
    }
  };

  const removeItem = async (id: string) => {
    const userId = user?.id;
    const response = await removeFromCart(id) as { error?: string };
    
    if (!response?.error && userId && fetchCart) {
      await fetchCart(userId);
    } else if (response?.error) {
      alert("Could not remove item from bag.");
    }
  };

  // 7. CALCULATIONS: Hardened case-insensitive fallbacks for prices
  const subtotal = cartItems.reduce((acc, item) => {
    const price = item?.Product?.price || item?.product?.price || item?.price || 0;
    const quantity = item.quantity || 1;
    return acc + (price * quantity);
  }, 0);

  const freeShippingThreshold = 5000;
  const shipping = (subtotal >= freeShippingThreshold || subtotal === 0) ? 0 : 150;
  const total = subtotal + shipping;
  const progressToFreeShipping = Math.min((subtotal / freeShippingThreshold) * 100, 100);

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
                <ShoppingBag size={32} className="sm:size-[40px]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif text-[#321327]">Your bag is empty</h2>
              <Link href="/shop" className="inline-block px-8 py-3.5 sm:px-10 sm:py-4 bg-[#840d5c] text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full shadow-lg hover:bg-[#321327] transition-colors">
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10 items-start">
              
              {/* LEFT: ITEMS LIST */}
              <div className="lg:col-span-2 space-y-4 md:space-y-6">
                {cartItems.map((item) => {
                  const targetProduct = item?.Product || item?.product || item; 
                  const fallbackImage = targetProduct?.image || targetProduct?.image_path || '';
                  const fallbackName = targetProduct?.name || 'Product';
                  const fallbackPrice = targetProduct?.price || item?.price || 0;

                  return (
                    <div key={item.id} className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-[2.5rem] flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center border border-[#840d5c]/5 shadow-sm hover:shadow-md transition-all w-full">
                      
                      {/* Image Container */}
                      <div className="relative w-full sm:w-28 h-48 sm:h-36 bg-[#FAF9FA] rounded-xl sm:rounded-2xl overflow-hidden flex-shrink-0 border border-[#840d5c]/5">
                        <Image src={`${IMAGE_BASE_URL}${fallbackImage}`} alt={fallbackName} fill className="object-cover" />
                      </div>

                      {/* Content Details */}
                      <div className="flex-grow w-full space-y-3">
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
                            <span className="text-xs font-bold text-[#321327] min-w-[1rem] text-center">{item.quantity || 1}</span>
                            <button onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)} className="text-[#321327]/60 hover:text-[#840d5c] p-0.5"><Plus size={12} /></button>
                          </div>

                          <button onClick={() => removeItem(item.id)} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors py-1">
                            <Trash2 size={13} /> Remove
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* RIGHT: SUMMARY & CHECKOUT */}
              <div className="lg:col-span-1 lg:sticky lg:top-24 space-y-4 md:space-y-6 w-full">
                <div className="bg-[#321327] text-white p-6 sm:p-8 rounded-2xl sm:rounded-[3rem] shadow-2xl space-y-6 relative overflow-hidden">
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#840d5c] rounded-full blur-3xl opacity-20"></div>
                  
                  <h2 className="text-xl sm:text-2xl font-serif relative z-10">Order Summary</h2>
                  
                  {/* Shipping Bar */}
                  <div className="space-y-3 relative z-10">
                    <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-bold uppercase tracking-widest gap-2">
                      <span className="opacity-60">Shipping Progress</span>
                      <span className="text-[#840d5c] bg-white px-2 py-0.5 rounded-md font-black text-[9px] whitespace-nowrap">
                        {subtotal >= freeShippingThreshold ? "FREE SHIPPING" : `₹${(freeShippingThreshold - subtotal).toLocaleString()} to free`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#840d5c] to-pink-400 transition-all duration-700" 
                        style={{ width: `${progressToFreeShipping}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Summary Breakdowns */}
                  <div className="space-y-4 border-b border-white/10 pb-6 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em] relative z-10">
                    <div className="flex justify-between">
                      <span className="opacity-60">Subtotal</span>
                      <span>₹{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Shipping</span>
                      <span className={shipping === 0 ? "text-green-400" : ""}>
                        {shipping === 0 ? 'FREE' : `₹${shipping}`}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 relative z-10">
                    <label htmlFor="coupon" className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest opacity-60 block">
                      Coupon Code
                    </label>
                    <input
                      id="coupon"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="ENTER CODE"
                      className="w-full rounded-full bg-white/10 border border-white/20 px-4 py-3 text-xs tracking-wider uppercase placeholder:text-white/40 focus:outline-none focus:border-white/40"
                    />
                  </div>

                  {/* Total Amount */}
                  <div className="flex justify-between items-baseline relative z-10">
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-widest">Total</span>
                    <span className="text-2xl sm:text-4xl font-bold">₹{total.toLocaleString()}</span>
                  </div>

                  {/* Checkout Action Button */}
                  <button 
                    onClick={handlePayment}
                    disabled={isProcessing || cartItems.length === 0}
                    className="w-full bg-[#840d5c] hover:bg-white hover:text-[#840d5c] py-4 sm:py-5 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] sm:text-[11px] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.98] relative z-10 disabled:opacity-50"
                  >
                    {isProcessing ? "Processing..." : "Pay Now"} <ArrowRight size={16} />
                  </button>
                </div>

                {/* Secure Badge */}
                <div className="flex items-center justify-center gap-2 opacity-40 py-2">
                  <ShieldCheck size={14} />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#321327]">Secure Razorpay Checkout</span>
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