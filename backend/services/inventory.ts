import { PrismaClient } from '@prisma/client';

import { db } from '@/backend/lib/db';

type PrismaLikeClient = PrismaClient | any;

export type InventoryRow = {
  id: string;
  productId: string;
  size: string;
  stock: number;
  reservedStock: number;
  createdAt: Date;
  updatedAt: Date;
};

export type InventoryInput = {
  size: string;
  stock: number;
};

type TransactionType = 'ADMIN_ADJUSTMENT' | 'ORDER_DEDUCTION' | 'ORDER_CANCELLATION' | 'BACKFILL';

function getClient(client?: PrismaLikeClient) {
  return client ?? db;
}

function normalizeSize(size: string) {
  return String(size || '').trim();
}

function normalizeStock(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Stock must be a non-negative integer');
  }

  return Math.trunc(value);
}

function isInventoryTableMissingError(error: any) {
  const code = String(error?.code || '').trim();
  const message = String(error?.message || '').toLowerCase();

  if (code === 'P2021') {
    return true;
  }

  const mentionsInventoryTable =
    message.includes('product_inventory') || message.includes('inventory_transactions');
  const indicatesMissingTable =
    message.includes('does not exist') || message.includes("doesn't exist") || message.includes('not exist');

  return mentionsInventoryTable && indicatesMissingTable;
}

async function isProductInventoryTableAvailable(client?: PrismaLikeClient) {
  const prisma = getClient(client) as any;

  try {
    const rows = await prisma.$queryRaw<Array<{ tableName: string | null }>>`
      SELECT to_regclass('public.product_inventory')::text AS "tableName"
    `;

    return Boolean(rows?.[0]?.tableName);
  } catch {
    return false;
  }
}

async function getLegacyProductStock(productId: string, client?: PrismaLikeClient) {
  const prisma = getClient(client) as any;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { stock: true },
  });

  return Number(product?.stock || 0);
}

async function setLegacyProductStock(productId: string, stock: number, client?: PrismaLikeClient) {
  const prisma = getClient(client) as any;
  const safeStock = normalizeStock(stock);

  await prisma.product.update({
    where: { id: productId },
    data: { stock: safeStock },
  });
}

export function distributeStockAcrossSizes(totalStock: number, sizes: string[]) {
  const normalizedSizes = Array.from(new Set(sizes.map(normalizeSize).filter(Boolean)));
  if (normalizedSizes.length === 0) {
    return [] as InventoryInput[];
  }

  const safeTotal = normalizeStock(totalStock);
  const baseStock = Math.floor(safeTotal / normalizedSizes.length);
  const remainder = safeTotal % normalizedSizes.length;

  return normalizedSizes.map((size, index) => ({
    size,
    stock: baseStock + (index === 0 ? remainder : 0),
  }));
}

async function insertInventoryTransaction(
  productId: string,
  size: string,
  quantity: number,
  transactionType: TransactionType,
  reason: string,
  client?: PrismaLikeClient
) {
  const prisma = getClient(client) as any;
  try {
    await prisma.inventoryTransaction.create({
      data: {
        productId,
        size,
        quantity,
        transactionType,
        reason,
      },
    });
  } catch (error) {
    if (!isInventoryTableMissingError(error)) {
      throw error;
    }
  }
}

async function syncAggregateProductStock(productId: string, client?: PrismaLikeClient) {
  const prisma = getClient(client) as any;
  let aggregate: any;
  try {
    aggregate = await prisma.productInventory.aggregate({
      where: { productId },
      _sum: { stock: true },
    });
  } catch (error) {
    if (isInventoryTableMissingError(error)) {
      return getLegacyProductStock(productId, prisma);
    }
    throw error;
  }

  const totalStock = Number(aggregate?._sum?.stock || 0);

  // Backward compatibility: existing Product, cart, checkout, and admin screens still read Product.stock.
  await prisma.product.update({
    where: { id: productId },
    data: { stock: totalStock },
  });

  return totalStock;
}

export async function getProductInventory(productId: string, client?: PrismaLikeClient) {
  const prisma = getClient(client) as any;
  try {
    return (await prisma.productInventory.findMany({
      where: { productId },
      orderBy: { size: 'asc' },
    })) as InventoryRow[];
  } catch (error) {
    if (isInventoryTableMissingError(error)) {
      return [] as InventoryRow[];
    }
    throw error;
  }
}

