import Stripe from 'stripe';

// Initialize Stripe with your Secret Key from .env
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16', // Use the latest stable version
});

export const stripeService = {
  /**
   * Creates a Stripe Checkout session for a customer.
   */
  createCheckoutSession: async (items: any[], userEmail: string) => {
    return await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: { 
            name: item.name,
            images: [item.image], 
          },
          unit_amount: Math.round(item.price * 100), // Stripe uses cents
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      customer_email: userEmail,
      success_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/cart`,
    });
  },

  /**
   * Retrieves a session to verify payment status on the success page.
   */
  verifySession: async (sessionId: string) => {
    return await stripe.checkout.sessions.retrieve(sessionId);
  }
};