
"use server"
import { db } from "@/backend/lib/db";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createServerSupabaseClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { Prisma } from "@prisma/client";
import { calculateComboDiscounts, validateCouponCode } from "./promotions";
import { createOrderItemSnapshot } from '@/backend/services/productDeletion';
import { decreaseInventory, ensureProductInventory, getInventoryForSize, increaseInventory } from '@/backend/services/inventory';

const toPlainData = (value) => JSON.parse(JSON.stringify(value));

function generateShortOrderId(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";

  for (let i = 0; i < length; i += 1) {
    const randomIndex = Math.floor(Math.random() * alphabet.length);
    result += alphabet[randomIndex];
  }

  return result;
}

async function createUniqueOrderId(tx) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generateShortOrderId(6);
    const exists = await tx.order.findUnique({ where: { id: candidate } });

    if (!exists) {
      return candidate;
    }
  }

  throw new Error("Could not generate unique order ID");
}

/**
 * Adds a product to the user's cart. 
 * If the product already exists, it increments the quantity.
 */
export async function addToCart(
  userId, 
  productId, 
  selectedSize, 
  quantity= 1,
  category,
  comboEligibleQuantity = 0,
  comboBundleId = ""
) {
  try {
    const normalizedSize = String(selectedSize || '').trim();

    const cartItem = await db.$transaction(async (tx) => {
      // 1. Verify product exists and check stock
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      if (product.isDeleted || !product.isActive) {
        throw new Error('Product is no longer available.');
      }

      if (normalizedSize) {
        await ensureProductInventory(productId, Array.isArray(product.sizes) ? product.sizes : [], Number(product.stock || 0), tx);
        const inventoryRow = await getInventoryForSize(productId, normalizedSize, tx);

        if (!inventoryRow || Number(inventoryRow.stock) < quantity) {
          throw new Error('Insufficient stock');
        }

        await decreaseInventory(
          productId,
          normalizedSize,
          Number(quantity || 0),
          tx,
          `Cart reservation for user ${userId}`
        );
      } else if (product.stock < quantity) {
        throw new Error('Insufficient stock');
      }

      // 2. Perform the Upsert
      return tx.cartItem.upsert({
        where: {
          userId_productId_selectedSize_comboBundleId: {
            userId,
            productId,
            selectedSize,
            comboBundleId: String(comboBundleId || ""),
          },
        },
        update: {
          quantity: { increment: quantity },
          comboEligibleQuantity: { increment: Math.max(0, Number(comboEligibleQuantity) || 0) },
        },
        create: {
          userId,
          productId,
          selectedSize,
          quantity,
          comboEligibleQuantity: Math.max(0, Number(comboEligibleQuantity) || 0),
          comboBundleId: String(comboBundleId || ""),
          category, // Store category for potential combo logic
        },
      });
    });

    revalidatePath("/cart");
    return { success: true, cartItem };
  } catch (error) {
    console.error("Add to cart error:", error);
    return { success: false, error: "Failed to add to cart" };
  }
}
/**
 * Fetches all items in a user's cart including product details.
 */
export async function getCartItems(userId) {
  try {
    const items = await db.cartItem.findMany({
      where: {
        userId,
        product: {
          is: {
            isDeleted: false,
            isActive: true,
          },
        },
      },
      include: {
        product: {
          include: {
            images: true, // Includes product images if needed for the UI
          },
        },
      },
      orderBy: {
        id: 'asc', // Keeps the list stable
      },
    });

    return { success: true, items: toPlainData(items) };
  } catch (error) {
    console.error("Fetch cart error:", error);
    return { success: false, error: "Could not load cart items" };
  }
}

export const getCartItemsWithDetails = async (userId) => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('cart_items') // Your @map("cart_items") from Prisma
    .select(`
      id,
      quantity,
      productId,
      selectedSize,
      Product (
        id,
        name,
        price,
        description,
        image, 
        category,       
        product_images (
          image_path,
          is_primary
        )
      )
    `)
    .eq('userId', userId);

  if (error) {
    console.error("Error fetching cart:", error);
    return [];
  }

  return data; // This returns an array of cart items with nested product details
};

