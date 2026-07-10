"use client";
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock3,
  CreditCard,
  Headset,
  IndianRupee,
  MapPin,
  Package,
  Truck,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import ShipmentTracker from './ShipmentTracker';
import { useStore } from '@/store/useStore';
import { getShortOrderReference } from '@/lib/orderReference';
import { getOptimizedSupabaseImageUrl } from '@/lib/supabaseImage';
import { AccountPageSkeleton } from '@/components/utility/PageSkeletons';

type BadgeTone = 'green' | 'amber' | 'purple' | 'blue' | 'gray' | 'red';

const badgeStyles: Record<BadgeTone, string> = {
  green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  amber: 'bg-amber-50 border-amber-200 text-amber-700',
  purple: 'bg-violet-50 border-violet-200 text-violet-700',
  blue: 'bg-sky-50 border-sky-200 text-sky-700',
  gray: 'bg-slate-100 border-slate-200 text-slate-600',
  red: 'bg-rose-50 border-rose-200 text-rose-700',
};

const toTitleCase = (value?: string) =>
  String(value || 'Processing')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatCurrency = (value: unknown) => {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('en-IN').format(Number.isFinite(amount) ? amount : 0);
};

const formatDate = (value?: string | Date | null, withTime = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return withTime
    ? date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
};

const StatusBadge = ({
  label,
  tone,
  icon,
}: {
  label: string;
  tone: BadgeTone;
  icon: React.ReactNode;
}) => (
  <span
    className={`inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.04em] leading-none ${badgeStyles[tone]}`}
  >
    {icon}
    <span className="min-w-0 truncate">{label}</span>
  </span>
);

const getPaymentBadgeProps = (status: string) => {
  const normalized = String(status || 'PENDING').trim().toUpperCase();

  if (normalized === 'COMPLETED') {
    return { label: 'Paid', tone: 'green' as const, icon: <CheckCircle2 size={12} /> };
  }
  if (normalized === 'FAILED') {
    return { label: 'Failed', tone: 'red' as const, icon: <XCircle size={12} /> };
  }
  if (normalized === 'REFUNDED') {
    return { label: 'Refunded', tone: 'gray' as const, icon: <XCircle size={12} /> };
  }
  return { label: 'Pending', tone: 'amber' as const, icon: <Clock3 size={12} /> };
};

const getDeliveryBadgeProps = (order: any) => {
  const status = String(order?.status || 'PENDING').trim().toUpperCase();
  const shiprocketStatus = String(order?.shiprocketStatus || '').trim().toUpperCase();

  if (shiprocketStatus.includes('RETURN_REQUESTED')) {
    return { label: 'Return Requested', tone: 'amber' as const, icon: <Clock3 size={12} /> };
  }

  if (status === 'DELIVERED') {
    return { label: 'Delivered', tone: 'blue' as const, icon: <Truck size={12} /> };
  }
  if (status === 'SHIPPED') {
    return { label: 'In Transit', tone: 'purple' as const, icon: <Truck size={12} /> };
  }
  if (status === 'CANCELLED') {
    return { label: 'Cancelled', tone: 'gray' as const, icon: <XCircle size={12} /> };
  }
  return { label: 'Processing', tone: 'purple' as const, icon: <Clock3 size={12} /> };
};

const getPaymentMethodLabel = (order: any) => {
  const provider = String(order?.payment?.provider || '').trim().toUpperCase();
  if (provider === 'COD') {
    return 'Cash On Delivery';
  }
  if (provider === 'ONLINE' || provider === 'RAZORPAY' || order?.razorpayOrderId) {
    return 'Online Payment';
  }
  if (provider === 'MANUAL_ADMIN') {
    return 'Manual Settlement';
  }
  if (provider) {
    return toTitleCase(provider);
  }
  return 'Not Available';
};