export async function ensureProductInventory(
  productId: string,
  sizes: string[],
  totalStock: number,
  client?: PrismaLikeClient,
  reason = 'Initial inventory backfill from Product.stock'
) {
  const prisma = getClient(client) as any;
  const inventoryTableAvailable = await isProductInventoryTableAvailable(prisma);

  if (!inventoryTableAvailable) {
    await setLegacyProductStock(productId, totalStock, prisma);
    return [] as InventoryRow[];
  }

  let existingRows: InventoryRow[];
  try {
    existingRows = (await prisma.productInventory.findMany({
      where: { productId },
    })) as InventoryRow[];
  } catch (error) {
    if (isInventoryTableMissingError(error)) {
      await setLegacyProductStock(productId, totalStock, prisma);
      return [] as InventoryRow[];
    }
    throw error;
  }

  if (existingRows.length > 0) {
    await syncAggregateProductStock(productId, prisma);
    return existingRows;
  }

  const distribution = distributeStockAcrossSizes(totalStock, sizes);
  for (const item of distribution) {
    await prisma.productInventory.upsert({
      where: {
        productId_size: {
          productId,
          size: item.size,
        },
      },
      update: {},
      create: {
        productId,
        size: item.size,
        stock: item.stock,
        reservedStock: 0,
      },
    });

    await insertInventoryTransaction(productId, item.size, item.stock, 'BACKFILL', reason, prisma);
  }

  await syncAggregateProductStock(productId, prisma);
  return getProductInventory(productId, prisma);
}

export async function syncProductInventory(
  productId: string,
  sizes: string[],
  requestedInventory: InventoryInput[] | null | undefined,
  fallbackTotalStock: number,
  client?: PrismaLikeClient,
  reason = 'Admin inventory sync'
) {
  const prisma = getClient(client) as any;
  const inventoryTableAvailable = await isProductInventoryTableAvailable(prisma);
  if (!inventoryTableAvailable) {
    await setLegacyProductStock(productId, fallbackTotalStock, prisma);
    return [] as InventoryRow[];
  }

  const normalizedSizes = Array.from(new Set(sizes.map(normalizeSize).filter(Boolean)));

  if (normalizedSizes.length === 0) {
    try {
      await prisma.productInventory.deleteMany({ where: { productId } });
      await syncAggregateProductStock(productId, prisma);
      return [] as InventoryRow[];
    } catch (error) {
      if (isInventoryTableMissingError(error)) {
        await setLegacyProductStock(productId, fallbackTotalStock, prisma);
        return [] as InventoryRow[];
      }
      throw error;
    }
  }

  try {
    const sourceRows = Array.isArray(requestedInventory) && requestedInventory.length > 0
      ? requestedInventory
          .map((item) => ({ size: normalizeSize(item.size), stock: normalizeStock(item.stock) }))
          .filter((item) => item.size.length > 0 && normalizedSizes.includes(item.size))
      : distributeStockAcrossSizes(fallbackTotalStock, normalizedSizes);

    const nextBySize = new Map<string, number>();
    for (const size of normalizedSizes) {
      nextBySize.set(size, 0);
    }

    for (const item of sourceRows) {
      nextBySize.set(item.size, item.stock);
    }

    const existingRows = (await prisma.productInventory.findMany({
      where: { productId },
    })) as InventoryRow[];
    const existingBySize = new Map(existingRows.map((row) => [row.size, row]));

    for (const size of normalizedSizes) {
      const nextStock = nextBySize.get(size) ?? 0;
      const previousStock = Number(existingBySize.get(size)?.stock || 0);

      await prisma.productInventory.upsert({
        where: {
          productId_size: {
            productId,
            size,
          },
        },
        update: {
          stock: nextStock,
        },
        create: {
          productId,
          size,
          stock: nextStock,
          reservedStock: 0,
        },
      });

      const delta = nextStock - previousStock;
      if (delta !== 0) {
        await insertInventoryTransaction(productId, size, delta, 'ADMIN_ADJUSTMENT', reason, prisma);
      }
    }

    const sizesToDelete = existingRows
      .map((row) => row.size)
      .filter((size) => !normalizedSizes.includes(size));

    if (sizesToDelete.length > 0) {
      await prisma.productInventory.deleteMany({
        where: {
          productId,
          size: { in: sizesToDelete },
        },
      });
    }

    await syncAggregateProductStock(productId, prisma);
    return getProductInventory(productId, prisma);
  } catch (error) {
    if (isInventoryTableMissingError(error)) {
      await setLegacyProductStock(productId, fallbackTotalStock, prisma);
      return [] as InventoryRow[];
    }
    throw error;
  }
}

