"use server";
import crypto from "crypto";
import { db } from "@/backend/lib/db";

export async function verifyPayment(
  orderId: string, 
  razorpayPaymentId: string, 
  razorpaySignature: string,
  dbOrderId: string
) {
  // 1. Generate the expected signature
  const body = orderId + "|" + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body.toString())
    .digest("hex");

  // 2. Compare signatures
  const isAuthentic = expectedSignature === razorpaySignature;

  if (isAuthentic) {
    // 3. Update Order in DB
    await db.order.update({
      where: { id: dbOrderId },
      data: { status: "PAID" },
    });

    // 4. Record the Payment
    await db.payment.create({
      data: {
        orderId: dbOrderId,
        amount: 0, // Ideally pass the actual amount here
        status: "COMPLETED",
        provider: "RAZORPAY",
        transactionId: razorpayPaymentId,
      }
    });

    return { success: true };
  } else {
    return { success: false, message: "Invalid payment signature" };
  }
}