/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function normalizeSize(size) {
  return String(size || '').trim();
}

function normalizeStock(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : 0;
}

function distributeStock(totalStock, sizes) {
  const normalizedSizes = Array.from(new Set((sizes || []).map(normalizeSize).filter(Boolean)));
  if (normalizedSizes.length === 0) {
    return [];
  }

  const safeTotal = normalizeStock(totalStock);
  const baseStock = Math.floor(safeTotal / normalizedSizes.length);
  const remainder = safeTotal % normalizedSizes.length;

  return normalizedSizes.map((size, index) => ({
    size,
    stock: baseStock + (index === 0 ? remainder : 0),
  }));
}

async function syncAggregateStock(tx, productId) {
  const aggregate = await tx.productInventory.aggregate({
    where: { productId },
    _sum: { stock: true },
  });

  await tx.product.update({
    where: { id: productId },
    data: { stock: Number(aggregate?._sum?.stock || 0) },
  });
}

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      stock: true,
      sizes: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  let createdRows = 0;
  let skippedProducts = 0;

  for (const product of products) {
    const existingCount = await prisma.productInventory.count({
      where: { productId: product.id },
    });

    if (existingCount > 0) {
      skippedProducts += 1;
      await prisma.$transaction(async (tx) => {
        await syncAggregateStock(tx, product.id);
      });
      continue;
    }

    const distribution = distributeStock(product.stock, product.sizes || []);

    await prisma.$transaction(async (tx) => {
      for (const item of distribution) {
        await tx.productInventory.upsert({
          where: {
            productId_size: {
              productId: product.id,
              size: item.size,
            },
          },
          update: {},
          create: {
            productId: product.id,
            size: item.size,
            stock: item.stock,
            reservedStock: 0,
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            productId: product.id,
            size: item.size,
            quantity: item.stock,
            transactionType: 'BACKFILL',
            reason: 'Idempotent inventory backfill from Product.stock',
          },
        });

        createdRows += 1;
      }

      await syncAggregateStock(tx, product.id);
    });
  }

  console.log(JSON.stringify({ processedProducts: products.length, createdRows, skippedProducts }, null, 2));
}

main()
  .catch((error) => {
    console.error('Inventory backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });