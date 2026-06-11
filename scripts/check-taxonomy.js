const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const productTypes = await prisma.productType.findMany({
    select: { id: true, name: true, slug: true, displayOrder: true },
    orderBy: { displayOrder: 'asc' },
  });

  const panties = productTypes.find((item) => item.slug === 'panties');

  const subCategories = await prisma.subCategory.findMany({
    where: { productTypeId: panties ? panties.id : '' },
    select: { name: true, slug: true, displayOrder: true },
    orderBy: { displayOrder: 'asc' },
  });

  console.log(
    JSON.stringify(
      {
        productTypeCount: productTypes.length,
        pantiesProductTypeId: panties ? panties.id : null,
        subCategoryCountForPanties: subCategories.length,
        subCategories,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
