import { db } from "@/backend/lib/db";
import { Prisma } from "@prisma/client";




/**
 * Scans a cart array to see if any products form bundles defined by active combo deals.
 * Returns an object mapping individual productId strings to a calculated discount factor.
 */
export async function calculateComboDiscounts(tx: any, cartItems: any[]) {
  const itemDiscounts: Record<string, { amountPerUnit: Prisma.Decimal; comboOfferId: string }> = {}; // Map of productId -> discount decimal amount per unit
  
  // Fetch active combo offers along with their eligible matching product records
  const activeCombos = await tx.comboOffer.findMany({
    where: { isActive: true },
    include: { products: { select: { id: true } } }
  });

  const cartProductIds = cartItems.map(item => item.productId);

  for (const combo of activeCombos) {
    const requiredIds = combo.products.map((p: { id: string }) => p.id);
    
    // Check if every single product required for the combo is present in the current cart
    const isComboMatched = requiredIds.every((id: string) => cartProductIds.includes(id));

    if (isComboMatched) {
      // Find the items matching this combination and calculate discount distributions
      cartItems.forEach(item => {
        if (requiredIds.includes(item.productId)) {
          const itemBasePrice = new Prisma.Decimal(item.product.price);
          // percentage factor: (price * discountPct) / 100
          const unitDiscount = itemBasePrice.mul(new Prisma.Decimal(combo.discountPct)).div(100);
          
          // Store discount mapped to the offer context
          itemDiscounts[item.productId] = {
            amountPerUnit: unitDiscount,
            comboOfferId: combo.id
          };
        }
      });
      // Break early if you only allow one global combo package scenario per cart instance
      break; 
    }
  }
  return itemDiscounts;
}

/**
 * Validates a coupon string code against the active database records
 */
export async function validateCouponCode(tx: any, code: any, currentSubtotal: any, userId: any) {
  // 1. If no code was provided, skip validation
  if (!code || String(code).trim() === "" || String(code).trim() === "null" || String(code).trim() === "undefined") {
    return null;
  }
  
  const cleanCode = String(code).trim().toUpperCase();

  // 2. Fetch the coupon details from the database
  const coupon = await tx.coupon.findUnique({
    where: { code: cleanCode }
  });

  if (!coupon) {
    throw new Error(`Coupon "${cleanCode}" does not exist.`);
  }

  if (!coupon.isActive) {
    throw new Error(`Coupon "${cleanCode}" is no longer active.`);
  }

  if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
    throw new Error(`Coupon "${cleanCode}" has expired.`);
  }

  if (Number(currentSubtotal) < Number(coupon.minSubtotal)) {
    throw new Error(`Minimum spend of ₹${coupon.minSubtotal} required for this coupon.`);
  }

  // 3. CRITICAL: Check if this specific user has already used this coupon
  const dynamicUsageCount = await tx.order.count({
    where: {
      userId: userId,
      couponAppliedId: coupon.id,
      // Only count it as "used" if the order wasn't cancelled
      status: { in: ["PENDING", "PAID", "SHIPPED", "DELIVERED"] } 
    }
  });

  if (dynamicUsageCount > 0) {
    throw new Error(`You have already used the coupon code "${cleanCode}".`);
  }

  return coupon;
}