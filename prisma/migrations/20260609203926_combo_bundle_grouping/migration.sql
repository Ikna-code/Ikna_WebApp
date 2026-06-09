/*
  Warnings:

  - A unique constraint covering the columns `[userId,productId,selectedSize,comboBundleId]` on the table `cart_items` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "cart_items_userId_productId_selectedSize_key";

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "comboBundleId" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_userId_productId_selectedSize_comboBundleId_key" ON "cart_items"("userId", "productId", "selectedSize", "comboBundleId");