/**
 * Updates the quantity of a specific cart item.
 * If newQuantity is 0 or less, you could optionally call removeFromCart.
 */
export async function updateCartQuantity(cartItemId, newQuantity) {
  try {
    // 1. Force the ID to be a String to satisfy Prisma's schema
    const id = String(cartItemId);
    console.log("Updating cart item ID:", id, "to quantity:", newQuantity);
    
    // 2. Ensure quantity is a valid number (Prisma expects Int for quantity)
    const qty = Math.max(1, parseInt(newQuantity));
console.log("Parsed quantity:", qty);
    const existingItem = await db.cartItem.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        productId: true,
        selectedSize: true,
        quantity: true,
        userId: true,
        comboBundleId: true,
        comboEligibleQuantity: true,
      },
    });

    if (!existingItem) {
      return { success: false, error: "Cart item not found" };
    }

    const normalizedBundleId = String(existingItem?.comboBundleId || '').trim();
    if (normalizedBundleId) {
      const siblingBundleItems = await db.cartItem.findMany({
        where: {
          userId: existingItem?.userId,
          comboBundleId: normalizedBundleId,
        },
        select: {
          comboEligibleQuantity: true,
        },
      });

      const eligibleBundleQty = siblingBundleItems.reduce(
        (sum, item) => sum + Math.max(Number(item?.comboEligibleQuantity) || 0, 0),
        0
      );

      if (eligibleBundleQty >= 3) {
        return { success: false, error: "Completed combo bundles cannot be edited. Remove the bundle item instead." };
      }
    }

    const boundedComboEligibleQty = Math.min(
      Math.max(Number(existingItem?.comboEligibleQuantity) || 0, 0),
      qty
    );

    const updatedItem = await db.$transaction(async (tx) => {
      const delta = qty - Number(existingItem?.quantity || 0);
      const normalizedSize = String(existingItem?.selectedSize || '').trim();

      if (normalizedSize && delta !== 0) {
        if (delta > 0) {
          await decreaseInventory(
            String(existingItem.productId),
            normalizedSize,
            delta,
            tx,
            `Cart quantity increase for user ${existingItem.userId}`
          );
        } else {
          await increaseInventory(
            String(existingItem.productId),
            normalizedSize,
            Math.abs(delta),
            tx,
            `Cart quantity decrease for user ${existingItem.userId}`
          );
        }
      }

      return tx.cartItem.update({
        where: {
          id: id
        },
        data: {
          quantity: qty,
          comboEligibleQuantity: boundedComboEligibleQty,
        },
      });
    });

    revalidatePath("/cart");
    return { success: true, item: updatedItem };
  } catch (error) {
    console.error("Update quantity error:", error);
    return { success: false, error: "Failed to update quantity" };
  }
}

// Test this in a separate file or route
// export const test = await db.cartItem.upsert({
//   where: {
//     userId_productId: {
//       userId: "EXISTING_USER_ID_FROM_DB", 
//       productId: "1",
//     },
//   },
//   update: { quantity: { increment: 1 } },
//   create: {
//     userId: "EXISTING_USER_ID_FROM_DB",
//     productId: "EXISTING_PRODUCT_ID_FROM_DB",
//     quantity: 1,
//   },
// });
/**
 * Removes a specific item from the cart.
 */
export async function removeFromCart(cartItemId) {
  try {
    const id = String(cartItemId);
    const deleted = await db.$transaction(async (tx) => {
      const existingItem = await tx.cartItem.findUnique({
        where: { id },
      });

      if (!existingItem) {
        return { count: 0 };
      }

      const normalizedSize = String(existingItem.selectedSize || '').trim();
      if (normalizedSize) {
        await increaseInventory(
          String(existingItem.productId),
          normalizedSize,
          Number(existingItem.quantity || 0),
          tx,
          `Cart item removed for user ${existingItem.userId}`
        );
      }

      return tx.cartItem.deleteMany({
        where: { id },
      });
    });

    if (!deleted.count) {
      return { success: false, error: "Cart item not found" };
    }

    revalidatePath("/cart");
    return { success: true };
  } catch (error) {
    console.error("Remove from cart error:", error);
    return { success: false, error: error?.message || "Failed to remove item" };
  }
}

