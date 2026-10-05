ALTER TABLE "orders"
  ALTER COLUMN "userId" DROP NOT NULL,
  ADD COLUMN "guest_name" TEXT,
  ADD COLUMN "guest_email" TEXT,
  ADD COLUMN "guest_phone" TEXT;