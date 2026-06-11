const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // Use any-cast to work around stale Prisma TS types
    const dbProductAny = prisma.product;
    
    const products = await dbProductAny.findMany({
      where: {
        isDeleted: false,
        isActive: true,
      },
      include: {
        productType: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        subCategory: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    console.log('API Products:');
    console.log(JSON.stringify(products, null, 2));

    // Check specifically what the Bras products look like
    console.log('\n\nBras products only:');
    const brasProducts = products.filter(p => p.productType?.name === 'Bras');
    brasProducts.forEach(p => {
      console.log(`Product: ${p.name}`);
      console.log(`  ID: ${p.id}`);
      console.log(`  ProductType: ${p.productType?.name}`);
      console.log(`  SubCategory: ${p.subCategory?.name}`);
      console.log(`  Category field: ${p.category}`);
    });
  } finally {
    await prisma.$disconnect();
  }
}

main();
