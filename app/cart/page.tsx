"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Script from "next/script";
import { useRouter, useSearchParams } from 'next/navigation';
import { Trash2, Plus, Minus, ChevronLeft, ShoppingBag, ArrowRight, Loader2, Sparkles, CreditCard, Truck, Gift, CheckCircle2, MapPin, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import { getCouponTicketsForCart, validateCouponForCart, type CartCouponTicket } from "@/backend/actions/coupon";
import { createOrder } from "@/backend/actions/order";
import { createRazorpayOrder } from "@/backend/actions/payment";
import { verifyPayment } from "@/backend/actions/verify";
import { useStore } from '@/store/useStore'; 
import { getOptimizedSupabaseImageUrl } from '@/lib/supabaseImage';
import {
  clearGuestCart,
  clearGuestCheckout,
  readGuestCart,
  readGuestCheckout,
  removeGuestCartItem,
  saveGuestCheckout,
  updateGuestCartItem,
} from '@/lib/guestCart';

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

function CheckoutIllustration({ variant }: { variant: 'contact' | 'delivery' }) {
  if (variant === 'contact') {
    return (
      <svg viewBox="0 0 180 130" className="h-28 w-32 drop-shadow-[0_8px_18px_rgba(132,13,92,0.12)]" aria-hidden="true">
        <defs>
          <linearGradient id="ikna-contact-bg" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#fff7fa" />
            <stop offset="100%" stopColor="#ffe7f1" />
          </linearGradient>
        </defs>
        <rect x="18" y="28" width="118" height="76" rx="18" fill="url(#ikna-contact-bg)" />
        <path d="M25 38L86 78L144 38" fill="none" stroke="#f2d6df" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="30" y="33" width="104" height="72" rx="16" fill="#fff" stroke="#f2d6df" strokeWidth="2" />
        <path d="M40 48C62 58 83 63 104 48C117 42 126 46 130 52V87H40V48Z" fill="#fce6ef" />
        <path d="M83 47C83 50 79 55 71 58C63 61 56 66 56 75C56 84 62 90 71 90C86 90 92 80 92 71C92 62 87 56 83 47Z" fill="#840D5C" opacity="0.12" />
        <path d="M92 62C92 56 88 50 82 47C76 44 69 46 64 50C58 55 56 64 59 71C62 78 70 82 77 82C84 82 90 76 92 62Z" fill="#D4AF37" opacity="0.45" />
        <path d="M74 42C74 34 78 26 86 23C95 20 103 24 108 32C112 39 110 48 105 53C101 59 94 62 88 60C79 58 74 51 74 42Z" fill="#ec9ac2" />
        <path d="M80 42C80 39 82 35 86 33C90 31 95 33 97 37C100 42 99 48 94 51C89 54 83 52 80 48V42Z" fill="#840D5C" opacity="0.9" />
        <path d="M96 54C101 60 109 62 116 59C117 65 115 71 110 75C103 80 94 80 87 76" fill="none" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round" />
        <circle cx="145" cy="28" r="5" fill="#D4AF37" opacity="0.8" />
        <circle cx="154" cy="34" r="3" fill="#840D5C" opacity="0.55" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 180 130" className="h-28 w-32 drop-shadow-[0_8px_18px_rgba(132,13,92,0.12)]" aria-hidden="true">
      <rect x="18" y="25" width="120" height="72" rx="18" fill="#fef6f9" stroke="#f3dfe9" strokeWidth="2" />
      <path d="M35 38L83 72L131 38" fill="none" stroke="#f3dfe9" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="30" y="36" width="100" height="60" rx="14" fill="#fff" stroke="#f0d8e4" strokeWidth="2" />
      <path d="M58 56H110" stroke="#D4AF37" strokeWidth="5" strokeLinecap="round" />
      <path d="M60 69H102" stroke="#f0a6d1" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
      <rect x="112" y="62" width="28" height="40" rx="5" fill="#840D5C" opacity="0.13" />
      <path d="M120 74H135" stroke="#840D5C" strokeWidth="4" strokeLinecap="round" />
      <path d="M120 82H135" stroke="#840D5C" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      <path d="M52 34L66 22L79 34" fill="none" stroke="#D4AF37" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <circle cx="145" cy="24" r="5" fill="#f5d567" opacity="0.9" />
      <circle cx="149" cy="39" r="3" fill="#ec9ac2" opacity="0.8" />
      <path d="M145 83L138 96H152L145 83Z" fill="#840D5C" opacity="0.14" />
      <path d="M137 104H153" stroke="#840D5C" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

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
  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1);
  const [isPinLoading, setIsPinLoading] = useState(false);
  const [isPinAutoFilled, setIsPinAutoFilled] = useState(false);
  const [pinLookupError, setPinLookupError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [addressSearch, setAddressSearch] = useState('');
  const [guestCheckout, setGuestCheckout] = useState(() => readGuestCheckout());
  const [addressForm, setAddressForm] = useState({
    name: '',
    street: '',
    house: '',
    area: '',
    landmark: '',
    city: '',
    state: '',
    pin: '',
    zip: '',
    country: 'India',
    isDefault: true,
    saveDetails: true,
    email: '',
    phone: '',
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

  const guestCartItems = useMemo(() => readGuestCart() as CartDisplayItem[], []);
  const activeCartItems = (user ? cartItems : guestCartItems) as CartDisplayItem[];
  const selectedShippingAddress =
    addresses.find((address) => address.isDefault) || addresses[0] || null;
  const guestShippingAddress = guestCheckout || null;
  const isGooglePlacesEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY);

  const splitStreetParts = (streetValue: string) => {
    const cleanedParts = String(streetValue || '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    if (cleanedParts.length === 0) {
      return { house: '', area: '', landmark: '' };
    }

    if (cleanedParts.length === 1) {
      return { house: cleanedParts[0], area: '', landmark: '' };
    }

    if (cleanedParts.length === 2) {
      return { house: cleanedParts[0], area: cleanedParts[1], landmark: '' };
    }

    return {
      house: cleanedParts[0],
      area: cleanedParts[1],
      landmark: cleanedParts.slice(2).join(', '),
    };
  };

  const combineAddressLine = (house: string, area: string, landmark: string) => {
    const parts = [house.trim(), area.trim(), landmark.trim()].filter(Boolean);
    return parts.join(', ');
  };

  const validateContactStep = useCallback(() => {
    const errors: Record<string, string> = {};
    const cleanName = addressForm.name.trim();
    const cleanPhone = addressForm.phone.trim();
    const cleanEmail = addressForm.email.trim();

    if (!cleanName) {
      errors.name = 'Full name is required.';
    }

    if (!cleanPhone) {
      errors.phone = 'Mobile number is required.';
    } else if (!/^(\+91|91)?[6-9]\d{9}$/.test(cleanPhone.replace(/\s+/g, ''))) {
      errors.phone = 'Please enter a valid Indian mobile number.';
    }

    if (!cleanEmail) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    return errors;
  }, [addressForm.email, addressForm.name, addressForm.phone]);

  const focusFirstInvalidField = useCallback((errors: Record<string, string>) => {
    const fieldOrder = ['name', 'phone', 'email', 'pin', 'city', 'state', 'house', 'area'];
    const firstInvalidKey = fieldOrder.find((key) => !!errors[key]);

    if (!firstInvalidKey) {
      return;
    }

    const targetIdMap: Record<string, string> = {
      name: 'guest-name',
      phone: 'guest-phone',
      email: 'guest-email',
      pin: 'guest-pin',
      city: 'guest-city',
      state: 'guest-state',
      house: 'guest-house',
      area: 'guest-area',
    };

    const target = document.getElementById(targetIdMap[firstInvalidKey]);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.focus();
    }
  }, []);

  const openGuestCheckoutForm = useCallback(() => {
    const currentGuest = readGuestCheckout();
    const nextForm = currentGuest || {
      name: '',
      email: '',
      phone: '',
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'India',
      shippingAddress: '',
    };
    const parsedStreet = splitStreetParts(nextForm.street || '');

    setAddressForm({
      name: nextForm.name || '',
      email: nextForm.email || '',
      phone: nextForm.phone || '',
      street: nextForm.street || '',
      house: parsedStreet.house,
      area: parsedStreet.area,
      landmark: parsedStreet.landmark,
      city: nextForm.city || '',
      state: nextForm.state || '',
      pin: nextForm.zip || '',
      zip: nextForm.zip || '',
      country: nextForm.country || 'India',
      isDefault: true,
      saveDetails: false,
    });
    setCheckoutStep(1);
    setAddressSearch('');
    setFieldErrors({});
    setPinLookupError('');
    setIsPinAutoFilled(Boolean(nextForm.zip && nextForm.city && nextForm.state));
    setIsAddressModalOpen(true);
  }, []);

  const handlePayment = useCallback(async () => {
    const userId = user?.id;
    const cartForCheckout = user ? cartItems : guestCartItems;
    if (cartForCheckout.length === 0) return;

    if (!user && !guestCheckout) {
      openGuestCheckoutForm();
      toast.error('Please enter your shipping address to continue.');
      return;
    }

    if (!user) {
      const guestData = guestCheckout || {
        name: addressForm.name.trim(),
        email: addressForm.email.trim(),
        phone: addressForm.phone.trim(),
        street: addressForm.street.trim(),
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        zip: addressForm.zip.trim(),
        country: addressForm.country || 'India',
        shippingAddress: '',
      };

      const guestAddressText = (guestData.shippingAddress || [guestData.name, guestData.street, guestData.city, guestData.state, guestData.zip, guestData.country || 'India'].filter(Boolean).join(', ')).trim();
      if (!guestAddressText || !guestData.street || !guestData.city || !guestData.state || !guestData.zip) {
        toast.error('Please enter your shipping address to continue.');
        openGuestCheckoutForm();
        return;
      }

      const normalizedGuestData = saveGuestCheckout({
        name: guestData.name,
        email: guestData.email,
        phone: guestData.phone,
        street: guestData.street,
        city: guestData.city,
        state: guestData.state,
        zip: guestData.zip,
        country: guestData.country || 'India',
        shippingAddress: guestAddressText,
      });

      if (!normalizedGuestData) {
        toast.error('Please enter your shipping address to continue.');
        return;
      }

      setGuestCheckout(normalizedGuestData);

      if (paymentMethod === 'COD') {
        setIsProcessing(true);
        try {
          const guestOrderOptions = {
            clearCart: true,
            orderStatus: 'PENDING',
            paymentMethod: 'COD',
            guestCustomer: normalizedGuestData,
            guestCartItems,
          } as Parameters<typeof createOrder>[2];

          const codOrderRes = await createOrder(null as unknown as string, appliedCouponCode || null, guestOrderOptions);

          if (!codOrderRes?.success || !codOrderRes.order?.id) {
            throw new Error(codOrderRes?.error || 'Could not place COD order.');
          }

          clearGuestCart();
          clearGuestCheckout();
          window.location.href = `/success?orderId=${codOrderRes.order.id}`;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Could not place COD order.';
          alert(message);
        } finally {
          setIsProcessing(false);
        }
        return;
      }

      setIsProcessing(true);
      try {
        const orderData = await createRazorpayOrder(null, appliedCouponCode || null, {
          ...normalizedGuestData,
          shippingAddress: normalizedGuestData.shippingAddress,
          items: guestCartItems,
        });

        const razorpayBrandImage = `${window.location.origin}/images/AI_images/logo1_ikna.png`;
        const razorpayAmount = Number(orderData.amount);

        const options: RazorpayCheckoutOptions = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: razorpayAmount,
          currency: 'INR',
          name: 'IKNA',
          image: razorpayBrandImage,
          description: 'Order Checkout',
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
              clearGuestCart();
              clearGuestCheckout();
              window.location.href = `/success?orderId=${orderData.dbOrderId}`;
            } else {
              alert('Payment verification failed. Please contact support.');
            }
          },
          prefill: {
            name: normalizedGuestData.name || normalizedGuestData.email?.split('@')[0] || 'Guest',
            email: normalizedGuestData.email || '',
          },
          theme: { color: '#840d5c' },
        };

        const RazorpayCheckout = (window as Window & typeof globalThis & { Razorpay: RazorpayConstructor }).Razorpay;
        const rzp = new RazorpayCheckout(options);
        rzp.open();
      } catch (err) {
        console.error('Checkout error:', err);
        const message = err instanceof Error ? err.message : '';
        alert(message || 'Could not initiate checkout.');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

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
          orderStatus: 'PENDING',
          paymentMethod: 'COD',
        });

        if (!codOrderRes?.success || !codOrderRes.order?.id) {
          throw new Error(codOrderRes?.error || 'Could not place COD order.');
        }

        if (fetchCart) await fetchCart(userId, true);
        window.location.href = `/success?orderId=${codOrderRes.order.id}`;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not place COD order.';
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
        currency: 'INR',
        name: 'IKNA',
        image: razorpayBrandImage,
        description: 'Order Checkout',
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
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: (user?.email || '').split('@')[0],
          email: user?.email || '',
        },
        theme: { color: '#840d5c' },
      };

      const RazorpayCheckout = (window as Window & typeof globalThis & { Razorpay: RazorpayConstructor }).Razorpay;
      const rzp = new RazorpayCheckout(options);
      rzp.open();
    } catch (err) {
      console.error('Checkout error:', err);
      const message = err instanceof Error ? err.message : '';
      if (message.toLowerCase().includes('shipping address')) {
        alert('Shipping address not available. Please add an address before checkout.');
        const redirectTarget = encodeURIComponent('/cart');
        router.push(`/account/address?redirect=${redirectTarget}&resumeCheckout=1`);
      } else {
        alert(message || 'Could not initiate checkout.');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [addressForm, appliedCouponCode, cartItems, fetchCart, guestCartItems, guestCheckout, openGuestCheckoutForm, paymentMethod, router, selectedShippingAddress, user]);

  // 6. UI ACTIONS: Linked directly to mutations + global state updates
  const updateQuantity = async (cartItemId: string, newQty: number) => {
    if (newQty < 1) return;

    if (!user) {
      updateGuestCartItem(cartItemId, newQty);
      return;
    }

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
    if (!user) {
      removeGuestCartItem(id);
      return;
    }
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
      saveDetails: false,
    }));
    setCheckoutStep(1);
    setAddressSearch('');
    setFieldErrors({});
    setPinLookupError('');
    setIsAddressModalOpen(true);
  };

  const handleAddressInputChange = (field: keyof typeof addressForm, value: string | boolean) => {
    setAddressForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === 'house' || field === 'area' || field === 'landmark') {
        next.street = combineAddressLine(
          field === 'house' ? String(value) : prev.house,
          field === 'area' ? String(value) : prev.area,
          field === 'landmark' ? String(value) : prev.landmark
        );
      }

      if (field === 'pin' || field === 'zip') {
        const normalizedPin = String(value || '').replace(/\D/g, '').slice(0, 6);
        next.pin = normalizedPin;
        next.zip = normalizedPin;
      }

      return next;
    });

    setFieldErrors((prev) => ({
      ...prev,
      [field]: '',
    }));
  };

  const validateGuestAddressForm = (form: typeof addressForm) => {
    const errors: Record<string, string> = {};
    const cleanName = form.name.trim();
    const cleanEmail = form.email.trim();
    const cleanPhone = form.phone.trim();
    const cleanPin = String(form.pin || form.zip || '').trim();
    const cleanCity = form.city.trim();
    const cleanState = form.state.trim();
    const cleanHouse = form.house.trim();
    const cleanArea = form.area.trim();

    if (!cleanName) {
      errors.name = 'Full name is required.';
    }

    if (!cleanEmail) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!cleanPhone) {
      errors.phone = 'Mobile number is required.';
    } else if (!/^(\+91|91)?[6-9]\d{9}$/.test(cleanPhone.replace(/\s+/g, ''))) {
      errors.phone = 'Please enter a valid Indian mobile number.';
    }

    if (!cleanPin) {
      errors.pin = 'PIN code is required.';
    } else if (!/^\d{6}$/.test(cleanPin)) {
      errors.pin = 'PIN code must contain exactly 6 digits.';
    }

    if (!cleanCity) {
      errors.city = 'City is required.';
    }

    if (!cleanState) {
      errors.state = 'State is required.';
    }

    if (!cleanHouse) {
      errors.house = 'House / Flat / Building is required.';
    }

    if (!cleanArea) {
      errors.area = 'Area / Street is required.';
    }

    return errors;
  };

  const handlePinLookup = useCallback(async (pinValue: string) => {
    const normalizedPin = String(pinValue || '').replace(/\D/g, '').slice(0, 6);
    if (!normalizedPin || normalizedPin.length !== 6) {
      setPinLookupError('');
      setIsPinAutoFilled(false);
      return;
    }

    setIsPinLoading(true);
    setPinLookupError('');

    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${normalizedPin}`, { cache: 'no-store' });
      const payload = await response.json();
      const lookupResult = Array.isArray(payload) ? payload[0] : null;
      const postOffices = Array.isArray(lookupResult?.PostOffice) ? lookupResult.PostOffice : [];

      if (!response.ok || !lookupResult || lookupResult.Status !== 'Success' || postOffices.length === 0) {
        throw new Error('Pin lookup failed');
      }

      const firstPostOffice = postOffices[0] || {};
      setAddressForm((prev) => ({
        ...prev,
        pin: normalizedPin,
        zip: normalizedPin,
        city: firstPostOffice.District || prev.city || '',
        state: firstPostOffice.State || prev.state || '',
      }));
      setIsPinAutoFilled(true);
      setFieldErrors((prev) => ({ ...prev, pin: '', city: '', state: '' }));
    } catch (error) {
      console.error('[checkout-pin] lookup failed', error);
      setIsPinAutoFilled(false);
      setPinLookupError('PIN lookup failed. You can enter city and state manually.');
    } finally {
      setIsPinLoading(false);
    }
  }, []);

  const handleSaveAddressFromModal = async () => {
    const userId = user?.id;

    const contactErrors = validateContactStep();
    const addressErrors = validateGuestAddressForm(addressForm);

    if (checkoutStep === 1) {
      if (Object.keys(contactErrors).length > 0) {
        setFieldErrors(contactErrors);
        focusFirstInvalidField(contactErrors);
        return;
      }

      setFieldErrors({});
      setCheckoutStep(2);
      return;
    }

    const finalErrors = { ...contactErrors, ...addressErrors };
    if (Object.keys(finalErrors).length > 0) {
      setFieldErrors(finalErrors);
      if (Object.keys(contactErrors).length > 0) {
        setCheckoutStep(1);
      }
      focusFirstInvalidField(finalErrors);
      return;
    }

    if (!userId) {
      const trimmedName = addressForm.name.trim();
      const trimmedEmail = addressForm.email.trim();
      const trimmedPhone = addressForm.phone.trim();
      const formattedStreet = combineAddressLine(addressForm.house, addressForm.area, addressForm.landmark);
      const trimmedCity = addressForm.city.trim();
      const trimmedState = addressForm.state.trim();
      const trimmedZip = (addressForm.pin || addressForm.zip || '').trim();
      const guestCountry = 'India';

      const normalized = saveGuestCheckout({
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        street: formattedStreet,
        city: trimmedCity,
        state: trimmedState,
        zip: trimmedZip,
        country: guestCountry,
        shippingAddress: [trimmedName, formattedStreet, trimmedCity, trimmedState, trimmedZip, guestCountry].filter(Boolean).join(', '),
      });

      if (normalized) {
        setGuestCheckout(normalized);
      }
      setFieldErrors({});
      setPinLookupError('');
      setCheckoutStep(1);
      setIsAddressModalOpen(false);
      toast.success('Shipping details saved. You can continue to payment.');
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
      setCheckoutStep(1);
      setAddressForm({
        name: '',
        street: '',
        house: '',
        area: '',
        landmark: '',
        city: '',
        state: '',
        pin: '',
        zip: '',
        country: 'India',
        isDefault: true,
        saveDetails: false,
        email: '',
        phone: '',
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

  activeCartItems.forEach((item) => {
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

  const regularCartItems = activeCartItems.filter(
    (item) => !validComboBundleIds.has(String(item?.comboBundleId || '').trim())
  );

  const cartDisplayEntries = [
    ...validComboBundles.map((bundle) => ({ type: 'bundle' as const, bundle })),
    ...regularCartItems.map((item) => ({ type: 'item' as const, item })),
  ];

  const checkoutItems: CheckoutCartItem[] = activeCartItems.map((item) => ({
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

    if (activeCartItems.length <= 0) {
      return;
    }

    void trackCheckoutSessionStep('CHECKOUT_STARTED', 'Customer opened cart / checkout');
  }, [user?.id, activeCartItems.length]);

  useEffect(() => {
    const shouldResumeCheckout = searchParams.get('resumeCheckout') === '1';
    if (!shouldResumeCheckout || hasResumedCheckoutRef.current) {
      return;
    }

    if (!isAuthInitialized || !user?.id || activeCartItems.length === 0 || isProcessing) {
      return;
    }

    hasResumedCheckoutRef.current = true;
    router.replace('/cart');
    void handlePayment();
  }, [
    searchParams,
    isAuthInitialized,
    user?.id,
    activeCartItems.length,
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
  }, [activeCartItems.length]); // Depends on cartItems length to detect add/remove

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
    activeCartItems
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

  if (!user && !activeCartItems.length) {
    return (
      <div className="bg-[#FAF3F5] min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <ShoppingBag className="text-[#840d5c]/20 mb-4" size={64} />
        <h2 className="text-xl sm:text-2xl font-serif text-[#321327] mb-2">Your bag is waiting</h2>
        <p className="text-xs sm:text-sm text-[#321327]/60 mb-6">Add products to your cart and continue without creating an account.</p>
        <Link href="/shop" className="px-8 py-3.5 sm:px-10 sm:py-4 bg-[#840d5c] text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
          Start Shopping
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

          {activeCartItems.length === 0 ? (
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
                    onClick={
                      user
                        ? selectedShippingAddress ? handlePayment : openAddressModal
                        : guestShippingAddress ? handlePayment : openGuestCheckoutForm
                    }
                    disabled={isProcessing || activeCartItems.length === 0}
                    className="w-full bg-linear-to-r from-[#9f1466] to-[#7f0e52] hover:from-[#b81b78] hover:to-[#941260] disabled:from-[#d8a4c5] disabled:to-[#c083b1] text-white py-4 rounded-full font-extrabold tracking-[0.14em] text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-md disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isProcessing ? 'PROCESSING...' : user ? (selectedShippingAddress ? 'PROCEED TO PAY' : 'CONTINUE') : (guestShippingAddress ? 'PROCEED TO PAY' : 'CONTINUE')} <ArrowRight className="w-4 h-4 stroke-3" />
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
          <button
            type="button"
            aria-label="Close address modal backdrop"
            className="absolute inset-0 bg-[#321327]/35 backdrop-blur-[2px]"
            onClick={() => {
              setFieldErrors({});
              setCheckoutStep(1);
              setIsAddressModalOpen(false);
            }}
          />

          <div className="relative z-[61] w-full max-w-[620px] max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden rounded-[30px] border border-[#f2dfe8] bg-[#fffdfd] shadow-[0_30px_80px_rgba(50,19,39,0.16)]">
            <div className="flex max-h-[calc(100dvh-1rem)] flex-col sm:max-h-[calc(100dvh-2rem)]">
              <div className="flex items-center justify-between border-b border-[#f5e2eb] bg-[#fffafc] px-4 py-3 sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#840d5c]/75">Step {checkoutStep} of 2</span>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6b4f61]">
                    <span className={`inline-flex items-center gap-2 ${checkoutStep === 1 ? 'text-[#840d5c]' : 'text-[#321327]/60'}`}>
                      <span className={`h-2.5 w-2.5 rounded-full ${checkoutStep === 1 ? 'bg-[#840d5c]' : 'border border-[#d8bfd0] bg-white'}`} />
                      Contact Details
                    </span>
                    <span className="h-px w-6 bg-[#e8d7e1]" />
                    <span className={`inline-flex items-center gap-2 ${checkoutStep === 2 ? 'text-[#840d5c]' : 'text-[#321327]/60'}`}>
                      <span className={`h-2.5 w-2.5 rounded-full ${checkoutStep === 2 ? 'bg-[#840d5c]' : 'border border-[#d8bfd0] bg-white'}`} />
                      Delivery Address
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFieldErrors({});
                    setCheckoutStep(1);
                    setIsAddressModalOpen(false);
                  }}
                  className="rounded-full p-2 text-[#321327]/60 transition-colors hover:bg-[#f8edf3] hover:text-[#321327]"
                  aria-label="Close address modal"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-5 sm:px-6 sm:pb-6">
                <div className={`transition-all duration-300 ease-out ${checkoutStep === 1 ? 'translate-x-0 opacity-100 relative' : '-translate-x-6 opacity-0 absolute inset-0 pointer-events-none'}`}>
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="max-w-[58%]">
                    <h3 className="font-serif text-[2rem] leading-tight text-[#321327]">Let&apos;s get started! ♥</h3>
                    <p className="mt-2 text-sm text-[#6b4f61]">We&apos;ll use these details to keep you updated about your order.</p>
                  </div>
                  <div className="rounded-[26px] bg-[#fff5f8] p-2 ring-1 ring-[#f3dfe9]">
                    <CheckoutIllustration variant="contact" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="guest-name" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b4f61]">Full Name <span className="text-[#b11e72]">*</span></label>
                    <input
                      id="guest-name"
                      value={addressForm.name}
                      onChange={(e) => handleAddressInputChange('name', e.target.value)}
                      autoComplete="name"
                      aria-invalid={Boolean(fieldErrors.name)}
                      className={`w-full rounded-2xl border bg-white px-3.5 py-3 text-sm text-[#321327] outline-none transition-all focus:border-[#c02a82] focus:ring-2 focus:ring-[#f9dfe9] ${fieldErrors.name ? 'border-red-300 bg-red-50' : 'border-[#e8d5df]'}`}
                      placeholder="Enter your full name"
                    />
                    {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="guest-phone" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b4f61]">Mobile Number <span className="text-[#b11e72]">*</span></label>
                      <div className={`flex items-center overflow-hidden rounded-2xl border bg-white ${fieldErrors.phone ? 'border-red-300 bg-red-50' : 'border-[#e8d5df]'}`}>
                        <span className="flex items-center gap-1 border-r border-[#f1d9e1] bg-[#fffafc] px-3 py-3 text-sm font-medium text-[#321327]">🇮🇳 +91</span>
                        <input
                          id="guest-phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={addressForm.phone}
                          onChange={(e) => handleAddressInputChange('phone', e.target.value.replace(/[^\d+\s-]/g, '').slice(0, 15))}
                          aria-invalid={Boolean(fieldErrors.phone)}
                          className="w-full border-0 bg-transparent px-3.5 py-3 text-sm text-[#321327] outline-none placeholder:text-[#321327]/40"
                          placeholder="Enter mobile number"
                        />
                      </div>
                      {fieldErrors.phone && <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>}
                    </div>

                    <div>
                      <label htmlFor="guest-email" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b4f61]">Email Address <span className="text-[#b11e72]">*</span></label>
                      <input
                        id="guest-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={addressForm.email}
                        onChange={(e) => handleAddressInputChange('email', e.target.value)}
                        aria-invalid={Boolean(fieldErrors.email)}
                        className={`w-full rounded-2xl border bg-white px-3.5 py-3 text-sm text-[#321327] outline-none transition-all focus:border-[#c02a82] focus:ring-2 focus:ring-[#f9dfe9] ${fieldErrors.email ? 'border-red-300 bg-red-50' : 'border-[#e8d5df]'}`}
                        placeholder="Enter email address"
                      />
                      {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-start gap-3 rounded-[20px] border border-[#f1d9e0] bg-[#fff9fb] p-3 text-left">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#840d5c] shadow-sm ring-1 ring-[#f5dfe9]">🛡</div>
                  <p className="text-sm leading-relaxed text-[#5e394d]">We&apos;ll send your order confirmation, tracking updates and important notifications here.</p>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveAddressFromModal}
                    className="inline-flex items-center justify-center rounded-full bg-[#840d5c] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_26px_rgba(132,13,92,0.2)] transition-all hover:bg-[#6d0849]"
                  >
                    Continue to Delivery Address <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className={`transition-all duration-300 ease-out ${checkoutStep === 2 ? 'translate-x-0 opacity-100 relative' : 'translate-x-6 opacity-0 absolute inset-0 pointer-events-none'}`}>
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="max-w-[60%]">
                    <h3 className="font-serif text-[2rem] leading-tight text-[#321327]">Where should we deliver your order? 📍</h3>
                    <p className="mt-2 text-sm text-[#6b4f61]">Enter your address or search to save time.</p>
                  </div>
                  <div className="rounded-[26px] bg-[#fff7ec] p-2 ring-1 ring-[#f1debc]">
                    <CheckoutIllustration variant="delivery" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="guest-address-search" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b4f61]">Search your address</label>
                    <div className={`flex items-center rounded-2xl border bg-white px-3.5 ${isGooglePlacesEnabled ? 'border-[#e8d5df]' : 'border-[#e8d5df]'}`}>
                      <Search className="mr-2 h-4 w-4 text-[#840d5c]/60" />
                      <input
                        id="guest-address-search"
                        type="text"
                        value={addressSearch}
                        onChange={(e) => setAddressSearch(e.target.value)}
                        className="w-full border-0 bg-transparent py-3 text-sm text-[#321327] outline-none placeholder:text-[#321327]/40"
                        placeholder="Start typing your area, street or landmark..."
                      />
                    </div>
                    <p className="mt-2 text-xs text-[#6b4f61]">📍 Select an address from suggestions to auto-fill city, state and PIN.</p>
                  </div>

                  <div className="my-3 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#8d6c7d]">
                    <span className="h-px flex-1 bg-[#ebd9e5]" />
                    OR
                    <span className="h-px flex-1 bg-[#ebd9e5]" />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="guest-pin" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b4f61]">Enter PIN code <span className="text-[#b11e72]">*</span></label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          id="guest-pin"
                          type="text"
                          inputMode="numeric"
                          autoComplete="postal-code"
                          maxLength={6}
                          value={addressForm.pin}
                          onChange={(e) => {
                            const numericPin = e.target.value.replace(/\D/g, '').slice(0, 6);
                            handleAddressInputChange('pin', numericPin);
                            setIsPinAutoFilled(false);
                            setPinLookupError('');
                            if (numericPin.length === 6) {
                              void handlePinLookup(numericPin);
                            }
                          }}
                          aria-invalid={Boolean(fieldErrors.pin)}
                          className={`w-full rounded-2xl border bg-white px-3.5 py-3 text-sm text-[#321327] outline-none focus:border-[#c02a82] focus:ring-2 focus:ring-[#f9dfe9] ${fieldErrors.pin || pinLookupError ? 'border-red-300 bg-red-50' : 'border-[#e8d5df]'}`}
                          placeholder="Enter 6-digit PIN"
                        />
                        <button
                          type="button"
                          onClick={() => handlePinLookup(addressForm.pin)}
                          disabled={isPinLoading || addressForm.pin.length !== 6}
                          className="rounded-2xl border border-[#e7c9d9] bg-[#fffafc] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#840d5c] transition-colors hover:bg-[#fff1f7] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isPinLoading ? 'Fetching...' : 'Fetch Address'}
                        </button>
                      </div>
                      {isPinLoading && (
                        <div className="mt-2 inline-flex items-center gap-2 text-xs text-[#840d5c]">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Fetching your location...
                        </div>
                      )}
                      {fieldErrors.pin && <p className="mt-1 text-xs text-red-600">{fieldErrors.pin}</p>}
                      {!fieldErrors.pin && pinLookupError && <p className="mt-1 text-xs text-red-600">{pinLookupError}</p>}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="guest-city" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b4f61]">City</label>
                        <input
                          id="guest-city"
                          value={addressForm.city}
                          onChange={(e) => handleAddressInputChange('city', e.target.value)}
                          autoComplete="address-level2"
                          readOnly={isPinAutoFilled}
                          disabled={isPinAutoFilled}
                          className={`w-full rounded-2xl border bg-white px-3.5 py-3 text-sm text-[#321327] outline-none focus:border-[#c02a82] focus:ring-2 focus:ring-[#f9dfe9] ${fieldErrors.city ? 'border-red-300 bg-red-50' : 'border-[#e8d5df]'} ${isPinAutoFilled ? 'bg-[#faf6f8] text-[#321327]/80' : ''}`}
                          placeholder="Auto-filled"
                        />
                        {fieldErrors.city && <p className="mt-1 text-xs text-red-600">{fieldErrors.city}</p>}
                      </div>

                      <div>
                        <label htmlFor="guest-state" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b4f61]">State</label>
                        <input
                          id="guest-state"
                          value={addressForm.state}
                          onChange={(e) => handleAddressInputChange('state', e.target.value)}
                          autoComplete="address-level1"
                          readOnly={isPinAutoFilled}
                          disabled={isPinAutoFilled}
                          className={`w-full rounded-2xl border bg-white px-3.5 py-3 text-sm text-[#321327] outline-none focus:border-[#c02a82] focus:ring-2 focus:ring-[#f9dfe9] ${fieldErrors.state ? 'border-red-300 bg-red-50' : 'border-[#e8d5df]'} ${isPinAutoFilled ? 'bg-[#faf6f8] text-[#321327]/80' : ''}`}
                          placeholder="Auto-filled"
                        />
                        {fieldErrors.state && <p className="mt-1 text-xs text-red-600">{fieldErrors.state}</p>}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="guest-house" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b4f61]">House / Flat / Building <span className="text-[#b11e72]">*</span></label>
                      <input
                        id="guest-house"
                        value={addressForm.house}
                        onChange={(e) => handleAddressInputChange('house', e.target.value)}
                        autoComplete="address-line1"
                        className={`w-full rounded-2xl border bg-white px-3.5 py-3 text-sm text-[#321327] outline-none focus:border-[#c02a82] focus:ring-2 focus:ring-[#f9dfe9] ${fieldErrors.house ? 'border-red-300 bg-red-50' : 'border-[#e8d5df]'}`}
                        placeholder="House no., building name, apartment"
                      />
                      {fieldErrors.house && <p className="mt-1 text-xs text-red-600">{fieldErrors.house}</p>}
                    </div>

                    <div>
                      <label htmlFor="guest-area" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b4f61]">Area / Street <span className="text-[#b11e72]">*</span></label>
                      <input
                        id="guest-area"
                        value={addressForm.area}
                        onChange={(e) => handleAddressInputChange('area', e.target.value)}
                        autoComplete="address-line2"
                        className={`w-full rounded-2xl border bg-white px-3.5 py-3 text-sm text-[#321327] outline-none focus:border-[#c02a82] focus:ring-2 focus:ring-[#f9dfe9] ${fieldErrors.area ? 'border-red-300 bg-red-50' : 'border-[#e8d5df]'}`}
                        placeholder="Area, street, locality"
                      />
                      {fieldErrors.area && <p className="mt-1 text-xs text-red-600">{fieldErrors.area}</p>}
                    </div>

                    <div>
                      <label htmlFor="guest-landmark" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b4f61]">Landmark (optional)</label>
                      <input
                        id="guest-landmark"
                        value={addressForm.landmark}
                        onChange={(e) => handleAddressInputChange('landmark', e.target.value)}
                        autoComplete="address-line3"
                        className="w-full rounded-2xl border border-[#e8d5df] bg-white px-3.5 py-3 text-sm text-[#321327] outline-none focus:border-[#c02a82] focus:ring-2 focus:ring-[#f9dfe9]"
                        placeholder="Near school, hospital, landmark etc."
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-[20px] border border-[#f1dce7] bg-[#fffafc] p-3">
                  <label className="inline-flex items-start gap-3 text-sm text-[#5f4556]">
                    <input
                      type="checkbox"
                      checked={addressForm.saveDetails}
                      onChange={(e) => handleAddressInputChange('saveDetails', e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-[#d8b5c8] text-[#9f1466] focus:ring-[#c02a82]"
                    />
                    <span>
                      <span className="font-medium text-[#321327]">Save my details for faster checkout next time</span>
                      <span className="mt-1 block text-xs text-[#6b4f61]">We&apos;ll remember this on this device (no account needed).</span>
                    </span>
                  </label>
                </div>

                <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#f3e1ea] pt-4">
                  <button
                    type="button"
                    onClick={() => setCheckoutStep(1)}
                    className="rounded-full border border-[#e7d4df] bg-white px-4 py-2.5 text-sm font-semibold text-[#6b4f61] hover:bg-[#fff8fa]"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAddressFromModal}
                    disabled={isSavingAddress || isPinLoading}
                    className="inline-flex items-center justify-center rounded-full bg-[#840d5c] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_26px_rgba(132,13,92,0.2)] transition-all hover:bg-[#6d0849] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingAddress ? 'Continuing...' : 'Continue to Payment →'}
                  </button>
                </div>
              </div>
            </div>
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