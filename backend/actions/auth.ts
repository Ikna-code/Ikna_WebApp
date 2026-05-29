"use server";

import { emailService } from "@/backend/services/email";

export async function sendAuthEventNotification(email: string, event: "signup" | "login") {
  if (!email) {
    return { success: false, error: "Missing email" };
  }

  const result = await emailService.sendAuthEventEmail(email, event);

  if (!result.success) {
    return { success: false, error: "Failed to send auth email" };
  }

  return { success: true };
}
