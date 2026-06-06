/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, image: true },
  });

  const productImages = await prisma.productImage.findMany({
    select: { id: true, product_id: true, image_path: true, public_id: true },
  });

  const nonCloudinaryProducts = products.filter(
    (row) => !String(row.image || '').includes('res.cloudinary.com')
  );

  const nonCloudinaryProductImages = productImages.filter(
    (row) => !String(row.image_path || '').includes('res.cloudinary.com')
  );

  console.log(`Products not on Cloudinary: ${nonCloudinaryProducts.length}`);
  console.log(`ProductImage rows not on Cloudinary: ${nonCloudinaryProductImages.length}`);

  if (nonCloudinaryProducts.length) {
    console.log('Sample Product rows:');
    console.log(nonCloudinaryProducts.slice(0, 10));
  }

  if (nonCloudinaryProductImages.length) {
    console.log('Sample ProductImage rows:');
    console.log(nonCloudinaryProductImages.slice(0, 10));
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
