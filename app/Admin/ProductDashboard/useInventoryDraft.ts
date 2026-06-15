import { useEffect, useMemo, useState } from 'react';

const EMPTY_ROWS: InventoryDraftRow[] = [];

export type InventoryDraftRow = {
  size: string;
  stock: string;
};

type UseInventoryDraftOptions = {
  sizesValue: string;
  totalStockValue: string;
  initialRows?: InventoryDraftRow[];
  resetKey?: string;
};

function normalizeSize(size: string) {
  return String(size || '').trim();
}

function normalizeStockValue(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.trunc(parsed);
}

function parseSizes(sizesValue: string) {
  return Array.from(
    new Set(
      String(sizesValue || '')
        .split(',')
        .map((size) => normalizeSize(size))
        .filter(Boolean)
    )
  );
}

function distributeStock(totalStockValue: string, sizes: string[]) {
  const totalStock = normalizeStockValue(totalStockValue);
  if (sizes.length === 0) {
    return new Map<string, string>();
  }

  const baseStock = Math.floor(totalStock / sizes.length);
  const remainder = totalStock % sizes.length;

  return new Map(
    sizes.map((size, index) => [size, String(baseStock + (index === 0 ? remainder : 0))])
  );
}

function rowsAreEqual(left: InventoryDraftRow[], right: InventoryDraftRow[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((row, index) => {
    const other = right[index];
    return other && normalizeSize(row.size) === normalizeSize(other.size) && row.stock === other.stock;
  });
}

export function toInventoryPayload(rows: InventoryDraftRow[]) {
  return rows.map((row) => ({
    size: normalizeSize(row.size),
    stock: normalizeStockValue(row.stock),
  }));
}

export function useInventoryDraft({
  sizesValue,
  totalStockValue,
  initialRows = EMPTY_ROWS,
  resetKey = '',
}: UseInventoryDraftOptions) {
  const [rows, setRows] = useState<InventoryDraftRow[]>([]);
  const [isManualOverride, setIsManualOverride] = useState(false);

  const sizes = useMemo(() => parseSizes(sizesValue), [sizesValue]);
  const initialSignature = useMemo(
    () => JSON.stringify(initialRows.map((row) => ({ size: normalizeSize(row.size), stock: row.stock }))),
    [initialRows]
  );

  useEffect(() => {
    setIsManualOverride(false);
  }, [initialSignature, resetKey]);

  useEffect(() => {
    const fallbackDistribution = distributeStock(totalStockValue, sizes);
    const initialMap = new Map(
      initialRows.map((row) => [normalizeSize(row.size), String(normalizeStockValue(row.stock))])
    );

    setRows((currentRows) => {
      const currentMap = new Map(currentRows.map((row) => [normalizeSize(row.size), row.stock]));

      const nextRows = sizes.map((size) => {
        if (isManualOverride && currentMap.has(size)) {
          return { size, stock: currentMap.get(size) || '0' };
        }

        if (initialMap.has(size)) {
          return { size, stock: initialMap.get(size) || '0' };
        }

        return { size, stock: fallbackDistribution.get(size) || '0' };
      });

      return rowsAreEqual(currentRows, nextRows) ? currentRows : nextRows;
    });
  }, [initialSignature, initialRows, isManualOverride, sizes, totalStockValue]);

  const totalStock = useMemo(
    () => rows.reduce((sum, row) => sum + normalizeStockValue(row.stock), 0),
    [rows]
  );

  const updateRowStock = (size: string, nextValue: string) => {
    const normalizedSize = normalizeSize(size);
    setIsManualOverride(true);
    setRows((currentRows) =>
      currentRows.map((row) =>
        normalizeSize(row.size) === normalizedSize
          ? { ...row, stock: nextValue === '' ? '0' : String(Math.max(0, Math.trunc(Number(nextValue) || 0))) }
          : row
      )
    );
  };

  return {
    rows,
    totalStock,
    updateRowStock,
  };
}