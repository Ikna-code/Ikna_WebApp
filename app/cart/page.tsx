"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Script from "next/script";
import { useRouter, useSearchParams } from 'next/navigation';
import { Trash2, Plus, Minus, ChevronLeft, ShoppingBag, ArrowRight, Loader2, Sparkles, CreditCard, Truck, Gift, CheckCircle2, MapPin, X } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import { getCouponTicketsForCart, validateCouponForCart, type CartCouponTicket } from "@/backend/actions/coupon";
import { createOrder } from "@/backend/actions/order";
import { createRazorpayOrder } from "@/backend/actions/payment";
import { verifyPayment } from "@/backend/actions/verify";
import { useStore } from '@/store/useStore'; 
import { getOptimizedSupabaseImageUrl } from '@/lib/supabaseImage';

type CheckoutCartItem = {
  id: string;
  productId: string;
  price: number;
  quantity: number;
  comboEligibleQuantity: number;
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

type ShippingAddress = {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  isDefault?: boolean;
};

type CartProductReference = {
  id?: string;
  name?: string;
  price?: number;
  image?: string;
  image_path?: string;
  size?: string;
  inventory?: { size: string; stock: number }[];
  subCategory?: {
    name?: string;
    slug?: string;
  };
  subCategoryName?: string;
  subCategoryId?: string;
};

type CartDisplayItem = {
  id: string;
  productId?: string;
  name?: string;
  price?: number;
  image?: string;
  image_path?: string;
  size?: string;
  quantity?: number;
  comboEligibleQuantity?: number;
  comboBundleId?: string;
  selectedSize?: string;
  Product?: CartProductReference;
  product?: CartProductReference;
  inventory?: { size: string; stock: number }[];
  subCategoryName?: string;
  subCategoryId?: string;
  subCategory?: string;
};

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

async function trackCheckoutSessionStep(step: 'CHECKOUT_STARTED' | 'ADDRESS_ADDED' | 'SHIPPING_SELECTED' | 'PAYMENT_STARTED', note?: string) {
  try {
    await fetch('/api/checkout/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ step, note }),
      cache: 'no-store',
    });
  } catch (error) {
    console.error('[checkout-session] client tracking failed', error);
  }
}