export async function clearCart(userId) {
  try {
    await db.$transaction(async (tx) => {
      const items = await tx.cartItem.findMany({
        where: { userId: String(userId) },
      });

      for (const item of items) {
        const normalizedSize = String(item.selectedSize || '').trim();
        if (!normalizedSize) continue;

        await increaseInventory(
          String(item.productId),
          normalizedSize,
          Number(item.quantity || 0),
          tx,
          `Cart cleared for user ${userId}`
        );
      }

      await tx.cartItem.deleteMany({
        where: { userId: String(userId) },
      });
    });

    revalidatePath("/cart");
    return { success: true };
  } catch (error) {
    console.error('Failed to clear cart:', error);
    return { success: false, error: 'Could not clear cart.' };
  }
}
// 💳 CHECKOUT & PAYMENT ACTIONS

/**
 * Converts CartItems into an Order. 
 * This is a transaction: it creates the order AND clears the cart.
 */
/**
 * Converts CartItems into an authenticated Order tracking promotions safely.
 * Handles: Combo Discounts -> Coupon Code Deductions -> First Time 15% Reduction.
 * @param {string} userId
 * @param {string | null} [couponCode]
 * @param {{ clearCart?: boolean; orderStatus?: string; addressId?: string | null; paymentMethod?: "ONLINE" | "COD" | string }} [options]
 */
