import { Prisma } from "@prisma/client";


type ComboSelectedProduct = {
  cartItemId?: string;
  comboBundleId?: string | null;
  productId?: string;
  category?: string | null;
  subCategory?: string | null;
  subCategoryName?: string | null;
  subCategoryId?: string | null;
  comboEligibleQuantity?: number | null;
  quantity?: number | null;
};

type ComboQualificationGroup = {
  key: string;
  subCategory: string;
  quantity: number;
  cartItemIds: string[];
  items: ComboSelectedProduct[];
};

const normalizeComboValue = (value: unknown) => String(value || '').trim().toLowerCase();

export function qualifyProductsForSameSubCategoryCombo(
  selectedProducts: ComboSelectedProduct[],
  minimumQuantity = 3
) {
  const groups = new Map<string, ComboQualificationGroup>();

  for (const item of selectedProducts) {
    const normalizedBundleId = normalizeComboValue(item?.comboBundleId);
    const normalizedSubCategory = normalizeComboValue(
      item?.subCategoryName || item?.subCategory || item?.subCategoryId
    );

    if (!normalizedBundleId || !normalizedSubCategory) {
      continue;
    }

    const key = `${normalizedBundleId}::${normalizedSubCategory}`;
    const quantity = Math.max(Number(item?.comboEligibleQuantity) || 0, 0);
    if (quantity <= 0) {
      continue;
    }
    const existing = groups.get(key);

    if (existing) {
      existing.quantity += quantity;
      if (item?.cartItemId) {
        existing.cartItemIds.push(String(item.cartItemId));
      }
      existing.items.push(item);
      continue;
    }

    groups.set(key, {
      key,
      subCategory: normalizedSubCategory,
      quantity,
      cartItemIds: item?.cartItemId ? [String(item.cartItemId)] : [],
      items: [item],
    });
  }

  const qualifyingGroups = Array.from(groups.values()).filter(
    (group) => group.quantity >= minimumQuantity
  );

  return {
    groups: Array.from(groups.values()),
    qualifyingGroups,
    qualifies: qualifyingGroups.length > 0,
  };
}

function mapEligibleUnitsByCartItem(
  selectedProducts: ComboSelectedProduct[],
  minimumQuantity = 3
) {
  const grouped = new Map<string, ComboSelectedProduct[]>();

  for (const item of selectedProducts) {
    const bundleId = normalizeComboValue(item?.comboBundleId);
    const subCategoryKey = normalizeComboValue(
      item?.subCategoryName || item?.subCategory || item?.subCategoryId
    );

    if (!bundleId || !subCategoryKey || !item?.cartItemId) {
      continue;
    }

    const groupKey = `${bundleId}::${subCategoryKey}`;

    const existing = grouped.get(groupKey);
    if (existing) {
      existing.push(item);
      continue;
    }

    grouped.set(groupKey, [item]);
  }

  const eligibleUnitsByCartItemId = new Map<string, number>();

  for (const items of grouped.values()) {
    const totalQty = items.reduce((sum, item) => sum + Math.max(Number(item?.comboEligibleQuantity) || 0, 0), 0);
    let remainingEligibleUnits =
      Math.floor(totalQty / Math.max(minimumQuantity, 1)) * Math.max(minimumQuantity, 1);

    for (const item of items) {
      if (remainingEligibleUnits <= 0) {
        break;
      }

      const lineQty = Math.max(Number(item?.comboEligibleQuantity) || 0, 0);
      if (lineQty <= 0) {
        continue;
      }
      const discountedUnits = Math.min(lineQty, remainingEligibleUnits);

      if (discountedUnits > 0 && item?.cartItemId) {
        eligibleUnitsByCartItemId.set(String(item.cartItemId), discountedUnits);
        remainingEligibleUnits -= discountedUnits;
      }
    }
  }

  return eligibleUnitsByCartItemId;
}



/**
 * Scans a cart array to see if any products form bundles defined by active combo deals.
 * Returns an object mapping cartItemId strings to discount metadata.
 */
export async function calculateComboDiscounts(tx: any, cartItems: any[]) {
  const itemDiscounts: Record<string, { amountPerUnit: Prisma.Decimal; discountedUnits: number; comboOfferId: string }> = {}; // Map of cartItemId -> combo metadata
  
  // Fetch active combo offers along with their eligible matching product records
  const activeCombos = await tx.comboOffer.findMany({
    where: { isActive: true },
    include: {
      ComboProducts: {
        select: {
          Product: {
            select: {
              id: true,
              category: true,
              subCategoryId: true,
              subCategory: {
                select: {
                  name: true,
                  slug: true,
                },
              },
            }
          }
        }
      }
    }
  });

  for (const combo of activeCombos) {
    const selectedComboItems = cartItems.map((item) => ({
      cartItemId: item?.id,
      comboBundleId: item?.comboBundleId,
      productId: item?.productId,
      quantity: item?.quantity,
      comboEligibleQuantity: item?.comboEligibleQuantity,
      category: item?.product?.category,
      subCategoryId: item?.product?.subCategoryId,
      subCategoryName: item?.product?.subCategory?.name || item?.product?.subCategory?.slug,
      subCategory: item?.product?.subCategoryName,
    }));

    const comboQualification = qualifyProductsForSameSubCategoryCombo(selectedComboItems, 3);
    if (!comboQualification.qualifies) {
      continue;
    }

    const eligibleUnitsByCartItemId = mapEligibleUnitsByCartItem(selectedComboItems, 3);
    if (eligibleUnitsByCartItemId.size === 0) {
      continue;
    }

    cartItems.forEach((item) => {
      const cartItemId = String(item?.id || '');
      const discountedUnits = eligibleUnitsByCartItemId.get(cartItemId) || 0;

      if (!cartItemId || discountedUnits <= 0) {
        return;
      }

      const itemBasePrice = new Prisma.Decimal(item.product.price);
      const unitDiscount = itemBasePrice.mul(new Prisma.Decimal(combo.discountPct)).div(100);

      itemDiscounts[cartItemId] = {
        amountPerUnit: unitDiscount,
        discountedUnits,
        comboOfferId: combo.id,
      };
    });

    // Apply only one active combo offer per checkout.
    break;
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