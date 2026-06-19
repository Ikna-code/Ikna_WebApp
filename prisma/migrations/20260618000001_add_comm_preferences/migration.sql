-- Add communication preference columns to the User table.
-- All columns default to TRUE so existing users continue to receive all
-- notifications (opt-out model), ensuring full backward compatibility.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "comm_order_updates"   BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "comm_back_in_stock"   BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "comm_new_collections" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "comm_promotions"      BOOLEAN NOT NULL DEFAULT TRUE;