const getPaymentStatusLabel = (order: any) => {
  const paymentStatus = String(order?.payment?.status || 'PENDING').trim().toUpperCase();
  const paymentMethod = String(order?.payment?.provider || '').trim().toUpperCase();

  if (paymentStatus === 'COMPLETED') {
    return paymentMethod === 'COD' ? 'Paid on Delivery' : 'Paid';
  }

  if (paymentStatus === 'FAILED') {
    return 'Payment Failed';
  }

  if (paymentStatus === 'REFUNDED') {
    return 'Refunded';
  }

  if (paymentMethod === 'COD') {
    return 'Pending (Pay on Delivery)';
  }

  return 'Pending';
};

const OrdersPage = () => {
  const orders = useStore((s) => s.orders);
  const isOrdersInitialized = useStore((s) => s.isOrdersInitialized);
  const isAuthInitialized = useStore((s) => s.isAuthInitialized);
  const user = useStore((s) => s.user);
  const fetchOrders = useStore((s) => s.fetchOrders);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const orderCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleOrderAction = async (orderId: string, action: 'return') => {
    const loadingKey = `${orderId}:${action}`;
    setActionLoadingKey(loadingKey);

    try {
      const response = await fetch(`/api/orders/${orderId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not process order action.');
      }

      toast.success(payload?.message || 'Order updated successfully.');
      await fetchOrders(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not process order action.';
      toast.error(message);
    } finally {
      setActionLoadingKey(null);
    }
  };

  useEffect(() => {
    if (!isAuthInitialized || !user?.id || isOrdersInitialized) {
      return;
    }

    if (!isOrdersInitialized) {
      void fetchOrders();
    }
  }, [isAuthInitialized, user?.id, isOrdersInitialized, fetchOrders]);

  const loading = !isAuthInitialized || (Boolean(user?.id) && !isOrdersInitialized);

  const toggleAccordion = (id: string) => {
    setActiveOrderId((previousId) => {
      const nextId = previousId === id ? null : id;

      if (nextId) {
        // Wait for the accordion transition to start before bringing the card into view.
        window.requestAnimationFrame(() => {
          window.setTimeout(() => {
            const cardElement = orderCardRefs.current[id];
            if (!cardElement) return;

            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const topOffset = 120;
            const cardRect = cardElement.getBoundingClientRect();

            if (cardRect.top < topOffset || cardRect.bottom > viewportHeight) {
              const targetTop = window.scrollY + cardRect.top - topOffset;
              window.scrollTo({ top: Math.max(targetTop, 0), behavior: 'smooth' });
            }
          }, 180);
        });
      }

      return nextId;
    });
  };

  if (loading) {
    return (
      <div className="bg-[#FAF3F5] min-h-screen">
        <AccountPageSkeleton />
      </div>
    );
  }

  return (
    <div className="bg-[#FAF3F5] min-h-screen">
      <main className="mx-auto max-w-6xl px-2 py-4 sm:px-0 sm:py-6 md:py-10">
        {!orders || orders.length === 0 ? (
          <div className="bg-white rounded-2xl sm:rounded-[2rem] p-8 sm:p-12 text-center border border-[#840d5c]/5 shadow-sm">
            <Package size={40} className="mx-auto text-[#840d5c]/20 mb-4" />
            <h2 className="text-lg sm:text-xl font-serif text-[#321327] mb-2">No orders found</h2>
            <p className="text-xs text-[#321327]/60">When you place an order, it will appear here.</p>
          </div>
        ) : (
          <div className="w-full min-w-0 max-w-full space-y-4 box-border sm:space-y-5">
            {orders.map((order) => {
              const isOpen = activeOrderId === order.id;
              const accordionId = `order-panel-${order.id}`;
              const paymentBadge = getPaymentBadgeProps(order?.payment?.status || 'PENDING');
              const deliveryBadge = getDeliveryBadgeProps(order);
              const subtotal = Number(order.totalAmount || 0) + Number(order.discountAmount || 0);
              const discount = Number(order.discountAmount || 0);
              const shipping = 0;
              const estimatedDeliveryDate =
                formatDate(order.deliveredAt) ||
                formatDate(order.shippedAt) ||
                formatDate(order.packedAt) ||
                'To be confirmed';
              const hasShipmentTracking = order.status === 'SHIPPED' && order.shipmentId;
              const isReturnRequested = String(order?.shiprocketStatus || '').toUpperCase().includes('RETURN_REQUESTED');
              const canRequestReturn = String(order.status || '').toUpperCase() === 'DELIVERED' && !isReturnRequested;

              const timelineSteps = [
                {
                  status: 'Order Placed',
                  completed: true,
                  current: order.status === 'PENDING',
                  date: formatDate(order.createdAt, true) || 'Order confirmed',
                },
                {
                  status: 'Order Packed',
                  completed: ['PAID', 'SHIPPED', 'DELIVERED'].includes(order.status),
                  current: order.status === 'PAID',
                  date: formatDate(order.packedAt, true) || 'Processing',
                },
                {
                  status: 'Order Dispatched',
                  completed: ['SHIPPED', 'DELIVERED'].includes(order.status),
                  current: order.status === 'SHIPPED',
                  date: formatDate(order.shippedAt, true) || 'In Transit',
                },
                {
                  status: 'Order Delivered',
                  completed: order.status === 'DELIVERED',
                  current: order.status === 'DELIVERED',
                  date: formatDate(order.deliveredAt, true) || 'Expected Soon',
                },
              ];

              const shortOrderReference = getShortOrderReference(order.id);
              const addressObject = order.address && typeof order.address === 'object' ? order.address : null;

              const resolvedAddress =
                (typeof order.address === 'string' && order.address.trim()) ||
                (typeof order.shippingAddress === 'string' && order.shippingAddress.trim()) ||
                (order.address && typeof order.address === 'object'
                  ? [
                      order.address.name,
                      order.address.street,
                      order.address.city,
                      order.address.state,
                      order.address.zip,
                      order.address.country,
                    ]
                      .filter(Boolean)
                      .join(', ')
                  : '') ||
                'Address not available';

              return (
                <div
                  key={order.id}
                  ref={(element) => {
                    orderCardRefs.current[order.id] = element;
                  }}
                  className={`w-full min-w-0 max-w-full box-border rounded-2xl sm:rounded-[2rem] border bg-white shadow-[0_12px_30px_-18px_rgba(132,13,92,0.25)] transition-all duration-300 ${
                    isOpen
                      ? 'border-[#840d5c]/25 ring-1 ring-[#840d5c]/10'
                      : 'border-[#840d5c]/10 hover:border-[#840d5c]/20'
                  }`}
                >
                  <button
                    onClick={() => toggleAccordion(order.id)}
                    aria-expanded={isOpen}
                    aria-controls={accordionId}
                    className="w-full min-w-0 max-w-full box-border cursor-pointer px-3.5 py-3 text-left transition-colors duration-300 hover:bg-[#FAF3F5]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#840d5c]/30 sm:px-6 sm:py-5"
                  >
                    <div className="flex w-full min-w-0 max-w-full flex-wrap items-center justify-between gap-3 box-border sm:flex-nowrap sm:gap-4">
                      <div className="flex w-full min-w-0 flex-1 items-center gap-2.5 sm:w-auto sm:gap-4">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors sm:h-12 sm:w-12 ${
                            isOpen
                              ? 'border-[#840d5c]/20 bg-[#840d5c] text-white'
                              : 'border-[#840d5c]/10 bg-[#FAF3F5] text-[#840d5c]'
                          }`}
                        >
                          <Package size={15} className="sm:size-5.5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-[14px] font-bold text-[#321327] sm:text-lg">#{shortOrderReference}</h3>
                          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-[#321327]/55 sm:mt-1 sm:gap-2 sm:text-sm">
                            <span className="truncate">{formatDate(order.createdAt) || 'Date unavailable'}</span>
                            <span aria-hidden="true">•</span>
                            <span className="shrink-0 font-semibold text-[#321327]/60">₹{formatCurrency(order.totalAmount)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex w-full min-w-0 max-w-full items-center justify-end gap-1.5 box-border sm:w-auto sm:shrink-0 sm:gap-3">
                        <StatusBadge label={paymentBadge.label} tone={paymentBadge.tone} icon={paymentBadge.icon} />
                        <ChevronDown
                          size={16}
                          className={`text-[#321327]/35 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </div>
                  </button>

                  <div
                    id={accordionId}
                    className={`grid w-full min-w-0 max-w-full overflow-hidden box-border transition-[grid-template-rows,opacity] duration-300 ease-out ${
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="min-h-0 w-full min-w-0 max-w-full box-border">
                      <div
                        className={`w-full min-w-0 max-w-full box-border border-t border-[#840d5c]/10 px-4 transition-[padding] duration-300 sm:px-6 md:px-8 ${
                          isOpen ? 'py-6 sm:py-7' : 'py-0'
                        }`}
                      >
                        <div className="w-full min-w-0 max-w-full box-border rounded-xl border border-[#840d5c]/10 bg-[#fff9fc] p-4 sm:p-5 lg:hidden">
                          <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#840d5c]">Order Summary</h4>
                          <div className="mt-3 w-full min-w-0 max-w-full space-y-2 box-border rounded-lg border border-[#840d5c]/8 bg-white/55 p-3">
                            <div className="w-full min-w-0 max-w-full box-border rounded-md bg-white/70 px-3 py-2.5">
                              <p className="text-[12px] font-medium text-[#321327]/65">Order Total</p>
                              <p className="overflow-hidden text-ellipsis wrap-break-word text-sm font-semibold leading-relaxed text-[#321327]">₹{formatCurrency(order.totalAmount)}</p>
                            </div>
                            <div className="w-full min-w-0 max-w-full box-border rounded-md bg-white/70 px-3 py-2.5">
                              <p className="text-[12px] font-medium text-[#321327]/65">Payment Method</p>
                              <p className="overflow-hidden text-ellipsis wrap-break-word text-sm font-semibold leading-relaxed text-[#321327]">{getPaymentMethodLabel(order)}</p>
                            </div>
                            <div className="w-full min-w-0 max-w-full box-border rounded-md bg-white/70 px-3 py-2.5">
                              <p className="text-[12px] font-medium text-[#321327]/65">Payment Status</p>
                              <p className="overflow-hidden text-ellipsis wrap-break-word text-sm font-semibold leading-relaxed text-[#321327]">{getPaymentStatusLabel(order)}</p>
                            </div>
                            <div className="w-full min-w-0 max-w-full box-border rounded-md bg-white/70 px-3 py-2.5">
                              <p className="text-[12px] font-medium text-[#321327]/65">Order Status</p>
                              <p className="overflow-hidden text-ellipsis wrap-break-word text-sm font-semibold leading-relaxed text-[#321327]">{toTitleCase(order.status)}</p>
                            </div>
                            <div className="w-full min-w-0 max-w-full box-border rounded-md bg-white/70 px-3 py-2.5">
                              <p className="text-[12px] font-medium text-[#321327]/65">Estimated Delivery</p>
                              <p className="overflow-hidden text-ellipsis wrap-break-word text-sm font-semibold leading-relaxed text-[#321327]">{estimatedDeliveryDate}</p>
                            </div>
                          </div>
                        </div>

                        <div className="hidden grid-cols-5 gap-3 lg:grid">
                          <div className="rounded-xl border border-[#840d5c]/10 bg-[#fff9fc] p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#321327]/50">Order Total</p>
                            <p className="mt-2 text-lg font-semibold text-[#321327]">₹{formatCurrency(order.totalAmount)}</p>
                          </div>
                          <div className="rounded-xl border border-[#840d5c]/10 bg-[#fff9fc] p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#321327]/50">Payment Method</p>
                            <div className="mt-2 flex items-center gap-2 text-sm font-medium text-[#321327]">
                              <CreditCard size={14} className="text-[#840d5c]" />
                              <span>{getPaymentMethodLabel(order)}</span>
                            </div>
                          </div>
                          <div className="rounded-xl border border-[#840d5c]/10 bg-[#fff9fc] p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#321327]/50">Payment Status</p>
                            <div className="mt-2">
                              <StatusBadge label={getPaymentStatusLabel(order)} tone={paymentBadge.tone} icon={paymentBadge.icon} />
                            </div>
                          </div>
                          <div className="rounded-xl border border-[#840d5c]/10 bg-[#fff9fc] p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#321327]/50">Order Status</p>
                            <div className="mt-2">
                              <StatusBadge label={toTitleCase(order.status)} tone={deliveryBadge.tone} icon={deliveryBadge.icon} />
                            </div>
                          </div>
                          <div className="rounded-xl border border-[#840d5c]/10 bg-[#fff9fc] p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#321327]/50">Estimated Delivery</p>
                            <div className="mt-2 flex items-center gap-2 text-sm font-medium text-[#321327]">
                              <CalendarDays size={14} className="text-[#840d5c]" />
                              <span>{estimatedDeliveryDate}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 w-full min-w-0 max-w-full box-border sm:mt-8">
                          <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-[#840d5c]">Items in this order</h4>
                          <div className="w-full min-w-0 max-w-full space-y-3 box-border">
                            {order.orderItems?.map((item: any) => (
                              <div
                                key={item.id}
                                className="flex w-full min-w-0 max-w-full box-border flex-col gap-3 rounded-2xl border border-[#840d5c]/10 bg-[#fffafd] p-3 shadow-[0_8px_18px_-16px_rgba(50,19,39,0.7)] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4"
                              >
                                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                                  <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-[#840d5c]/8 bg-white sm:h-20 sm:w-14">
                                    <Image
                                      src={getOptimizedSupabaseImageUrl(item.productImage, { width: 320, quality: 70 })}
                                      alt={item.productName || 'Product Image'}
                                      fill
                                      className="object-cover"
                                      sizes="56px"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <h5 className="truncate text-sm font-semibold text-[#321327] sm:text-base">{item.productName || 'Product'}</h5>
                                    <div className="mt-1.5 space-y-1 text-[11px] text-[#321327]/65 sm:text-xs">
                                      <p className="wrap-break-word">Size: {item.productSize || item.selectedSize || 'N/A'}</p>
                                      <p className="wrap-break-word">Color: {item.productColorName || 'N/A'}</p>
                                      <p className="wrap-break-word">Qty: {item.quantity || 0}</p>
                                    </div>
                                  </div>
                                </div>
                                <p className="wrap-break-word text-sm font-semibold text-[#321327] sm:text-base">₹{formatCurrency(item.price)}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-6 grid w-full min-w-0 max-w-full grid-cols-1 gap-5 box-border lg:grid-cols-2 lg:gap-6">
                          <div className="w-full min-w-0 max-w-full box-border rounded-2xl border border-[#840d5c]/10 bg-white p-4 sm:p-5">
                            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-[#840d5c]">Order Timeline</h4>
                            <div className="relative w-full min-w-0 max-w-full space-y-6 pl-1 box-border">
                              <div className="absolute bottom-3 left-2.75 top-2 w-px bg-[#e9d9e2]" />
                              {timelineSteps.map((step, idx) => (
                                <div key={idx} className="relative flex items-start gap-3 sm:gap-4">
                                  <div
                                    className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                                      step.completed
                                        ? 'border-[#840d5c] bg-[#840d5c] text-white'
                                        : step.current
                                          ? 'h-7 w-7 border-2 border-[#840d5c] bg-white text-[#840d5c]'
                                          : 'border-[#d9c2cf] bg-white text-[#d9c2cf]'
                                    }`}
                                  >
                                    {step.completed ? (
                                      <CheckCircle2 size={12} />
                                    ) : step.current ? (
                                      <Clock3 size={12} />
                                    ) : (
                                      <CircleDashed size={12} />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-[#321327]">{step.status}</p>
                                    <p className="mt-1 text-xs text-[#321327]/50">{step.date}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="w-full min-w-0 max-w-full space-y-4 box-border">
                            <div className="w-full min-w-0 max-w-full box-border rounded-2xl border border-[#840d5c]/10 bg-[#fff9fc] p-4 sm:p-5">
                              <div className="flex items-center gap-2 text-[#840d5c]">
                                <MapPin size={15} />
                                <span className="text-xs font-semibold uppercase tracking-[0.15em]">Shipping Address</span>
                              </div>
                              {addressObject?.name && <p className="mt-3 wrap-break-word text-sm font-semibold text-[#321327]">{addressObject.name}</p>}
                              <p className="mt-2 wrap-break-word text-sm leading-relaxed text-[#321327]/70">{resolvedAddress}</p>
                              {addressObject?.phone && <p className="mt-2 wrap-break-word text-xs text-[#321327]/55">Phone: {addressObject.phone}</p>}
                            </div>

                            <div className="w-full min-w-0 max-w-full box-border rounded-2xl border border-[#840d5c]/10 bg-white p-4 sm:p-5">
                              <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#840d5c]">Price Summary</h4>
                              <div className="mt-3 space-y-2 text-sm text-[#321327]/75">
                                <div className="flex items-center justify-between gap-4">
                                  <span>Subtotal</span>
                                  <span>₹{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="h-px bg-[#f2e6ec]" />
                                <div className="flex items-center justify-between gap-4">
                                  <span>Shipping</span>
                                  <span>{shipping > 0 ? `₹${formatCurrency(shipping)}` : 'Free'}</span>
                                </div>
                                <div className="h-px bg-[#f2e6ec]" />
                                <div className="flex items-center justify-between gap-4">
                                  <span>Discount</span>
                                  <span>{discount > 0 ? `-₹${formatCurrency(discount)}` : '₹0'}</span>
                                </div>
                                <div className="h-px bg-[#e8d4df]" />
                                <div className="flex items-center justify-between gap-4 rounded-xl bg-[#fff8fb] px-3 py-2 font-semibold text-[#321327]">
                                  <span>Total</span>
                                  <span className="inline-flex items-center gap-1">
                                    <IndianRupee size={14} />
                                    {formatCurrency(order.totalAmount)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {hasShipmentTracking && (
                          <div className="mt-6" id={`track-${order.id}`}>
                            <ShipmentTracker shipmentId={order.shipmentId} />
                          </div>
                        )}

                        <div className="mt-6 flex flex-wrap gap-3 border-t border-[#f2e5eb] pt-5">
                          {canRequestReturn && (
                            <button
                              onClick={() => void handleOrderAction(order.id, 'return')}
                              disabled={actionLoadingKey === `${order.id}:return`}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:opacity-60 sm:w-auto"
                            >
                              <Clock3 size={15} />
                              {actionLoadingKey === `${order.id}:return` ? 'Submitting...' : 'Request Return'}
                            </button>
                          )}
                          {isReturnRequested && (
                            <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 sm:w-auto">
                              <Clock3 size={15} /> Return Requested
                            </span>
                          )}
                          {hasShipmentTracking && (
                            <a
                              href={`#track-${order.id}`}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#840d5c]/20 bg-white px-4 py-3 text-sm font-medium text-[#840d5c] transition-colors hover:bg-[#fff2f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#840d5c]/30 sm:w-auto"
                            >
                              <Truck size={15} />
                              Track Order
                            </a>
                          )}
                          <Link
                            href="/FAQs"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#840d5c]/20 bg-white px-4 py-3 text-sm font-medium text-[#840d5c] transition-colors hover:bg-[#fff2f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#840d5c]/30 sm:w-auto"
                          >
                            <Headset size={15} />
                            Need Help
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default OrdersPage;

