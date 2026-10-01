"use server";

import { razorpay } from "@/backend/services/razorpay";
import { createOrder } from "@/backend/actions/order";

export async function createRazorpayOrder(
  userId: string | null,
  couponCode?: string | null,
  guestData?: {
    name?: string;
    email?: string;
    phone?: string;
    shippingAddress?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    items?: Array<any>;
  }
) {
  const normalizedCouponCode = couponCode?.trim() ? couponCode.trim() : null;

  const orderRes = await createOrder(userId as any, normalizedCouponCode, {
    clearCart: false,
    orderStatus: "PENDING",
    ...( { guestCustomer: guestData || null, guestCartItems: guestData?.items || [] } as any),
  });

  if (!orderRes?.success || !orderRes.order) {
    throw new Error(orderRes?.error || "Could not create order");
  }

  const totalAmount = Number(orderRes.order.totalAmount);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new Error("Invalid checkout amount");
  }

  // 1. Create Order in Razorpay (Amount must be in Paise: 1 INR = 100 Paise)
  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(totalAmount * 100),
    currency: "INR",
    receipt: `order_${orderRes.order.id}`,
    notes: {
      dbOrderId: orderRes.order.id,
      userId: userId || 'guest',
      guestEmail: guestData?.email || null,
    },
  });

  return {
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    dbOrderId: orderRes.order.id
  };
}