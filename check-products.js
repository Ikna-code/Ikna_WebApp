const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // Get product types
    const types = await prisma.productType.findMany({
      select: { id: true, name: true },
    });

    console.log('Product Types:', types);

    // Get product count by type
    const productsByType = await prisma.product.groupBy({
      by: ['productTypeId'],
      _count: {
        id: true,
      },
    });

    console.log('Products by Type:', productsByType);

    // Get total product count
    const total = await prisma.product.count();
    console.log('Total products:', total);

    // Get subcategories for Bras
    const brasType = types.find((t) => t.name === 'Bras');
    if (brasType) {
      const subCats = await prisma.subCategory.findMany({
        where: { productTypeId: brasType.id },
      });
      console.log('Bras SubCategories:', subCats);

      // Get products in Bras with subcategories
      const brasProducts = await prisma.product.findMany({
        where: { productTypeId: brasType.id },
        select: { id: true, name: true, subCategoryId: true },
        take: 10,
      });
      console.log('Bras Products (first 10):', brasProducts);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
