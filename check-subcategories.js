const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // Check users first to see if DB is working
    const users = await prisma.user.findMany({ take: 1 });
    console.log('Database connection OK. Users in DB:', users.length);

    const subcategories = await prisma.subCategory.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        productTypeId: true,
        isActive: true,
      },
      take: 100,
    });

    console.log('Total subcategories found:', subcategories.length);
    if (subcategories.length > 0) {
      console.log('Sample subcategories:');
      subcategories.slice(0, 5).forEach(sc => {
        console.log(`  - ${sc.name} (${sc.slug}) in type ${sc.productTypeId}, active=${sc.isActive}`);
      });
    } else {
      console.log('No subcategories found in database');
    }

    // Also check product types
    const productTypes = await prisma.productType.findMany({
      select: { id: true, name: true, slug: true },
    });
    console.log('\nProduct types available:', productTypes.length);
    if (productTypes.length === 0) {
      console.log('WARNING: No product types found either!');
    } else {
    productTypes.forEach(pt => {
      console.log(`  - ${pt.name} (${pt.slug})`);
      }

      // Check products
      const products = await prisma.product.findMany({ take: 1 });
      console.log('\nProducts in DB:', products.length);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
