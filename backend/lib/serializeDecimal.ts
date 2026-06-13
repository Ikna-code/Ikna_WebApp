/**
 * Recursively converts all Decimal values to numbers for JSON serialization
 * Handles nested objects and arrays
 */
export function serializeDecimal(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj.toJSON === 'function') {
    // Prisma Decimal has a toJSON method
    return Number(obj);
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeDecimal);
  }

  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        serialized[key] = serializeDecimal(obj[key]);
      }
    }
    return serialized;
  }

  return obj;
}