export const calculateCheckoutSummary = ({
  cartItems,
  comboEligibleSubtotal,
  appliedCouponCode,
  isFirstTimeUser,
  couponDiscount,
  paymentMethod,
}: {
  cartItems: CheckoutCartItem[];
  comboEligibleSubtotal: number;
  appliedCouponCode: string | null;
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
  // Combo applies only to eligible line items, not the full cart subtotal.
  const comboDiscount = roundCurrency(Math.max(Number(comboEligibleSubtotal) || 0, 0) * 0.1);
  const isComboApplied = comboDiscount > 0;
  const subtotalAfterCombo = roundCurrency(itemSubtotal - comboDiscount);
  const normalizedCouponCode = String(appliedCouponCode || '').trim().toUpperCase();
  const canStackWithCombo = normalizedCouponCode === 'WELCOME100';

  const orderDiscount = isComboApplied && !canStackWithCombo ? 0 : Math.max(Number(couponDiscount || 0), 0);

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

const CartPageContent = () => {
  // 1. STATE MANAGEMENT
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponTickets, setCouponTickets] = useState<CartCouponTicket[]>([]);
  const [isLoadingCouponTickets, setIsLoadingCouponTickets] = useState(false);
  const [showAllCoupons, setShowAllCoupons] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ONLINE');
  const [showAllMobileItems, setShowAllMobileItems] = useState(false);
  const [isAddressNoticeDismissed, setIsAddressNoticeDismissed] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'India',
    isDefault: true,
  });
  const hasOfferToastHydratedRef = useRef(false);
  const hadComboOfferRef = useRef(false);
  const hasResumedCheckoutRef = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // 2. GLOBAL STORE SELECTORS
  const user = useStore((state) => state.user);
  const isAuthInitialized = useStore((state) => state.isAuthInitialized);
  const cartItems = useStore((state) => state.cartItems) as CartDisplayItem[];
  const fetchCart = useStore((state) => state.fetchCart);
  const storeRemoveItem = useStore((state) => state.removeItem);
  const storeUpdateQuantity = useStore((state) => state.updateQuantity);
  const products = useStore((state) => state.products);
  const loadProducts = useStore((state) => state.loadProducts);
  const isProductsInitialized = useStore((state) => state.isProductsInitialized);
  const addresses = useStore((state) => state.addresses) as ShippingAddress[];
  const fetchAddresses = useStore((state) => state.fetchAddresses);
  const isAddressesInitialized = useStore((state) => state.isAddressesInitialized);
  const saveAddress = useStore((state) => state.saveAddress);

  const selectedShippingAddress =
    addresses.find((address) => address.isDefault) || addresses[0] || null;

  // 5. PAYMENT LOGIC
  const handlePayment = useCallback(async () => {
    const userId = user?.id;
    if (!userId || cartItems.length === 0) return;
    if (!selectedShippingAddress) {
      toast.error('Add a delivery address before checkout.');
      return;
    }

    if (paymentMethod === 'COD') {
      setIsProcessing(true);
      try {
        await trackCheckoutSessionStep('SHIPPING_SELECTED', 'Shipping address confirmed');
        await trackCheckoutSessionStep('PAYMENT_STARTED', 'COD flow started');

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
      await trackCheckoutSessionStep('SHIPPING_SELECTED', 'Shipping address confirmed');
      await trackCheckoutSessionStep('PAYMENT_STARTED', 'Online payment flow started');

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
            if (result.shiprocketSuccess === false && result.shiprocketError) {
              alert(`Payment successful, but shipment creation failed: ${result.shiprocketError}`);
            }
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
        const redirectTarget = encodeURIComponent('/cart');
        router.push(`/account/address?redirect=${redirectTarget}&resumeCheckout=1`);
      } else {
        alert(message || "Could not initiate checkout.");
      }
    } finally {
      setIsProcessing(false);
    }
  }, [appliedCouponCode, cartItems.length, fetchCart, paymentMethod, router, selectedShippingAddress, user?.email, user?.id]);

  // 6. UI ACTIONS: Linked directly to mutations + global state updates
  const updateQuantity = async (cartItemId: string, newQty: number) => {
    if (newQty < 1) return;
    const result = await storeUpdateQuantity(cartItemId, newQty);
    if (result && !result.success) {
      const msg = result.error || '';
      if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('inventory') || msg.toLowerCase().includes('stock')) {
        toast.error('Not enough stock available for this item.');
      } else {
        toast.error('Failed to update quantity. Please try again.');
      }
    }
  };

  const removeItem = async (id: string) => {
    await storeRemoveItem(id);
  };

  const removeBundle = async (bundleItemIds: string[]) => {
    await Promise.all(bundleItemIds.map((id) => storeRemoveItem(id)));
  };

  const handleApplyCoupon = async (couponCode: string) => {
    const userId = user?.id;
    if (!userId) return;

    const code = String(couponCode || '').trim().toUpperCase();
    if (!code) {
      toast.error('Invalid coupon code.');
      return;
    }

    setIsApplyingCoupon(true);
    try {
      const validation = await validateCouponForCart(userId, code, checkoutSummary.itemSubtotal, isComboApplied);
      if (!validation.success) {
        setAppliedCouponCode(null);
        setCouponDiscount(0);
        toast.error(validation.error);
        return;
      }

      setAppliedCouponCode(validation.code);
      setCouponDiscount(validation.discountAmount);
      setShowAllCoupons(false);
      toast.success(`Coupon ${validation.code} applied successfully.`);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    if (!appliedCouponCode) {
      return;
    }

    const removedCode = appliedCouponCode;
    setAppliedCouponCode(null);
    setCouponDiscount(0);
    toast.info(`Coupon ${removedCode} removed.`);
  };

  const openAddressModal = () => {
    setAddressForm((prev) => ({
      ...prev,
      isDefault: addresses.length === 0,
    }));
    setIsAddressModalOpen(true);
  };

  const handleAddressInputChange = (field: keyof typeof addressForm, value: string | boolean) => {
    setAddressForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveAddressFromModal = async () => {
    const userId = user?.id;
    if (!userId) {
      toast.error('Please login to add an address.');
      return;
    }

    if (!addressForm.name.trim() || !addressForm.street.trim() || !addressForm.city.trim() || !addressForm.state.trim() || !addressForm.zip.trim()) {
      toast.error('Please fill all required address fields.');
      return;
    }

    setIsSavingAddress(true);
    try {
      await saveAddress(userId, {
        name: addressForm.name.trim(),
        street: addressForm.street.trim(),
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        zip: addressForm.zip.trim(),
        country: 'India',
        isDefault: Boolean(addressForm.isDefault),
      });
      await fetchAddresses(userId);
      setIsAddressModalOpen(false);
      setAddressForm({
        name: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        country: 'India',
        isDefault: true,
      });
      toast.success('Address added successfully. You can now proceed to pay.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save address.';
      toast.error(message);
    } finally {
      setIsSavingAddress(false);
    }
  };

  // 7. CALCULATIONS: Drive the cart UI from the checkout summary rules.
  const comboTarget = 3;
  const getSubCategoryKey = (item: CartDisplayItem) => {
    const key =
      item?.Product?.subCategory?.name ||
      item?.Product?.subCategory?.slug ||
      item?.Product?.subCategoryName ||
      item?.Product?.subCategoryId ||
      item?.product?.subCategory?.name ||
      item?.product?.subCategory?.slug ||
      item?.product?.subCategoryName ||
      item?.product?.subCategoryId ||
      item?.subCategoryName ||
      item?.subCategoryId ||
      item?.subCategory;

    return String(key || '').trim().toLowerCase();
  };

  const comboEligibleQuantityByCartItemId = new Map<string, number>();
  const comboBundleGroups = new Map<string, CartDisplayItem[]>();

  cartItems.forEach((item) => {
    const comboBundleId = String(item?.comboBundleId || '').trim();
    if (!comboBundleId) {
      return;
    }

    const existing = comboBundleGroups.get(comboBundleId);
    if (existing) {
      existing.push(item);
      return;
    }

    comboBundleGroups.set(comboBundleId, [item]);
  });

  const comboBundleSummaries = Array.from(comboBundleGroups.entries()).map(([bundleId, items]) => {
    const totalEligibleQty = items.reduce(
      (sum, item) => sum + Math.max(Number(item?.comboEligibleQuantity) || 0, 0),
      0
    );
    const subCategoryKeys = new Set(items.map((item) => getSubCategoryKey(item)).filter(Boolean));
    const isValid = totalEligibleQty >= comboTarget && subCategoryKeys.size === 1;

    if (isValid) {
      items.forEach((item) => {
        const lineEligibleQty = Math.min(
          Math.max(Number(item?.comboEligibleQuantity) || 0, 0),
          Math.max(Number(item?.quantity) || 0, 0)
        );
        if (lineEligibleQty > 0) {
          comboEligibleQuantityByCartItemId.set(item.id, lineEligibleQty);
        }
      });
    }

    return {
      bundleId,
      items,
      totalEligibleQty,
      isValid,
    };
  });

  const validComboBundles = comboBundleSummaries.filter((bundle) => bundle.isValid);
  const validComboBundleIds = new Set(validComboBundles.map((bundle) => bundle.bundleId));

  const regularCartItems = cartItems.filter(
    (item) => !validComboBundleIds.has(String(item?.comboBundleId || '').trim())
  );

  const cartDisplayEntries = [
    ...validComboBundles.map((bundle) => ({ type: 'bundle' as const, bundle })),
    ...regularCartItems.map((item) => ({ type: 'item' as const, item })),
  ];

  const checkoutItems: CheckoutCartItem[] = cartItems.map((item) => ({
    id: item.id,
    productId: item?.productId || item?.Product?.id || item?.product?.id || item?.id,
    price: Number(item?.Product?.price || item?.product?.price || item?.price || 0),
    quantity: Number(item?.quantity || 1),
    comboEligibleQuantity: comboEligibleQuantityByCartItemId.get(item.id) || 0,
  }));
  const comboEligibleSubtotal = checkoutItems.reduce((acc, item) => {
    if (item.comboEligibleQuantity <= 0) {
      return acc;
    }

    return acc + Math.max(item.price, 0) * Math.max(item.comboEligibleQuantity, 0);
  }, 0);
  const isComboApplied = comboEligibleSubtotal > 0;
  const checkoutSummary = calculateCheckoutSummary({
    cartItems: checkoutItems,
    comboEligibleSubtotal,
    appliedCouponCode,
    isFirstTimeUser: false,
    couponDiscount,
    paymentMethod,
  });
  const totalSavings = roundCurrency(
    checkoutSummary.comboDiscount + checkoutSummary.orderDiscount + checkoutSummary.firstTimeDiscount
  );
      
  const hiddenMobileItemsCount = Math.max(cartDisplayEntries.length - 3, 0);
  const visibleCartEntries = showAllMobileItems ? cartDisplayEntries : cartDisplayEntries.slice(0, 3);

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
    const userId = user?.id;
    if (!userId || isAddressesInitialized) {
      return;
    }

    void fetchAddresses(userId);
  }, [user?.id, isAddressesInitialized, fetchAddresses]);

  useEffect(() => {
    if (selectedShippingAddress) {
      setIsAddressNoticeDismissed(false);
      void trackCheckoutSessionStep('ADDRESS_ADDED', 'Address available for checkout');
    }
  }, [selectedShippingAddress]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    if (cartItems.length <= 0) {
      return;
    }

    void trackCheckoutSessionStep('CHECKOUT_STARTED', 'Customer opened cart / checkout');
  }, [user?.id, cartItems.length]);

  useEffect(() => {
    const shouldResumeCheckout = searchParams.get('resumeCheckout') === '1';
    if (!shouldResumeCheckout || hasResumedCheckoutRef.current) {
      return;
    }

    if (!isAuthInitialized || !user?.id || cartItems.length === 0 || isProcessing) {
      return;
    }

    hasResumedCheckoutRef.current = true;
    router.replace('/cart');
    void handlePayment();
  }, [
    searchParams,
    isAuthInitialized,
    user?.id,
    cartItems.length,
    isProcessing,
    router,
    handlePayment,
  ]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      setCouponTickets([]);
      return;
    }

    let isMounted = true;
    const fetchCoupons = async () => {
      setIsLoadingCouponTickets(true);
      try {
        const tickets = await getCouponTicketsForCart(
          userId,
          checkoutSummary.itemSubtotal,
          isComboApplied,
          appliedCouponCode
        );
        if (isMounted) {
          setCouponTickets(tickets);
        }
      } catch (error) {
        console.error('Failed to load coupon tickets:', error);
        if (isMounted) {
          setCouponTickets([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingCouponTickets(false);
        }
      }
    };

    fetchCoupons();

    return () => {
      isMounted = false;
    };
  }, [user?.id, checkoutSummary.itemSubtotal, isComboApplied, appliedCouponCode]);

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

    if (isComboApplied && String(appliedCouponCode).toUpperCase() !== 'WELCOME100') {
      setAppliedCouponCode(null);
      setCouponDiscount(0);
      toast.info('Coupon removed because combo pricing is active.');
      return;
    }

    const minRequired = appliedCouponCode === 'SAVE200' ? 1299 : appliedCouponCode === 'SAVE100' ? 699 : 0;
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
        <Link href="/?openAccount=1" className="px-8 py-3.5 sm:px-10 sm:py-4 bg-[#840d5c] text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
          Login to Account
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF3F5] min-h-screen flex flex-col">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <Header />

      <main className="grow px-4 sm:px-6 md:px-8 pt-24 md:pt-27 pb-6 md:pb-12">
        <div className="max-w-6xl mx-auto w-full">
          
          {/* HEADER SECTION */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4 md:mb-5">
            <div className="space-y-1 md:space-y-2">
              <button onClick={() => window.history.back()} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#840d5c]/60 hover:text-[#840d5c] transition-all">
                <ChevronLeft size={14} /> Continue Shopping
              </button>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif text-[#321327]">Your Shopping Bag</h1>
            </div>

          </div>

          {cartItems.length === 0 ? (
            <div className="bg-white rounded-2xl sm:rounded-[2.25rem] p-8 sm:p-16 md:p-20 text-center space-y-6 border border-[#840d5c]/5 shadow-sm">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#FAF3F5] rounded-full flex items-center justify-center mx-auto text-[#840d5c]/30">
                <ShoppingBag size={32} className="sm:size-10" />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif text-[#321327]">Your bag is empty</h2>
              <Link href="/shop" className="inline-block px-8 py-3.5 sm:px-10 sm:py-4 bg-[#840d5c] text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full shadow-lg hover:bg-[#321327] transition-colors">
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 items-start">
              
              {/* LEFT: ITEMS LIST */}
              <div className="lg:col-span-8 space-y-4">


                <div className="overflow-hidden rounded-[1.2rem] border border-[#840d5c]/10 bg-white shadow-sm sm:rounded-[1.5rem]">
                {visibleCartEntries.map((entry, index) => {
                  const rowClasses = `px-4 py-4 sm:px-5 sm:py-5 ${index !== visibleCartEntries.length - 1 ? 'border-b border-[#840d5c]/8' : ''}`;
                  if (entry.type === 'bundle') {
                    const bundlePrice = entry.bundle.items.reduce((sum, item) => {
                      const targetProduct = item?.Product || item?.product || item;
                      return sum + (Number(targetProduct?.price || item?.price || 0) * Math.max(Number(item?.quantity) || 0, 0));
                    }, 0);
                    const bundleItemIds = entry.bundle.items.map((item) => item.id);

                    return (
                      <div key={entry.bundle.bundleId} className={rowClasses}>
                        <div className="rounded-[1.1rem] border border-[#ffb6d8] bg-[#fff8fc] p-4 shadow-sm sm:p-5">
                        <div className="flex items-start justify-between gap-4 border-b border-[#840d5c]/8 pb-4">
                          <div>
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#ffe4f1] px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-[#a3095b] border border-[#ffb6d8]">
                              <Sparkles size={10} /> Combo Bundle Locked
                            </div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#840d5c]/70 mt-1">
                              Quantity is locked. Remove bundle to break this combo.
                            </p>
                          </div>
                          <div className="flex items-start gap-3">
                            <p className="text-base sm:text-lg font-bold text-[#321327] whitespace-nowrap">₹{bundlePrice.toLocaleString()}</p>
                            <button
                              onClick={() => removeBundle(bundleItemIds)}
                              className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors py-1"
                              aria-label="Remove combo bundle"
                            >
                              <Trash2 size={13} /> Remove
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto pb-1 pt-4 sm:overflow-visible">
                          <div className="flex gap-3 min-w-max sm:min-w-0 sm:grid sm:grid-cols-3">
                          {(() => {
                            const expandedBundleItems = entry.bundle.items.flatMap(item =>
                              Array.from({ length: item.quantity || 1 }, (_, index) => ({
                                ...item,
                                uniqueKey: `${item.id}-${index}`,
                                quantity: 1,
                              }))
                            );

                            return expandedBundleItems.map((item) => {
                            const targetProduct = item?.Product || item?.product || item;
                            const fallbackImage = targetProduct?.image || targetProduct?.image_path || '';
                            const fallbackName = targetProduct?.name || 'Product';
                            return (
                              <div key={item.uniqueKey} className="w-47.5 shrink-0 sm:w-auto sm:min-w-0 sm:shrink rounded-xl bg-[#fff7fb] p-3 border border-[#840d5c]/8 space-y-2">
                                <div className="relative w-full h-36 sm:h-32 rounded-xl overflow-hidden border border-[#840d5c]/5 bg-white">
                                  {fallbackImage ? (
                                    <Image src={getOptimizedSupabaseImageUrl(fallbackImage, { width: 400, quality: 70 })} alt={fallbackName} fill sizes="400px" className="object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-widest text-[#840d5c]/35">
                                      No Image
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <div>
                                    <h4 className="text-sm sm:text-base font-serif text-[#321327] leading-tight">{fallbackName}</h4>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#840d5c]/60 mt-1">
                                      Size {item.selectedSize || targetProduct?.size || 'M'}
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-between pt-2 border-t border-[#840d5c]/5">
                                    <p className="text-sm font-bold text-[#321327] whitespace-nowrap">₹{Number(targetProduct?.price || item?.price || 0).toLocaleString()}</p>
                                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#321327] border border-[#840d5c]/10">
                                      Locked Qty 1
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                            });
                          })()}
                          </div>
                        </div>
                        </div>
                      </div>
                    );
                  }

                  const item = entry.item;
                  const targetProduct = item?.Product || item?.product || item;
                  const comboEligibleQuantity = comboEligibleQuantityByCartItemId.get(item.id) || 0;
                  const isComboLineActive = comboEligibleQuantity > 0;
                  const fallbackImage = targetProduct?.image || targetProduct?.image_path || '';
                  const fallbackName = targetProduct?.name || 'Product';
                  const fallbackPrice = targetProduct?.price || item?.price || 0;
                  const itemInventory = (targetProduct?.inventory ?? []) as { size: string; stock: number }[];
                  const inventoryForSize = itemInventory.find((inv) => inv.size === item.selectedSize);
                  const maxStock = inventoryForSize ? Number(inventoryForSize.stock) : Infinity;
                  const atMaxStock = Number(item.quantity || 1) >= maxStock;

                  return (
                    <div key={item.id} className={rowClasses}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4 w-full">
                      <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-[#840d5c]/5 bg-[#FAF9FA] shrink-0 sm:h-24 sm:w-24">
                        {fallbackImage ? (
                          <Image src={getOptimizedSupabaseImageUrl(fallbackImage, { width: 400, quality: 70 })} alt={fallbackName} fill sizes="400px" className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-widest text-[#840d5c]/35">
                            No Image
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 grow flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="space-y-1">
                            <h3 className="text-base font-semibold text-[#321327] leading-tight sm:text-[17px]">{fallbackName}</h3>
                            <p className="text-[12px] text-[#321327]/60 leading-relaxed">
                              Size: {item.selectedSize || targetProduct?.size || 'M'}
                            </p>
                          </div>

                          <p className="text-xl font-bold text-[#321327] whitespace-nowrap sm:text-[1.35rem]">₹{fallbackPrice.toLocaleString()}</p>

                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 size={14} className="text-emerald-500" /> In stock
                            </div>
                            {isComboLineActive && (
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#ffe4f1] px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-[#a3095b] border border-[#ffb6d8]">
                                <Sparkles size={10} /> Combo Active
                              </div>
                            )}
                          </div>
                          {isComboLineActive && (
                            <div className="text-[10px] font-semibold text-[#a3095b]">
                              10% combo discount is applied on {comboEligibleQuantity}/{Math.max(Number(item?.quantity) || 1, 1)} unit(s) in this line.
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-4">
                          <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-xl border border-[#840d5c]/10 shadow-sm sm:min-w-26 sm:justify-between">
                            <button onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)} className="text-[#321327]/60 hover:text-[#840d5c] p-0.5"><Minus size={12} /></button>
                            <span className="text-xs font-bold text-[#321327] min-w-4 text-center">{item.quantity || 1}</span>
                            <button
                              onClick={() => {
                                if (atMaxStock) {
                                  toast.error('Maximum available stock reached for this item.');
                                  return;
                                }
                                updateQuantity(item.id, (item.quantity || 1) + 1);
                              }}
                              disabled={atMaxStock}
                              className={`p-0.5 ${atMaxStock ? 'text-[#321327]/20 cursor-not-allowed' : 'text-[#321327]/60 hover:text-[#840d5c]'}`}
                              aria-label="Increase quantity"
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          <button
                            onClick={() => removeItem(item.id)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-[#321327]/35 transition-colors hover:bg-[#fff2f4] hover:text-red-500"
                            aria-label={`Remove ${fallbackName}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      </div>
                    </div>
                  );
                })}
                </div>

                {hiddenMobileItemsCount > 0 && (
                  <div className="lg:hidden">
                    <button
                      type="button"
                      onClick={() => setShowAllMobileItems((previous) => !previous)}
                      className="w-full rounded-xl border border-[#840d5c]/15 bg-white px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#840d5c]"
                    >
                      {showAllMobileItems ? 'Show Less Items' : `Show ${hiddenMobileItemsCount} More Items`}
                    </button>
                  </div>
                )}


              </div>

              {/* RIGHT: SUMMARY */}
              <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-3 w-full">
                <div className="bg-white border border-[#840d5c]/12 text-[#321327] p-4 sm:p-5 rounded-[1.25rem] sm:rounded-[1.5rem] space-y-3 shadow-xl relative font-sans">
                  <div className="space-y-3">
                    <h2 className="text-xl font-bold tracking-wide text-[#321327]">
                      YOUR SUMMARY
                    </h2>

                    {!selectedShippingAddress && !isAddressNoticeDismissed && (
                      <div className="rounded-xl border border-[#f4c980] bg-linear-to-br from-[#fff9ec] via-[#fff4df] to-[#fff9ef] p-2.5 shadow-[0_6px_16px_rgba(181,98,7,0.08)]">
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#e28a11] ring-1 ring-[#f2c67d]">
                              <MapPin size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold leading-tight text-[#3b1f12]">Add delivery address</p>
                              <p className="mt-0.5 text-[10px] leading-relaxed text-[#6b4a33]">Get ETA and exact final total before payment.</p>
                              <button
                                type="button"
                                onClick={openAddressModal}
                                className="mt-2 inline-flex items-center justify-center rounded-lg bg-[#f59e0b] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-[#d97706]"
                              >
                                Add Address
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsAddressNoticeDismissed(true)}
                            className="rounded-full p-1.5 text-[#8a623f]/80 transition-colors hover:bg-white/80 hover:text-[#5f3f21]"
                            aria-label="Dismiss address notice"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-[11px] font-bold tracking-[0.12em] text-[#321327]/70">
                      PAYMENT METHOD
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('ONLINE')}
                        className={`flex min-h-11 flex-row items-center justify-center gap-x-2 px-2.5 py-2 rounded-xl text-center transition-all ${
                          paymentMethod === 'ONLINE'
                            ? 'border-2 border-[#c02a82] bg-[#fff7fb] text-[#9f1466]'
                            : 'border border-[#840d5c]/15 bg-white text-[#321327]/65 hover:text-[#7c0a53] hover:border-[#840d5c]/40'
                        }`}
                      >
                        <span className="flex items-center justify-center" aria-hidden="true">
                          <CreditCard className="w-4 h-4" />
                        </span>
                        <span className="text-[10px] font-bold tracking-wide leading-tight">ONLINE (₹0)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('COD')}
                        className={`flex min-h-11 flex-row items-center justify-center gap-x-2 px-2.5 py-2 rounded-xl text-center transition-all ${
                          paymentMethod === 'COD'
                            ? 'border-2 border-[#c02a82] bg-[#fff7fb] text-[#9f1466]'
                            : 'border border-[#840d5c]/15 bg-white text-[#321327]/65 hover:text-[#7c0a53] hover:border-[#840d5c]/40'
                        }`}
                      >
                        <span className="flex items-center justify-center" aria-hidden="true">
                          <Truck className="w-4 h-4" />
                        </span>
                        <span className="text-[10px] font-bold tracking-wide leading-tight">COD (+₹100)</span>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[1.1rem] border border-[#840d5c]/12 bg-linear-to-br from-[#fffafc] to-[#fff2f7] p-2.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#321327]/75">Available Coupons</p>
                      <button
                        type="button"
                        onClick={() => setShowAllCoupons((previous) => !previous)}
                        className="rounded-full border border-[#dca4c5]/50 bg-white px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-[#7c0a53] hover:bg-[#ffe8f4]"
                      >
                        {showAllCoupons ? 'Hide' : 'View All'}
                      </button>
                    </div>

                    {isLoadingCouponTickets ? (
                      <div className="rounded-xl border border-[#840d5c]/12 bg-white px-3 py-3 text-[10px] uppercase tracking-widest text-[#321327]/55">
                        Loading coupons...
                      </div>
                    ) : !showAllCoupons ? (
                      (() => {
                        const appliedTicket = couponTickets.find((ticket) => {
                          return !!appliedCouponCode && appliedCouponCode.toUpperCase() === ticket.code;
                        });

                        if (!appliedTicket) {
                          return (
                            <div className="flex items-center justify-between gap-2 rounded-xl border border-[#efd6e3] bg-white px-3 py-3">
                              <div className="flex items-center gap-2 text-[#321327]/55">
                                <Gift size={15} className="text-[#a45a86]" />
                                <span className="text-sm">Apply coupon code</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowAllCoupons(true)}
                                className="rounded-md bg-[#f4dce8] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9f1466]"
                              >
                                Apply
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div className="rounded-xl border border-[#f2b7d6] bg-white px-3 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-[#7c0a53]">{appliedTicket.title}</p>
                                <p className="text-[10px] text-[#321327]/75 mt-0.5">{appliedTicket.description}</p>
                                <p className="text-[10px] font-semibold text-[#7c0a53] mt-0.5">Save ₹{appliedTicket.discountAmount}</p>
                              </div>
                              <button
                                type="button"
                                onClick={handleRemoveCoupon}
                                className="rounded-lg border border-[#840d5c]/25 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#7c0a53] hover:bg-[#fff3f9]"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="space-y-2">
                        {couponTickets.length === 0 && (
                          <div className="rounded-xl border border-[#840d5c]/12 bg-white px-3 py-2 text-[10px] uppercase tracking-widest text-[#321327]/65">
                            No coupons available right now.
                          </div>
                        )}
                        {couponTickets.map((ticket) => {
                          const isApplied = !!appliedCouponCode && appliedCouponCode.toUpperCase() === ticket.code;
                          const isDisabled = !ticket.enabled || (isApplyingCoupon && !isApplied);

                          return (
                            <div
                              key={ticket.code}
                              className={`rounded-xl border px-3 py-2 ${isApplied ? 'border-[#f2b7d6] bg-[#ffeaf5]' : 'border-[#840d5c]/12 bg-white'} ${isDisabled ? 'opacity-55' : ''}`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-wide text-[#7c0a53]">{ticket.title}</p>
                                  <p className="text-[10px] text-[#321327]/75 mt-0.5">{ticket.description}</p>
                                  <p className="text-[10px] font-semibold text-[#7c0a53] mt-0.5">Save ₹{ticket.discountAmount} {ticket.minSubtotal > 0 ? `(min ₹${ticket.minSubtotal})` : ''}</p>
                                  {ticket.disabledReason && (
                                    <p className="text-[10px] text-[#b03b78] mt-0.5">{ticket.disabledReason}</p>
                                  )}
                                </div>
                                {isApplied ? (
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-full bg-[#7c0a53]/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-[#7c0a53]">Applied</span>
                                    <button
                                      type="button"
                                      onClick={handleRemoveCoupon}
                                      className="rounded-lg border border-[#840d5c]/25 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-[#7c0a53] hover:bg-[#fff3f9]"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleApplyCoupon(ticket.code)}
                                    disabled={isDisabled}
                                    className="rounded-lg bg-[#7c0a53] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
                                  >
                                    Apply
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* <div className="rounded-[1.6rem] bg-linear-to-br from-[#7a004f] via-[#930a63] to-[#b01470] p-4 sm:p-5 text-white shadow-lg space-y-4">
                    <div>
                      <p className="text-sm font-medium text-white/85">Payable Total</p>
                      <p className="text-4xl sm:text-5xl font-bold mt-1 tracking-tight text-white">
                        ₹{checkoutSummary.finalGrandTotal}
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-white/20 pt-3 text-sm">
                      <div className="flex items-center justify-between gap-3 text-white/90">
                        <span>Original Price</span>
                        <span className="font-semibold">₹{originalCheckoutPrice}</span>
                      </div>
                      {checkoutSummary.comboDiscount > 0 && (
                        <div className="flex items-center justify-between gap-3 text-white/90">
                          <span>Combo Discount</span>
                          <span className="font-semibold">- ₹{checkoutSummary.comboDiscount}</span>
                        </div>
                      )}
                      {checkoutSummary.orderDiscount > 0 && (
                        <div className="flex items-center justify-between gap-3 text-white/90">
                          <span>{appliedCouponCode || 'Coupon Discount'}</span>
                          <span className="font-semibold">- ₹{checkoutSummary.orderDiscount}</span>
                        </div>
                      )}
                      {checkoutSummary.firstTimeDiscount > 0 && (
                        <div className="flex items-center justify-between gap-3 text-white/90">
                          <span>First Order Discount</span>
                          <span className="font-semibold">- ₹{checkoutSummary.firstTimeDiscount}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-3 border-t border-white/15 pt-3 text-[#5ef0a7]">
                        <span className="font-medium">You Save</span>
                        <span className="text-xl font-bold">₹{totalSavings}</span>
                      </div>
                    </div>
                  </div> */}

                  <div className="border-t border-[#ecd5e2] pt-2.5 space-y-2.5 text-[#321327] font-sans">
                    <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#6b4f61]">Price Details</p>

                      <div className="space-y-2 text-[14px]">
                      <div className="flex items-center justify-between gap-3 text-[#6f5364]">
                        <span>Items Total</span>
                        <span className="font-semibold text-[#321327]">₹{checkoutSummary.itemSubtotal}</span>
                      </div>

                      {checkoutSummary.comboDiscount > 0 && (
                        <div className="flex items-center justify-between gap-3 text-[#6f5364]">
                          <span>Combo Discount</span>
                          <span className="font-semibold text-emerald-600">- ₹{checkoutSummary.comboDiscount}</span>
                        </div>
                      )}

                      {checkoutSummary.orderDiscount > 0 && (
                        <div className="flex items-center justify-between gap-3 text-[#6f5364]">
                          <span>{appliedCouponCode || 'Coupon Discount'}</span>
                          <span className="font-semibold text-emerald-600">- ₹{checkoutSummary.orderDiscount}</span>
                        </div>
                      )}

                      {checkoutSummary.firstTimeDiscount > 0 && (
                        <div className="flex items-center justify-between gap-3 text-[#6f5364]">
                          <span>First Order Discount</span>
                          <span className="font-semibold text-emerald-600">- ₹{checkoutSummary.firstTimeDiscount}</span>
                        </div>
                      )}

                      <div className="border-t border-dashed border-[#e4ccd8] pt-3 flex items-center justify-between gap-3 text-[#6f5364]">
                        <span>Shipping</span>
                        <span className="font-semibold text-emerald-600">FREE</span>
                      </div>

                      {paymentMethod === 'COD' && (
                        <div className="flex items-center justify-between gap-3 text-[#6f5364]">
                          <span>COD Charge</span>
                          <span className="font-semibold text-[#321327]">₹{checkoutSummary.codCharge}</span>
                        </div>
                      )}

                      {totalSavings > 0 && (
                        <div className="border-t border-dashed border-[#e4ccd8] pt-3 flex items-center justify-between gap-3 text-[#6f5364]">
                          <span>Saved Amount</span>
                          <span className="font-semibold text-emerald-600">₹{totalSavings}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center border-t border-[#ecd5e2] pt-3 font-extrabold text-[#321327]">
                      <span className="text-3xl font-serif tracking-tight">Total</span>
                      <span className="text-4xl font-bold text-[#9f1466]">₹{checkoutSummary.finalGrandTotal}</span>
                    </div>
                  </div>

                  <button 
                    onClick={selectedShippingAddress ? handlePayment : openAddressModal}
                    disabled={isProcessing || cartItems.length === 0}
                    className="w-full bg-linear-to-r from-[#9f1466] to-[#7f0e52] hover:from-[#b81b78] hover:to-[#941260] disabled:from-[#d8a4c5] disabled:to-[#c083b1] text-white py-4 rounded-full font-extrabold tracking-[0.14em] text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-md disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isProcessing ? 'PROCESSING...' : selectedShippingAddress ? 'PROCEED TO PAY' : 'CONTINUE'} <ArrowRight className="w-4 h-4 stroke-3" />
                  </button>

                  <p className="text-center text-[12px] text-[#6b4f61]">
                    Secure payments.
                  </p>
                </div>

              </div>

              </div>
            </div>
          )}
          
          {/* RECOMMENDED PRODUCTS SECTION */}
          {recommendedProducts.length > 0 && (
            <section className="mt-8 rounded-[1.2rem] sm:rounded-[1.5rem] bg-white border border-[#840d5c]/8 p-4 sm:p-5 shadow-sm">
              <div className="flex items-end justify-between gap-3 mb-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#840d5c]/65">Recommended</p>
                  <h5 className="text-lg sm:text-xl font-serif text-[#321327]">You may like too</h5>
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
                        href={`/product/${product.name ? product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + product.id : product.id}`}
                        className="snap-start shrink-0 w-[72%] sm:w-[46%] lg:w-[calc((100%-3rem)/4)] rounded-xl border border-[#840d5c]/8 bg-[#fffafb] p-3 hover:shadow-md transition-shadow"
                      >
                        <div className="relative w-full h-40 sm:h-44 rounded-xl overflow-hidden bg-white border border-[#840d5c]/8">
                          {productImage ? (
                            <Image
                              src={getOptimizedSupabaseImageUrl(productImage, { width: 420, quality: 70 })}
                              alt={product?.name || 'Recommended product'}
                              fill
                              sizes="420px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-widest text-[#840d5c]/35">
                              No Image
                            </div>
                          )}
                        </div>
                        <div className="mt-3 space-y-1">
                          <p className="text-[11px] font-bold tracking-[0.12em] text-[#321327] line-clamp-2 min-h-[2.1rem]">
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

      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close address modal backdrop"
            className="absolute inset-0 bg-[#321327]/35 backdrop-blur-[2px]"
            onClick={() => setIsAddressModalOpen(false)}
          />

          <div className="relative w-full max-w-lg rounded-[1.2rem] border border-[#f0dde7] bg-white p-5 sm:p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#321327]">Add Delivery Address</h3>
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="rounded-full p-1.5 text-[#321327]/60 hover:bg-[#f8edf3] hover:text-[#321327]"
                aria-label="Close address modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b4f61]">Full Name</label>
                <input
                  value={addressForm.name}
                  onChange={(e) => handleAddressInputChange('name', e.target.value)}
                  className="w-full rounded-lg border border-[#e7c9d9] px-3 py-2 text-sm text-[#321327] outline-none focus:border-[#c02a82]"
                  placeholder="Enter full name"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b4f61]">Street Address</label>
                <textarea
                  value={addressForm.street}
                  onChange={(e) => handleAddressInputChange('street', e.target.value)}
                  className="w-full rounded-lg border border-[#e7c9d9] px-3 py-2 text-sm text-[#321327] outline-none focus:border-[#c02a82]"
                  placeholder="House no, building, area"
                  rows={2}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b4f61]">City</label>
                <input
                  value={addressForm.city}
                  onChange={(e) => handleAddressInputChange('city', e.target.value)}
                  className="w-full rounded-lg border border-[#e7c9d9] px-3 py-2 text-sm text-[#321327] outline-none focus:border-[#c02a82]"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b4f61]">State</label>
                <input
                  value={addressForm.state}
                  onChange={(e) => handleAddressInputChange('state', e.target.value)}
                  className="w-full rounded-lg border border-[#e7c9d9] px-3 py-2 text-sm text-[#321327] outline-none focus:border-[#c02a82]"
                  placeholder="State"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b4f61]">ZIP Code</label>
                <input
                  value={addressForm.zip}
                  onChange={(e) => handleAddressInputChange('zip', e.target.value)}
                  className="w-full rounded-lg border border-[#e7c9d9] px-3 py-2 text-sm text-[#321327] outline-none focus:border-[#c02a82]"
                  placeholder="PIN / ZIP"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b4f61]">Country</label>
                <input
                  value={addressForm.country}
                  onChange={(e) => handleAddressInputChange('country', e.target.value)}
                  className="w-full rounded-lg border border-[#e7c9d9] px-3 py-2 text-sm text-[#321327] outline-none focus:border-[#c02a82]"
                  placeholder="Country"
                  disabled
                />
              </div>
            </div>

            <label className="mt-4 inline-flex items-center gap-2 text-sm text-[#5f4556]">
              <input
                type="checkbox"
                checked={addressForm.isDefault}
                onChange={(e) => handleAddressInputChange('isDefault', e.target.checked)}
                className="h-4 w-4 rounded border-[#d8b5c8] text-[#9f1466] focus:ring-[#c02a82]"
              />
              Set as default address
            </label>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="rounded-lg border border-[#e0c6d4] px-4 py-2 text-sm font-semibold text-[#6b4f61] hover:bg-[#fff6fa]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAddressFromModal}
                disabled={isSavingAddress}
                className="rounded-lg bg-[#9f1466] px-4 py-2 text-sm font-bold text-white hover:bg-[#840d5c] disabled:opacity-60"
              >
                {isSavingAddress ? 'Saving...' : 'Save Address'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CartPage = () => {
  return (
    <Suspense fallback={null}>
      <CartPageContent />
    </Suspense>
  );
};

export default CartPage;