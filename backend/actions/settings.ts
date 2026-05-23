"use server"

import { db } from "@/backend/lib/db";
import { revalidatePath } from "next/cache";

export async function getAddressesByUserId(userId: string) {
  if (!userId) {
    return { success: false, error: "User ID is required." };
  }

  try {
    const addresses = await db.address.findMany({
      where: {
        userId: userId,
      },
      orderBy: [
        {
          isDefault: "desc", // Puts the default address at the top of the list
        },
        {
          createdAt: "desc", // Newest addresses appear next
        },
      ],
    });

    return { success: true, data: addresses };
  } catch (error) {
    console.log("GET_ADDRESSES_ERROR:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch addresses." };
  }
}

/**
 * Saves (Create or Update) an address.
 */
export async function saveAddressAction(
  userId: string,
  addressData: any,
  addressId: string | null = null
) {
  if (!userId) {
    return { success: false, error: "Unauthorized: Please log in." };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return { success: false, error: "User not found in the database. Please verify your login." };
  }

  try {
    const payload = {
      name: addressData.name,
      street: addressData.street,
      city: addressData.city,
      state: addressData.state,
      zip: addressData.zip,
      country: addressData.country || "India",
      isDefault: Boolean(addressData.isDefault), // Use the exact boolean value passed from the UI
      userId: userId,
    };

    return await db.$transaction(async (tx) => {
      // If we are setting an address as default, reset the other addresses for that user
      if (payload.isDefault) {
        await tx.address.updateMany({
          where: { userId: userId },
          data: { isDefault: false },
        });
      }

      // Use the provided addressId or check if it's in the data object
      const targetId = addressId || addressData.id;

      if (targetId) {
        const existingAddress = await tx.address.findUnique({
          where: { id: targetId },
        });

        if (!existingAddress || existingAddress.userId !== userId) {
          return { success: false, error: "Unauthorized or address not found." };
        }

        await tx.address.update({
          where: { id: targetId },
          data: payload,
        });
      } else {
        await tx.address.create({
          data: payload,
        });
      }

      revalidatePath("/address");
      return { success: true, message: "Address saved successfully." };
    });
  } catch (error) {
    console.error("SAVE_ADDRESS_ERROR:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Database operation failed.",
    };
  }
}

/**
 * Deletes a specific address.
 */
export async function deleteAddressAction(userId: string, addressId: string) {
  try {
    return await db.$transaction(async (tx) => {
      const existingAddress = await tx.address.findUnique({
        where: { id: addressId },
      });

      if (!existingAddress || existingAddress.userId !== userId) {
        return { success: false, error: "Unauthorized or address not found." };
      }

      await tx.address.delete({
        where: { id: addressId },
      });

      revalidatePath("/address");
      return { success: true, message: "Address deleted successfully" };
    });
  } catch (error) {
    console.log("DELETE_ADDRESS_ERROR:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete address." };
  }
}