export async function createOrder(userId, couponCode = null, options = {}) {
  try {
    const {
      clearCart = true,
      orderStatus = "PENDING",
      addressId = null,
      paymentMethod = "ONLINE",
    } = options;

    const result = await db.$transaction(async (tx) => {
      // 1. Get raw cart items along with explicit product prices
      const cartItems = await tx.cartItem.findMany({
        where: { userId },
        include: { product: true },
      });

      if (cartItems.length === 0) throw new Error("Cart is empty");

      // Resolve shipping address from selected address (if provided) or fallback to default/latest address.
      const shippingAddressRecord = addressId
        ? await tx.address.findFirst({
            where: { id: addressId, userId },
          })
        : await tx.address.findFirst({
            where: { userId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
          });

      if (!shippingAddressRecord) {
        throw new Error("Please add a shipping address before checkout");
      }

      const shippingAddress = [
        shippingAddressRecord.name,
        shippingAddressRecord.street,
        shippingAddressRecord.city,
        shippingAddressRecord.state,
        shippingAddressRecord.zip,
        shippingAddressRecord.country,
      ]
        .filter(Boolean)
        .join(', ');

      // 2. Step A: Compute Combo Offer variations
      const comboDiscounts = await calculateComboDiscounts(tx, cartItems);

      let workingSubtotal = new Prisma.Decimal(0);
      let totalDiscountAccumulator = new Prisma.Decimal(0);

      // Create pre-calculated structure mapping item records
      const preparedOrderItems = cartItems.map((item) => {
        const originalPrice = new Prisma.Decimal(item.product.price);
        const comboMeta = comboDiscounts[item.id];

        let finalUnitPrice = originalPrice;
        let appliedComboId = null;
        let lineItemCost = originalPrice.mul(item.quantity);

        if (comboMeta) {
          const discountedUnits = Math.min(
            Math.max(Number(comboMeta.discountedUnits) || 0, 0),
            Math.max(Number(item.quantity) || 0, 0)
          );
          const totalLineComboSavings = comboMeta.amountPerUnit.mul(discountedUnits);

          lineItemCost = lineItemCost.sub(totalLineComboSavings);
          finalUnitPrice = item.quantity > 0 ? lineItemCost.div(item.quantity) : originalPrice;
          appliedComboId = comboMeta.comboOfferId;

          // Accumulate line item variance only for discounted combo units.
          totalDiscountAccumulator = totalDiscountAccumulator.add(totalLineComboSavings);
        }

        workingSubtotal = workingSubtotal.add(lineItemCost);

        const snapshot = createOrderItemSnapshot(item.product);

        return {
          productId: item.productId,
          quantity: item.quantity,
          price: finalUnitPrice, // Record final price after combo mapping
          selectedSize: item.selectedSize,
          productName: snapshot.productName,
          productImage: snapshot.productImage,
          productColorName: snapshot.productColorName,
          productSize: item.selectedSize || null,
          productSlug: snapshot.productSlug,
          comboOfferId: appliedComboId,
        };
      });

      for (const item of cartItems) {
        const normalizedSize = String(item.selectedSize || '').trim();
        if (!normalizedSize) {
          throw new Error(`Missing size selection for product ${item.productId}`);
        }
      }

      // 3. Step B: Validate and execute Coupon Deductions
      let appliedCouponId = null;
      if (couponCode) {
        const coupon = await validateCouponCode(tx, couponCode, workingSubtotal, userId);
        if (coupon) {
          appliedCouponId = coupon.id;
          let couponSavings = new Prisma.Decimal(0);

          if (coupon.discountType === "PERCENTAGE") {
            couponSavings = workingSubtotal.mul(coupon.value).div(100);
          } else {
            couponSavings = new Prisma.Decimal(coupon.value);
          }

          // Bound deduction limits to prevent negative subtotals
          if (couponSavings.gt(workingSubtotal)) couponSavings = workingSubtotal;

          workingSubtotal = workingSubtotal.sub(couponSavings);
          totalDiscountAccumulator = totalDiscountAccumulator.add(couponSavings);
        }
      }

      // 4. Step C: Enforce explicit 15% Welcome Rules automatically
      // Scan database history for verified transactions belonging to this customer profile
      const priorOrderCount = await tx.order.count({
        where: {
          userId: userId,
          status: { in: ["PAID", "SHIPPED", "DELIVERED"] }
        }
      });

      let isFirstTimeOfferApplied = false;
      if (priorOrderCount === 0) {
        isFirstTimeOfferApplied = true;
        
        // Calculate a 15% discount on the remaining subtotal
        const firstTimeSavings = workingSubtotal.mul(0.15);
        
        workingSubtotal = workingSubtotal.sub(firstTimeSavings);
        totalDiscountAccumulator = totalDiscountAccumulator.add(firstTimeSavings);
      }

      // 4D. Apply COD handling charge at final amount level.
      if (String(paymentMethod).toUpperCase() === "COD") {
        workingSubtotal = workingSubtotal.add(new Prisma.Decimal(100));
      }

      // 5. Finalize the Database Records
      const orderId = await createUniqueOrderId(tx);

      const order = await tx.order.create({
        data: {
          id: orderId,
          userId,
          addressId: shippingAddressRecord.id,
          shippingAddress,
          totalAmount: workingSubtotal,
          status: orderStatus,
          discountAmount: totalDiscountAccumulator,
          couponAppliedId: appliedCouponId,
          isFirstOrder: isFirstTimeOfferApplied,
          orderItems: {
            create: preparedOrderItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              selectedSize: item.selectedSize,
              productName: item.productName,
              productImage: item.productImage,
              productColorName: item.productColorName,
              productSize: item.productSize,
              productSlug: item.productSlug,
              comboOfferId: item.comboOfferId,
            })),
          },
        },
      });

      // 6. Purge active items inside cart table
      if (clearCart) {
        await tx.cartItem.deleteMany({
          where: { userId },
        });
      }
      console.log("--- PROMOTION ENGINE DEBUG ---");
console.log("Initial Cart Items Total:", cartItems.reduce((acc, i) => acc + (i.product.price * i.quantity), 0));
console.log("Combo Savings Applied:", comboDiscounts);
console.log("Subtotal After Combos:", workingSubtotal.toString());
console.log("Coupon ID Applied:", appliedCouponId);
console.log("First Order Flag Active?:", isFirstTimeOfferApplied);
console.log("Final Amount Charged to User:", workingSubtotal.toString());
console.log("Total Saved Saved in Audit Log:", totalDiscountAccumulator.toString());
      return order;
    });

    revalidatePath("/orders");
    revalidatePath("/cart");
    return { success: true, order: result };
  } catch (error) {
    console.error("Secure Checkout Failure Mode:", error);
    return { success: false, error: error.message || "Checkout execution crashed" };
  }
}

