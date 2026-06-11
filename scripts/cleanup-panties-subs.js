const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.subCategory.deleteMany({
    where: { productTypeId: 'ed841ce9-157d-4b13-a6c0-10a5df5649f6' },
  });

  console.log('Deleted subcategories:', deleted.count);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
