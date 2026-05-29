import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || 'IKNA <onboarding@resend.dev>';

export const emailService = {
  /**
   * Sends a receipt after a successful purchase.
   */
  sendOrderConfirmation: async (to: string, orderDetails: any) => {
    try {
      await resend.emails.send({
        from: fromEmail,
        to: [to],
        subject: `Order Confirmation #${orderDetails.id}`,
        html: `<strong>Thank you for your purchase!</strong><p>Total: $${orderDetails.total}</p>`,
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
  }
};