import Razorpay from 'razorpay';

// This initializes the SDK with your unique IDs from the .env file
export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});