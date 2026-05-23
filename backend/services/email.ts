import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const emailService = {
  /**
   * Sends a receipt after a successful purchase.
   */
  sendOrderConfirmation: async (to: string, orderDetails: any) => {
    try {
      await resend.emails.send({
        from: 'Store <orders@yourdomain.com>',
        to: [to],
        subject: `Order Confirmation #${orderDetails.id}`,
        html: `<strong>Thank you for your purchase!</strong><p>Total: $${orderDetails.total}</p>`,
      });
      return { success: true };
    } catch (error) {
      console.error("Email failed:", error);
      return { success: false };
    }
  }
};