ALTER TABLE "orders"
ADD COLUMN "paidAt" TIMESTAMP(3),
ADD COLUMN "packedAt" TIMESTAMP(3),
ADD COLUMN "shippedAt" TIMESTAMP(3),
ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "razorpayOrderId" TEXT,
ADD COLUMN "shiprocketOrderId" TEXT,
ADD COLUMN "shipmentId" TEXT,
ADD COLUMN "awbCode" TEXT,
ADD COLUMN "courierName" TEXT,
ADD COLUMN "trackingUrl" TEXT,
ADD COLUMN "shiprocketStatus" TEXT;

CREATE UNIQUE INDEX "orders_razorpayOrderId_key" ON "orders"("razorpayOrderId");
CREATE INDEX "orders_shiprocketOrderId_idx" ON "orders"("shiprocketOrderId");
CREATE INDEX "orders_shipmentId_idx" ON "orders"("shipmentId");