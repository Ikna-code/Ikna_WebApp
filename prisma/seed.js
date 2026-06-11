const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const LEGACY_PANTIES_PRODUCT_TYPE_ID = 'ed841ce9-157d-4b13-a6c0-10a5df5649f6';

const PRODUCT_TYPE_DEFINITIONS = [
  {
    name: 'Bras',
    slug: 'bras',
    displayOrder: 1,
    subcategories: [],
  },
  {
    name: 'Panties',
    slug: 'panties',
    displayOrder: 2,
    fixedId: LEGACY_PANTIES_PRODUCT_TYPE_ID,
    subcategories: [
      { name: 'Bikini', slug: 'Bikini', displayOrder: 1 },
      { name: 'Hipster', slug: 'Hipster', displayOrder: 2 },
      { name: 'Boy shorts', slug: 'Boy shorts', displayOrder: 3 },
      { name: 'Thong', slug: 'Thong', displayOrder: 4 },
      { name: 'Cycling shorts', slug: 'Cycling shorts', displayOrder: 5 },
    ],
  },
  {
    name: 'Briefs',
    slug: 'briefs',
    displayOrder: 3,
    subcategories: [],
  },
  {
    name: 'Sets',
    slug: 'sets',
    displayOrder: 4,
    subcategories: [],
  },
  {
    name: 'Others',
    slug: 'others',
    displayOrder: 5,
    subcategories: [],
  },
];

const GROUP_DEFINITIONS = [
  {
    targetSlugs: ['bras'],
    slug: 'comfort-type',
    name: 'Comfort Type',
    filterType: 'SINGLE_SELECT',
    options: [
      { value: 'padded', displayLabel: 'Padded', displayOrder: 1 },
      { value: 'non-padded', displayLabel: 'Non-Padded', displayOrder: 2 },
      { value: 'moulded', displayLabel: 'Moulded', displayOrder: 3 },
      { value: 'non-wired', displayLabel: 'Non-Wired', displayOrder: 4 },
      { value: 'wired', displayLabel: 'Wired', displayOrder: 5 },
    ],
  },
  {
    targetSlugs: ['panties', 'briefs'],
    slug: 'rise-type',
    name: 'Rise Type',
    filterType: 'SINGLE_SELECT',
    options: [
      { value: 'low-rise', displayLabel: 'Low Rise', displayOrder: 1 },
      { value: 'mid-rise', displayLabel: 'Mid Rise', displayOrder: 2 },
      { value: 'high-rise', displayLabel: 'High Rise', displayOrder: 3 },
    ],
  },
  {
    targetSlugs: ['bras', 'panties', 'briefs', 'sets', 'others'],
    slug: 'tags',
    name: 'Product Badges',
    filterType: 'MULTI_SELECT',
    options: [
      { value: 'new-arrival', displayLabel: 'New Arrival', displayOrder: 1 },
      { value: 'limited-stock', displayLabel: 'Limited Stock', displayOrder: 2 },
      { value: 'few-left', displayLabel: 'Few Left', displayOrder: 3 },
    ],
  },
];

async function upsertFilterMetadata() {
  const productTypes = await prisma.productType.findMany({
    where: {
      isActive: true,
    },
    select: { id: true, slug: true },
  });

  for (const groupDef of GROUP_DEFINITIONS) {
    const matchingTypes = productTypes.filter((type) => groupDef.targetSlugs.includes(type.slug));

    for (const type of matchingTypes) {
      const group = await prisma.filterGroup.upsert({
        where: {
          productTypeId_slug: {
            productTypeId: type.id,
            slug: groupDef.slug,
          },
        },
        update: {
          name: groupDef.name,
          displayName: groupDef.name,
          isActive: true,
          filterType: groupDef.filterType,
        },
        create: {
          productTypeId: type.id,
          name: groupDef.name,
          displayName: groupDef.name,
          slug: groupDef.slug,
          displayOrder: 30,
          isActive: true,
          filterType: groupDef.filterType,
        },
      });

      for (const option of groupDef.options) {
        const existingOption = await prisma.filterOption.findFirst({
          where: {
            filterGroupId: group.id,
            value: option.value,
          },
          select: { id: true },
        });

        if (existingOption) {
          await prisma.filterOption.update({
            where: { id: existingOption.id },
            data: {
              displayLabel: option.displayLabel,
              displayOrder: option.displayOrder,
              isActive: true,
            },
          });
          continue;
        }

        await prisma.filterOption.create({
          data: {
            filterGroupId: group.id,
            value: option.value,
            displayLabel: option.displayLabel,
            displayOrder: option.displayOrder,
            isActive: true,
          },
        });
      }
    }
  }
}

async function upsertTaxonomy() {
  for (const definition of PRODUCT_TYPE_DEFINITIONS) {
    let productType = await prisma.productType.findUnique({
      where: { slug: definition.slug },
      select: { id: true, slug: true },
    });

    if (!productType && definition.fixedId) {
      productType = await prisma.productType.findUnique({
        where: { id: definition.fixedId },
        select: { id: true, slug: true },
      });
    }

    if (!productType) {
      productType = await prisma.productType.create({
        data: {
          id: definition.fixedId,
          name: definition.name,
          slug: definition.slug,
          displayOrder: definition.displayOrder,
          isActive: true,
        },
        select: { id: true, slug: true },
      });
    } else {
      productType = await prisma.productType.update({
        where: { id: productType.id },
        data: {
          name: definition.name,
          slug: definition.slug,
          displayOrder: definition.displayOrder,
          isActive: true,
        },
        select: { id: true, slug: true },
      });
    }

    for (const sub of definition.subcategories) {
      await prisma.$executeRaw`
        INSERT INTO "sub_categories" (
          "id",
          "productTypeId",
          "name",
          "slug",
          "description",
          "displayOrder",
          "isActive",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          gen_random_uuid()::text,
          ${productType.id},
          ${sub.name},
          ${sub.slug},
          NULL,
          ${sub.displayOrder},
          true,
          NOW(),
          NOW()
        )
        ON CONFLICT ("productTypeId", "slug") DO UPDATE
        SET
          "name" = EXCLUDED."name",
          "displayOrder" = EXCLUDED."displayOrder",
          "isActive" = true,
          "updatedAt" = NOW()
      `;
    }
  }
}

async function main() {
  await upsertTaxonomy();
  await upsertFilterMetadata();
  console.log('Taxonomy and filter metadata seeded successfully');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
