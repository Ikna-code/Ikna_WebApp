"use server";

import { Prisma } from "@prisma/client";
import { db } from "@/backend/lib/db";
import { validateCouponCode } from "@/backend/actions/promotions";

const SUPPORTED_COUPONS: Record<string, { minSubtotal: number; discountAmount: number; title: string; description: string }> = {
  WELCOME100: {
    minSubtotal: 0,
    discountAmount: 100,
    title: "WELCOME100",
    description: "One-time use. Can be used even when combo is active.",
  },
  SAVE100: {
    minSubtotal: 699,
    discountAmount: 100,
    title: "SAVE100",
    description: "Flat ₹100 off on orders above ₹699.",
  },
  SAVE200: {
    minSubtotal: 1299,
    discountAmount: 200,
    title: "SAVE200",
    description: "Flat ₹200 off on orders above ₹1299.",
  },
};

const NON_CANCELLED_ORDER_STATUSES = ["PENDING", "PAID", "SHIPPED", "DELIVERED"] as const;

export type CartCouponTicket = {
  code: string;
  title: string;
  description: string;
  minSubtotal: number;
  discountAmount: number;
  enabled: boolean;
  disabledReason: string | null;
  isApplied: boolean;
};

export async function getCouponTicketsForCart(
  userId: string,
  subtotal: number,
  isComboLocked: boolean,
  appliedCouponCode: string | null = null
): Promise<CartCouponTicket[]> {
  const numericSubtotal = Number(subtotal || 0);

  const [orderCount, couponUsageRows] = await Promise.all([
    db.order.count({
      where: {
        userId,
        status: { in: NON_CANCELLED_ORDER_STATUSES as any },
      },
    }),
    db.order.findMany({
      where: {
        userId,
        status: { in: NON_CANCELLED_ORDER_STATUSES as any },
        couponAppliedId: { not: null },
      },
      select: {
        coupon: {
          select: {
            code: true,
          },
        },
      },
    }),
  ]);

  const usedCouponCodes = new Set(
    couponUsageRows
      .map((row) => String(row?.coupon?.code || "").trim().toUpperCase())
      .filter(Boolean)
  );

  const normalizedAppliedCouponCode = String(appliedCouponCode || "").trim().toUpperCase();

  return Object.entries(SUPPORTED_COUPONS).map(([code, rule]) => {
    const normalizedCode = String(code).trim().toUpperCase();
    const isWelcomeCoupon = normalizedCode === "WELCOME100";

    let enabled = true;
    let disabledReason: string | null = null;

    if (!isWelcomeCoupon && isComboLocked) {
      enabled = false;
      disabledReason = "Disabled while combo is active.";
    }

    if (enabled && numericSubtotal < rule.minSubtotal) {
      enabled = false;
      disabledReason = `Minimum order ₹${rule.minSubtotal} required.`;
    }

    if (enabled && usedCouponCodes.has(normalizedCode)) {
      enabled = false;
      disabledReason = "Already used.";
    }

    return {
      code: normalizedCode,
      title: rule.title,
      description: rule.description,
      minSubtotal: rule.minSubtotal,
      discountAmount: rule.discountAmount,
      enabled,
      disabledReason,
      isApplied: normalizedAppliedCouponCode === normalizedCode,
    };
  });
}

export async function validateCouponForCart(
  userId: string,
  rawCode: string,
  subtotal: number,
  isComboLocked = false
): Promise<{ success: true; code: string; discountAmount: number } | { success: false; error: string }> {
  try {
    const code = String(rawCode || "").trim().toUpperCase();
    const rule = SUPPORTED_COUPONS[code];

    if (!rule) {
      return { success: false, error: "Invalid coupon code." };
    }

    if (isComboLocked && code !== "WELCOME100") {
      return { success: false, error: "Combo is active. Only WELCOME100 can be applied." };
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