/**
 * Records a successful payment and updates order status.
 * Call this after your payment provider (Stripe/PayPal) returns success.
 */
export async function confirmPayment(orderId, transactionId, provider) {
  try {
    const payment = await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new Error("Order not found");

      // 1. Create Payment record
      const newPayment = await tx.payment.create({
        data: {
          orderId,
          transactionId,
          provider,
          amount: order.totalAmount,
          status: "COMPLETED",
        },
      });

      // 2. Update Order Status
      await tx.order.update({
        where: { id: orderId },
        data: { status: "PAID" },
      });

      return newPayment;
    });

    revalidatePath("/orders");
    return { success: true, payment };
  } catch (error) {
    console.error("Payment confirmation error:", error);
    return { success: false, error: "Failed to record payment" };
  }
}

// backend/actions/order.ts

export async function toggleWishlistAction(userId, productId) {
  try {
    // 1. DATA INTEGRITY CHECK (The "Why is it failing?" check)
    const userExists = await db.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      return { success: false, error: `User ID ${userId} does not exist in Prisma User table.` };
    }

    const productExists = await db.product.findUnique({ where: { id: productId } });
    if (!productExists) {
      return { success: false, error: `Product ID ${productId} does not exist in Prisma Product table.` };
    }

    if (productExists.isDeleted || !productExists.isActive) {
      return { success: false, error: 'Product is no longer available.' };
    }

    // 2. TOGGLE LOGIC
    const existing = await db.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existing) {
      await db.wishlistItem.delete({
        where: { id: existing.id },
      });
      revalidatePath("/");
      return { success: true, message: "Removed" };
    } else {
      await db.wishlistItem.create({
        data: { userId, productId },
      });
      revalidatePath("/");
      return { success: true, message: "Added" };
    }
  } catch (error) {
    console.error("Wishlist Database Error:", error);
    return { 
      success: false, 
      error: error.code === 'P2003' 
        ? "Foreign Key Error: Ensure this product is in your DB." 
        : "Database connection error." 
    };
  }
}
export async function getWishlist(userId) {
  if (!userId) return [];
  try {
    // 1. Get the list of product IDs from the wishlistItem table
    const wishlistItems = await db.wishlistItem.findMany({
      where: { userId },
      select: { productId: true }
    });

    // Extract the IDs into a flat array
    const productIds = wishlistItems.map(item => item.productId);

    // 2. Fetch full product details for those IDs
    return await db.product.findMany({
      where: {
        id: {
          in: productIds,
        },
        isDeleted: false,
        isActive: true,
      },
    });
  } catch (error) {
    return [];
  }
}

// backend/actions/order.js

// backend/actions/order.js

export const removeFromWishlist = async (productId, userId) => {
  try {
    if (!productId || !userId) {
      return { success: false, error: "Missing identifying information" };
    }

    // Using the unique index defined in your SQL
    await db.wishlistItem.delete({
      where: {
        userId_productId: {
          userId: userId,
          productId: productId,
        },
      },
    });

    revalidatePath("/wishlist");
    return { success: true };
  } catch (error) {
    console.error("REMOVE_FROM_WISHLIST_ERROR", error);
    // If the record was already deleted, we can still return success
    return { success: false, error: "Failed to remove item" };
  }
};

//orderDetails
export async function getOrderDetails() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  console.log("Authenticated user:", user);

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      orderItems: {
        include: {
          product: true, // Fetch joined products
        }
      }
    }
  });
  
  return NextResponse.json(orders);
}