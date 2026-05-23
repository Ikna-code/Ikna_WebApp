"use server";

import { db } from "@/backend/lib/db";
import { razorpay } from "@/backend/services/razorpay";

export async function createRazorpayOrder(userId: string) {
  const cartItems = await db.cartItem.findMany({
    where: { userId },
    include: { product: true },
  });

  const subtotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const shipping = subtotal > 5000 ? 0 : 150;
  const totalAmount = subtotal + shipping;

  // 1. Create Order in Razorpay (Amount must be in Paise: 1 INR = 100 Paise)
  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(totalAmount * 100), 
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
  });

  // 2. Create Order in your DB (Status: PENDING)
  const dbOrder = await db.order.create({
    data: {
      userId,
      totalAmount: totalAmount,
      status: "PENDING",
      orderItems: {
        create: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.product.price,
        })),
      },
    },
  });

  return {
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    dbOrderId: dbOrder.id
  };
}