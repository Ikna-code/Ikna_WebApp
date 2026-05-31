export function getShortOrderReference(orderId: string | null | undefined) {
  if (!orderId) return '';

  const normalized = String(orderId).trim();
  if (!normalized) return '';

  return normalized.slice(-6).toUpperCase();
}
