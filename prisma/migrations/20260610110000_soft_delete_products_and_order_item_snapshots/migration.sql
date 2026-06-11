/*
  Soft delete products and persist immutable product snapshots on order items.
*/

-- AlterTable
ALTER TABLE "Product"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Product_isDeleted_isActive_idx" ON "Product"("isDeleted", "isActive");

-- AlterTable
ALTER TABLE "order_items"
  ADD COLUMN "productName" TEXT NOT NULL DEFAULT 'Unknown Product',
  ADD COLUMN "productImage" TEXT,
  ADD COLUMN "productColorName" TEXT,
  ADD COLUMN "productSize" TEXT,
  ADD COLUMN "productSlug" TEXT;

-- Backfill snapshots from current Product rows.
UPDATE "order_items" oi
SET
  "productName" = COALESCE(NULLIF(TRIM(p."name"), ''), oi."productName"),
  "productImage" = COALESCE(NULLIF(TRIM(p."image"), ''), oi."productImage"),
  "productColorName" = COALESCE(NULLIF(TRIM(p."colorName"), ''), oi."productColorName")
FROM "Product" p
WHERE p."id" = oi."productId";

-- Keep schema and DB in sync (no runtime default expected by Prisma for productName).
ALTER TABLE "order_items"
  ALTER COLUMN "productName" DROP DEFAULT;
