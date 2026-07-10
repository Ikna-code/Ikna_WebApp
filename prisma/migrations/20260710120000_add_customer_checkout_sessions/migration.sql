-- CreateEnum
CREATE TYPE "CheckoutStep" AS ENUM (
  'BROWSING',
  'CART',
  'CHECKOUT_STARTED',
  'ADDRESS_ADDED',
  'SHIPPING_SELECTED',
  'PAYMENT_STARTED',
  'ORDER_COMPLETED'
);

-- CreateEnum
CREATE TYPE "CheckoutSessionStatus" AS ENUM (
  'ACTIVE',
  'PAYMENT_PENDING',
  'PAYMENT_FAILED',
  'ABANDONED_CART',
  'CONVERTED',
  'INACTIVE'
);

-- CreateTable
CREATE TABLE "customer_checkout_sessions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "step" "CheckoutStep" NOT NULL DEFAULT 'BROWSING',
  "status" "CheckoutSessionStatus" NOT NULL DEFAULT 'INACTIVE',
  "cart_value" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "potential_recovery" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "cart_snapshot" JSONB,
  "timeline" JSONB,
  "metadata" JSONB,
  "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "abandoned_at" TIMESTAMP(3),
  "converted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customer_checkout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_checkout_sessions_user_id_key" ON "customer_checkout_sessions"("user_id");

-- CreateIndex
CREATE INDEX "customer_checkout_sessions_status_last_activity_at_idx" ON "customer_checkout_sessions"("status", "last_activity_at");

-- CreateIndex
CREATE INDEX "customer_checkout_sessions_step_status_idx" ON "customer_checkout_sessions"("step", "status");

-- AddForeignKey
ALTER TABLE "customer_checkout_sessions"
ADD CONSTRAINT "customer_checkout_sessions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
