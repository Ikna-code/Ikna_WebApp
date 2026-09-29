-- Normalize the requested bra Comfort Type assignments across color variants.
DELETE FROM "product_filters" pf
USING "Product" p, "filter_options" fo, "filter_groups" fg, "product_types" pt
WHERE pf."productId" = p.id
  AND pf."filterOptionId" = fo.id
  AND fo."filterGroupId" = fg.id
  AND fg."productTypeId" = pt.id
  AND pt.slug = 'bras'
  AND fg.slug = 'comfort-type'
  AND (
    p.name ILIKE '%Everyday Wear Comfy Bra%'
    OR p.name ILIKE '%Side Net Coverage Bra%'
    OR p.name ILIKE '%Barely There - Light Padded, Non-Wired Cotton Bra%'
    OR p.name ILIKE '%Comfy Supportive Minimizer Bra%'
  );

-- Only Comfy Supportive Minimizer Bra remains assigned to Moulded for Bras.
DELETE FROM "product_filters" pf
USING "Product" p, "filter_options" fo, "filter_groups" fg, "product_types" pt
WHERE pf."productId" = p.id
  AND pf."filterOptionId" = fo.id
  AND fo."filterGroupId" = fg.id
  AND fg."productTypeId" = pt.id
  AND pt.slug = 'bras'
  AND fg.slug = 'comfort-type'
  AND fo.value = 'moulded'
  AND p.name NOT ILIKE '%Comfy Supportive Minimizer Bra%';

INSERT INTO "product_filters" (id, "productId", "filterOptionId")
SELECT
  gen_random_uuid()::text,
  p.id,
  fo.id
FROM "Product" p
JOIN "product_types" pt ON pt.id = p."productTypeId" AND pt.slug = 'bras'
JOIN "filter_groups" fg ON fg."productTypeId" = pt.id AND fg.slug = 'comfort-type'
JOIN "filter_options" fo ON fo."filterGroupId" = fg.id
WHERE
  (p.name ILIKE '%Everyday Wear Comfy Bra%' AND fo.value = 'non-padded')
  OR (p.name ILIKE '%Side Net Coverage Bra%' AND fo.value = 'non-padded')
  OR (p.name ILIKE '%Barely There - Light Padded, Non-Wired Cotton Bra%' AND fo.value = 'padded')
  OR (p.name ILIKE '%Comfy Supportive Minimizer Bra%' AND fo.value = 'moulded')
ON CONFLICT ("productId", "filterOptionId") DO NOTHING;