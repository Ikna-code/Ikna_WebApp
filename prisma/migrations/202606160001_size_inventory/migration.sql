CREATE TABLE IF NOT EXISTS public.product_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  size text NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  reserved_stock integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT product_inventory_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES public."Product"(id)
    ON DELETE CASCADE,
  CONSTRAINT product_inventory_stock_check CHECK (stock >= 0),
  CONSTRAINT product_inventory_reserved_stock_check CHECK (reserved_stock >= 0),
  CONSTRAINT product_inventory_product_id_size_key UNIQUE (product_id, size)
);

CREATE INDEX IF NOT EXISTS product_inventory_product_id_idx
  ON public.product_inventory(product_id);

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  size text NOT NULL,
  quantity integer NOT NULL,
  transaction_type text NOT NULL,
  reason text,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT inventory_transactions_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES public."Product"(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS inventory_transactions_product_id_size_idx
  ON public.inventory_transactions(product_id, size);

CREATE INDEX IF NOT EXISTS inventory_transactions_transaction_type_idx
  ON public.inventory_transactions(transaction_type);

CREATE OR REPLACE FUNCTION public.set_product_inventory_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_product_inventory_updated_at ON public.product_inventory;
CREATE TRIGGER set_product_inventory_updated_at
BEFORE UPDATE ON public.product_inventory
FOR EACH ROW
EXECUTE FUNCTION public.set_product_inventory_updated_at();