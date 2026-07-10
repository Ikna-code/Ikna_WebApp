import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || 'IKNA <onboarding@resend.dev>';
const abandonedCartReminderFromEmail = 'IKNA <no-reply@iknaonline.com>';

function getCustomerPaymentMethodLabel(rawMethod: unknown): string {
  const method = String(rawMethod || '').trim().toUpperCase();

  if (method === 'COD' || method === 'MANUAL_ADMIN') {
    return 'CASH ON DELIVERY';
  }

  return 'ONLINE PAYMENT';
}

export const emailService = {
  /**
   * Sends a receipt after a successful purchase.
   */
  sendOrderConfirmation: async (to: string, orderDetails: any) => {
    try {
      const total = Number(orderDetails?.total || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const paymentMethod = getCustomerPaymentMethodLabel(orderDetails?.paymentMethod);
      const paymentStatus = String(orderDetails?.paymentStatus || 'PENDING').trim().toUpperCase();

      await resend.emails.send({
        from: fromEmail,
        to: [to],
        subject: `Order Confirmation #${orderDetails.id}`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#321327;max-width:560px;margin:0 auto;">
            <h2 style="margin:0 0 12px 0;color:#840d5c;">Thanks for shopping with IKNA</h2>
            <p style="margin:0 0 12px 0;">Hi ${orderDetails?.customerName || 'Customer'}, your order has been recorded successfully.</p>
            <div style="background:#faf3f7;border:1px solid #f0d6e2;border-radius:12px;padding:14px 16px;margin:12px 0;">
              <p style="margin:0 0 8px 0;font-weight:700;">Order #${orderDetails.id}</p>
              <p style="margin:0 0 6px 0;">Items: ${Number(orderDetails?.itemCount || 0)}</p>
              <p style="margin:0 0 6px 0;">Payment Method: ${paymentMethod}</p>
              <p style="margin:0 0 6px 0;">Payment Status: ${paymentStatus}</p>
              <p style="margin:0;font-weight:700;">Total: ₹${total}</p>
            </div>
            <p style="margin:14px 0 0 0;color:#4b2a3f;">You can track order progress anytime from your IKNA account.</p>
          </div>
        `,
      });
      return { success: true };
    } catch (error) {
      console.error("Email failed:", error);
      return { success: false };
    }
  },

  sendAuthEventEmail: async (to: string, event: 'signup' | 'login') => {
    try {
      const subject = event === 'signup' ? 'Welcome to IKNA' : 'New Login to Your IKNA Account';
      const heading = event === 'signup' ? 'Welcome to IKNA' : 'Login Alert';
      const body = event === 'signup'
        ? 'Your account was created successfully. If this was not you, please contact support immediately.'
        : 'A login to your IKNA account was detected. If this was not you, reset your password immediately.';

      await resend.emails.send({
        from: fromEmail,
        to: [to],
        subject,
        html: `<strong>${heading}</strong><p>${body}</p>`,
      });

      return { success: true };
    } catch (error) {
      console.error('Auth email failed:', error);
      return { success: false };
    }
  },

  sendFitQuizResultEmail: async (
    to: string,
    details: {
      recommendationName: string;
      recommendationDesc: string;
      outfit: string;
      comfort: string;
      occasion: string;
    }
  ) => {
    try {
      await resend.emails.send({
        from: fromEmail,
        to: [to],
        subject: 'Your IKNA Fit Quiz Result',
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.5;color:#321327;max-width:560px;margin:0 auto;">
            <h2 style="margin:0 0 12px 0;color:#840d5c;">Your Perfect IKNA Match</h2>
            <p style="margin:0 0 12px 0;">Thanks for taking the fit quiz. Based on your preferences, here is your recommendation:</p>
            <div style="background:#faf3f7;border:1px solid #f0d6e2;border-radius:12px;padding:14px 16px;margin:12px 0;">
              <p style="margin:0 0 8px 0;font-weight:700;">${details.recommendationName}</p>
              <p style="margin:0 0 10px 0;color:#4b2a3f;">${details.recommendationDesc}</p>
              <p style="margin:0;font-size:12px;color:#6e4f60;">
                Outfit: ${details.outfit} | Comfort: ${details.comfort} | Occasion: ${details.occasion}
              </p>
            </div>
            <p style="margin:14px 0 0 0;">You can revisit this result anytime from your IKNA profile dashboard.</p>
          </div>
        `,
      });

      return { success: true };
    } catch (error) {
      console.error('Fit quiz email failed:', error);
      return { success: false };
    }
  },

  sendAbandonedCartReminder: async (
    to: string,
    details: {
      customerName?: string;
      cartValue?: number;
      cartUrl?: string;
    }
  ) => {
    try {
      const customerName = String(details?.customerName || 'there').trim() || 'there';
      const cartValue = Number(details?.cartValue || 0).toLocaleString('en-IN', {
        maximumFractionDigits: 0,
      });
      const cartUrl = String(details?.cartUrl || '').trim() || 'https://iknaonline.com/cart';

      await resend.emails.send({
        from: abandonedCartReminderFromEmail,
        to: [to],
        subject: 'You left something behind at IKNA',
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#321327;max-width:560px;margin:0 auto;">
            <h2 style="margin:0 0 12px 0;color:#840d5c;">Complete your checkout</h2>
            <p style="margin:0 0 12px 0;">Hi ${customerName},</p>
            <p style="margin:0 0 12px 0;">You added items to your IKNA cart but didn&apos;t complete checkout.</p>
            <div style="background:#faf3f7;border:1px solid #f0d6e2;border-radius:12px;padding:14px 16px;margin:12px 0;">
              <p style="margin:0 0 6px 0;font-weight:700;">Saved cart value: ₹${cartValue}</p>
              <p style="margin:0;color:#4b2a3f;">Your selected items are still waiting for you.</p>
            </div>
            <p style="margin:14px 0;">
              <a href="${cartUrl}" style="display:inline-block;background:#840d5c;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:999px;font-weight:700;">Resume Checkout</a>
            </p>
            <p style="margin:14px 0 0 0;color:#4b2a3f;">If you need any help, simply reply to this email and our team will assist you.</p>
          </div>
        `,
      });

      return { success: true };
    } catch (error) {
      console.error('Abandoned cart reminder email failed:', error);
      return { success: false };
    }
  }
};