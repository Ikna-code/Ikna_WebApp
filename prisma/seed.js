const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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

async function main() {
  await upsertFilterMetadata();
  console.log('Filter metadata seeded successfully');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
