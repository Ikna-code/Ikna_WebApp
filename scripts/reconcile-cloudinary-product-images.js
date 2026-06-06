/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const { v2: cloudinary } = require('cloudinary');
require('dotenv').config();

const prisma = new PrismaClient();

function getFileBase(value) {
  const raw = String(value || '').split('?')[0];
  const leaf = raw.split('/').pop() || '';
  return leaf.toLowerCase().replace(/\.[^.]+$/, '');
}

function toBaseFromPublicId(publicId) {
  const leaf = String(publicId || '').split('/').pop() || '';
  return leaf.toLowerCase().replace(/_[^_]+$/, '');
}

async function fetchAllCloudinaryResources() {
  const resources = [];
  let nextCursor;

  do {
    const result = await cloudinary.api.resources({
      type: 'upload',
      max_results: 500,
      next_cursor: nextCursor,
    });

    resources.push(...(result.resources || []));
    nextCursor = result.next_cursor;
  } while (nextCursor);

  return resources;
}

async function main() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const resources = await fetchAllCloudinaryResources();
  const byBase = new Map();

  for (const resource of resources) {
    const key = toBaseFromPublicId(resource.public_id);
    if (!byBase.has(key)) byBase.set(key, []);
    byBase.get(key).push(resource);
  }

  const products = await prisma.product.findMany({
    include: { images: true },
  });

  let productUpdates = 0;
  let imageUpdates = 0;
  let unmatchedProducts = 0;
  let unmatchedImages = 0;

  for (const product of products) {
    const productMatch = byBase.get(getFileBase(product.image)) || [];
    if (productMatch.length === 1) {
      await prisma.product.update({
        where: { id: product.id },
        data: { image: productMatch[0].secure_url },
      });
      productUpdates++;
    } else if (product.image) {
      unmatchedProducts++;
      console.log(
        `[UNMATCHED_PRODUCT] id=${product.id} image=${product.image} matches=${productMatch.length}`
      );
    }

    for (const imageRow of product.images || []) {
      const rowMatch = byBase.get(getFileBase(imageRow.image_path)) || [];
      if (rowMatch.length === 1) {
        await prisma.productImage.update({
          where: { id: imageRow.id },
          data: {
            image_path: rowMatch[0].secure_url,
            public_id: rowMatch[0].public_id,
          },
        });
        imageUpdates++;
      } else if (imageRow.image_path) {
        unmatchedImages++;
        console.log(
          `[UNMATCHED_PRODUCT_IMAGE] id=${imageRow.id} product=${product.id} image=${imageRow.image_path} matches=${rowMatch.length}`
        );
      }
    }
  }

  console.log('--- Reconciliation Summary ---');
  console.log(`Cloudinary resources: ${resources.length}`);
  console.log(`Products updated: ${productUpdates}`);
  console.log(`ProductImage rows updated: ${imageUpdates}`);
  console.log(`Unmatched Product images: ${unmatchedProducts}`);
  console.log(`Unmatched ProductImage rows: ${unmatchedImages}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
