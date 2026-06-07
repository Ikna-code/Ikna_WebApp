"use server";

import { Prisma } from "@prisma/client";
import { db } from "@/backend/lib/db";
import { validateCouponCode } from "@/backend/actions/promotions";

const SUPPORTED_COUPONS: Record<string, { minSubtotal: number; discountAmount: number }> = {
  SAVE100: { minSubtotal: 699, discountAmount: 100 },
  SAVE200: { minSubtotal: 1299, discountAmount: 200 },
};

export async function validateCouponForCart(
  userId: string,
  rawCode: string,
  subtotal: number
): Promise<{ success: true; code: string; discountAmount: number } | { success: false; error: string }> {
  try {
    const code = String(rawCode || "").trim().toUpperCase();
    const rule = SUPPORTED_COUPONS[code];

    if (!rule) {
      return { success: false, error: "Invalid coupon code." };
    }

    const numericSubtotal = Number(subtotal || 0);
    if (!Number.isFinite(numericSubtotal) || numericSubtotal < rule.minSubtotal) {
      return {
        success: false,
        error: `${code} is valid only for purchases above ₹${rule.minSubtotal}.`,
      };
    }

    await db.$transaction(async (tx) => {
      await validateCouponCode(tx, code, new Prisma.Decimal(numericSubtotal), userId);
    });

    return {
      success: true,
      code,
      discountAmount: rule.discountAmount,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Could not validate coupon.",
    };
  }
}
