-- Seed dynamic filter groups/options using existing ProductType -> FilterGroup -> FilterOption tables.
-- No Product schema columns are added.

WITH target_product_types AS (
  SELECT id, slug
  FROM "product_types"
  WHERE slug IN ('bras', 'panties', 'briefs')
),
inserted_groups AS (
  INSERT INTO "filter_groups" (
    "id",
    "productTypeId",
    "name",
    "displayName",
    "slug",
    "displayOrder",
    "isActive",
    "filterType",
    "createdAt",
    "updatedAt"
  )
  SELECT
    gen_random_uuid()::text,
    t.id,
    CASE
      WHEN t.slug = 'bras' THEN 'Comfort Type'
      ELSE 'Rise Type'
    END,
    CASE
      WHEN t.slug = 'bras' THEN 'Comfort Type'
      ELSE 'Rise Type'
    END,
    CASE
      WHEN t.slug = 'bras' THEN 'comfort-type'
      ELSE 'rise-type'
    END,
    CASE
      WHEN t.slug = 'bras' THEN 30
      ELSE 30
    END,
    true,
    'SINGLE_SELECT'::"FilterType",
    NOW(),
    NOW()
  FROM target_product_types t
  ON CONFLICT ("productTypeId", "slug") DO NOTHING
  RETURNING "id", "slug"
),
all_groups AS (
  SELECT fg."id", fg."slug", pt.slug AS product_type_slug
  FROM "filter_groups" fg
  JOIN "product_types" pt ON pt.id = fg."productTypeId"
  WHERE (pt.slug = 'bras' AND fg.slug = 'comfort-type')
     OR (pt.slug IN ('panties', 'briefs') AND fg.slug = 'rise-type')
)
INSERT INTO "filter_options" (
  "id",
  "filterGroupId",
  "value",
  "displayLabel",
  "colorHex",
  "displayOrder",
  "isActive",
  "createdAt"
)
SELECT
  gen_random_uuid()::text,
  g."id",
  option_data.value,
  option_data.display_label,
  NULL,
  option_data.display_order,
  true,
  NOW()
FROM all_groups g
JOIN LATERAL (
  SELECT *
  FROM (
    VALUES
      ('bras', 'padded', 'Padded', 1),
      ('bras', 'non-padded', 'Non-Padded', 2),
      ('bras', 'moulded', 'Moulded', 3),
      ('bras', 'non-wired', 'Non-Wired', 4),
      ('bras', 'wired', 'Wired', 5),
      ('panties', 'low-rise', 'Low Rise', 1),
      ('panties', 'mid-rise', 'Mid Rise', 2),
      ('panties', 'high-rise', 'High Rise', 3),
      ('briefs', 'low-rise', 'Low Rise', 1),
      ('briefs', 'mid-rise', 'Mid Rise', 2),
      ('briefs', 'high-rise', 'High Rise', 3)
  ) AS opts(product_type_slug, value, display_label, display_order)
  WHERE opts.product_type_slug = g.product_type_slug
) AS option_data ON true
WHERE NOT EXISTS (
  SELECT 1
  FROM "filter_options" fo
  WHERE fo."filterGroupId" = g."id"
    AND fo."value" = option_data.value
);
