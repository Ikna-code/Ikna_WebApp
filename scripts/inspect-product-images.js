/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const productId = process.argv[2];
  if (!productId) {
    throw new Error('Usage: node scripts/inspect-product-images.js <productId>');
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: {
        orderBy: [{ is_primary: 'desc' }, { id: 'asc' }],
      },
    },
  });

  if (!product) {
    console.log(`No product found for id=${productId}`);
    return;
  }

  console.log('Product:');
  console.log({
    id: product.id,
    name: product.name,
    image: product.image,
    imageIsCloudinary: String(product.image || '').includes('res.cloudinary.com'),
  });

  console.log('Product images:');
  for (const row of product.images) {
    console.log({
      id: row.id,
      is_primary: row.is_primary,
      public_id: row.public_id,
      image_path: row.image_path,
      imageIsCloudinary: String(row.image_path || '').includes('res.cloudinary.com'),
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
