"use server";

import { razorpay } from "@/backend/services/razorpay";
import { createOrder } from "@/backend/actions/order";

export async function createRazorpayOrder(userId: string, couponCode?: string | null) {
  const normalizedCouponCode = couponCode?.trim() ? couponCode.trim() : null;

  const orderRes = await createOrder(userId, normalizedCouponCode, {
    clearCart: false,
    orderStatus: "PENDING",
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
    amount: Math.round(1 * 100), 
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
  });

  return {
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    dbOrderId: orderRes.order.id
  };
}