export async function updateInventory(
  productId: string,
  size: string,
  stock: number,
  client?: PrismaLikeClient,
  reason = 'Admin stock adjustment'
) {
  const prisma = getClient(client) as any;
  const normalized = normalizeSize(size);
  const nextStock = normalizeStock(stock);

  const inventoryTableAvailable = await isProductInventoryTableAvailable(prisma);
  if (!inventoryTableAvailable) {
    await setLegacyProductStock(productId, nextStock, prisma);
    return {
      id: `legacy-${productId}-${normalized || 'default'}`,
      productId,
      size: normalized,
      stock: nextStock,
      reservedStock: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as InventoryRow;
  }

  if (!normalized) {
    throw new Error('Size is required');
  }

  try {
    const existing = await prisma.productInventory.findUnique({
      where: {
        productId_size: {
          productId,
          size: normalized,
        },
      },
    });

    const updated = await prisma.productInventory.upsert({
      where: {
        productId_size: {
          productId,
          size: normalized,
        },
      },
      update: {
        stock: nextStock,
      },
      create: {
        productId,
        size: normalized,
        stock: nextStock,
        reservedStock: 0,
      },
    });

    const delta = nextStock - Number(existing?.stock || 0);
    if (delta !== 0) {
      await insertInventoryTransaction(productId, normalized, delta, 'ADMIN_ADJUSTMENT', reason, prisma);
    }

    await syncAggregateProductStock(productId, prisma);
    return updated as InventoryRow;
  } catch (error) {
    if (isInventoryTableMissingError(error)) {
      await setLegacyProductStock(productId, nextStock, prisma);
      return {
        id: `legacy-${productId}-${normalized}`,
        productId,
        size: normalized,
        stock: nextStock,
        reservedStock: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as InventoryRow;
    }
    throw error;
  }
}

export async function decreaseInventory(
  productId: string,
  size: string,
  quantity: number,
  client?: PrismaLikeClient,
  reason = 'Order deduction'
) {
  const prisma = getClient(client) as any;
  const normalized = normalizeSize(size);
  const safeQuantity = normalizeStock(quantity);

  const inventoryTableAvailable = await isProductInventoryTableAvailable(prisma);
  if (!inventoryTableAvailable) {
    const updated = await prisma.product.updateMany({
      where: {
        id: productId,
        stock: { gte: safeQuantity },
      },
      data: {
        stock: { decrement: safeQuantity },
      },
    });

    if (Number(updated?.count || 0) === 0) {
      throw new Error('Insufficient stock');
    }

    const nextStock = await getLegacyProductStock(productId, prisma);
    return {
      id: `legacy-${productId}-${normalized || 'default'}`,
      productId,
      size: normalized,
      stock: nextStock,
      reservedStock: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as InventoryRow;
  }

  if (!normalized) {
    throw new Error('Size is required for inventory deduction');
  }

  if (safeQuantity <= 0) {
    throw new Error('Quantity must be greater than zero');
  }

  try {
    const existing = await prisma.productInventory.findUnique({
      where: {
        productId_size: {
          productId,
          size: normalized,
        },
      },
    });

    if (!existing) {
      throw new Error(`Inventory not found for size ${normalized}`);
    }

    if (Number(existing.stock) < safeQuantity) {
      throw new Error(`Insufficient inventory for size ${normalized}`);
    }

    const updated = await prisma.productInventory.update({
      where: {
        productId_size: {
          productId,
          size: normalized,
        },
      },
      data: {
        stock: {
          decrement: safeQuantity,
        },
      },
    });

    await insertInventoryTransaction(productId, normalized, -safeQuantity, 'ORDER_DEDUCTION', reason, prisma);
    await syncAggregateProductStock(productId, prisma);
    return updated as InventoryRow;
  } catch (error) {
    if (isInventoryTableMissingError(error)) {
      const updated = await prisma.product.updateMany({
        where: {
          id: productId,
          stock: { gte: safeQuantity },
        },
        data: {
          stock: { decrement: safeQuantity },
        },
      });

      if (Number(updated?.count || 0) === 0) {
        throw new Error('Insufficient stock');
      }

      const nextStock = await getLegacyProductStock(productId, prisma);
      return {
        id: `legacy-${productId}-${normalized}`,
        productId,
        size: normalized,
        stock: nextStock,
        reservedStock: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as InventoryRow;
    }
    throw error;
  }
}

export async function increaseInventory(
  productId: string,
  size: string,
  quantity: number,
  client?: PrismaLikeClient,
  reason = 'Order cancellation restock'
) {
  const prisma = getClient(client) as any;
  const normalized = normalizeSize(size);
  const safeQuantity = normalizeStock(quantity);

  const inventoryTableAvailable = await isProductInventoryTableAvailable(prisma);
  if (!inventoryTableAvailable) {
    await prisma.product.update({
      where: { id: productId },
      data: {
        stock: { increment: safeQuantity },
      },
    });

    const nextStock = await getLegacyProductStock(productId, prisma);
    return {
      id: `legacy-${productId}-${normalized || 'default'}`,
      productId,
      size: normalized,
      stock: nextStock,
      reservedStock: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as InventoryRow;
  }

  if (!normalized) {
    throw new Error('Size is required for inventory increment');
  }

  if (safeQuantity <= 0) {
    throw new Error('Quantity must be greater than zero');
  }

  try {
    const updated = await prisma.productInventory.upsert({
      where: {
        productId_size: {
          productId,
          size: normalized,
        },
      },
      update: {
        stock: {
          increment: safeQuantity,
        },
      },
      create: {
        productId,
        size: normalized,
        stock: safeQuantity,
        reservedStock: 0,
      },
    });

    await insertInventoryTransaction(productId, normalized, safeQuantity, 'ORDER_CANCELLATION', reason, prisma);
    await syncAggregateProductStock(productId, prisma);
    return updated as InventoryRow;
  } catch (error) {
    if (isInventoryTableMissingError(error)) {
      await prisma.product.update({
        where: { id: productId },
        data: {
          stock: { increment: safeQuantity },
        },
      });

      const nextStock = await getLegacyProductStock(productId, prisma);
      return {
        id: `legacy-${productId}-${normalized}`,
        productId,
        size: normalized,
        stock: nextStock,
        reservedStock: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as InventoryRow;
    }
    throw error;
  }
}

export async function getTotalInventory(productId: string, client?: PrismaLikeClient) {
  const prisma = getClient(client) as any;
  const inventoryTableAvailable = await isProductInventoryTableAvailable(prisma);
  if (!inventoryTableAvailable) {
    return getLegacyProductStock(productId, prisma);
  }

  try {
    const aggregate = await prisma.productInventory.aggregate({
      where: { productId },
      _sum: { stock: true },
    });

    return Number(aggregate?._sum?.stock || 0);
  } catch (error) {
    if (isInventoryTableMissingError(error)) {
      return getLegacyProductStock(productId, prisma);
    }
    throw error;
  }
}

export async function getInventoryForSize(productId: string, size: string, client?: PrismaLikeClient) {
  const prisma = getClient(client) as any;
  const normalized = normalizeSize(size);
  if (!normalized) {
    return null;
  }

  const inventoryTableAvailable = await isProductInventoryTableAvailable(prisma);
  if (!inventoryTableAvailable) {
    return null;
  }

  try {
    return prisma.productInventory.findUnique({
      where: {
        productId_size: {
          productId,
          size: normalized,
        },
      },
    });
  } catch (error) {
    if (isInventoryTableMissingError(error)) {
      return null;
    }
    throw error;
  }
}

export async function restoreOrderInventory(orderId: string, client?: PrismaLikeClient) {
  const prisma = getClient(client) as any;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { orderItems: true },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  for (const item of order.orderItems) {
    const size = normalizeSize(item.selectedSize || item.productSize || '');
    if (!size) {
      continue;
    }

    await increaseInventory(item.productId, size, Number(item.quantity || 0), prisma, `Order ${orderId} cancelled`);
  }
}