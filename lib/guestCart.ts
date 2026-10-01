export type GuestCartItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  image?: string;
  image_path?: string;
  selectedSize?: string;
  quantity: number;
  category?: string | null;
  comboEligibleQuantity?: number;
  comboBundleId?: string;
};

export type GuestCheckoutData = {
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  shippingAddress: string;
  createdAt?: string;
  expiresAt?: string;
};

const GUEST_CART_KEY = 'ikna_guest_cart_v1';
const GUEST_CHECKOUT_KEY = 'ikna_guest_checkout_v1';
const GUEST_TTL_MS = 1000 * 60 * 60 * 24 * 2;

function isBrowser() {
  return typeof window !== 'undefined';
}

function nowIso() {
  return new Date().toISOString();
}

function buildGuestShippingAddress(data: Partial<GuestCheckoutData>) {
  return [
    data.name,
    data.street,
    data.city,
    data.state,
    data.zip,
    data.country || 'India',
  ]
    .filter(Boolean)
    .join(', ');
}

export function cleanupExpiredGuestData() {
  if (!isBrowser()) return;

  try {
    const rawCheckout = localStorage.getItem(GUEST_CHECKOUT_KEY);
    if (rawCheckout) {
      const parsed = JSON.parse(rawCheckout) as GuestCheckoutData;
      const expiresAt = parsed?.expiresAt ? new Date(parsed.expiresAt).getTime() : 0;
      if (expiresAt && Date.now() > expiresAt) {
        localStorage.removeItem(GUEST_CHECKOUT_KEY);
      }
    }
  } catch (error) {
    console.error('[guest-cart] cleanup failed', error);
  }
}

export function readGuestCart(): GuestCartItem[] {
  if (!isBrowser()) return [];

  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGuestCart(items: GuestCartItem[]) {
  if (!isBrowser()) return;
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

export function addGuestCartItem(item: GuestCartItem) {
  const existing = readGuestCart();
  const matchKey = `${item.productId}-${item.selectedSize || 'nosize'}-${item.comboBundleId || 'nobundle'}`;
  const next = [...existing];
  const existingIndex = next.findIndex((entry) => {
    const key = `${entry.productId}-${entry.selectedSize || 'nosize'}-${entry.comboBundleId || 'nobundle'}`;
    return key === matchKey;
  });

  if (existingIndex >= 0) {
    next[existingIndex] = {
      ...next[existingIndex],
      quantity: next[existingIndex].quantity + Number(item.quantity || 1),
      price: Number(item.price || next[existingIndex].price || 0),
      comboEligibleQuantity: item.comboEligibleQuantity ?? next[existingIndex].comboEligibleQuantity ?? 0,
    };
  } else {
    next.push({ ...item, quantity: Math.max(1, Number(item.quantity || 1)) });
  }

  saveGuestCart(next);
  return next;
}

export function updateGuestCartItem(itemId: string, quantity: number) {
  const existing = readGuestCart();
  const next = existing.map((item) =>
    item.id === itemId ? { ...item, quantity: Math.max(1, Number(quantity || 1)) } : item
  );
  saveGuestCart(next);
  return next;
}

export function removeGuestCartItem(itemId: string) {
  const next = readGuestCart().filter((item) => item.id !== itemId);
  saveGuestCart(next);
  return next;
}

export function clearGuestCart() {
  if (!isBrowser()) return;
  localStorage.removeItem(GUEST_CART_KEY);
}

export function readGuestCheckout(): GuestCheckoutData | null {
  if (!isBrowser()) return null;

  try {
    const raw = localStorage.getItem(GUEST_CHECKOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestCheckoutData;
    if (!parsed || !parsed.email && !parsed.street && !parsed.phone && !parsed.name) {
      return null;
    }

    const expiresAt = parsed?.expiresAt ? new Date(parsed.expiresAt).getTime() : 0;
    if (expiresAt && Date.now() > expiresAt) {
      localStorage.removeItem(GUEST_CHECKOUT_KEY);
      return null;
    }

    const normalized: GuestCheckoutData = {
      name: String(parsed.name || '').trim(),
      email: String(parsed.email || '').trim(),
      phone: String(parsed.phone || '').trim(),
      street: String(parsed.street || '').trim(),
      city: String(parsed.city || '').trim(),
      state: String(parsed.state || '').trim(),
      zip: String(parsed.zip || '').trim(),
      country: String(parsed.country || 'India').trim() || 'India',
      shippingAddress: String(parsed.shippingAddress || buildGuestShippingAddress(parsed)).trim(),
      createdAt: parsed.createdAt || nowIso(),
      expiresAt: parsed.expiresAt || new Date(Date.now() + GUEST_TTL_MS).toISOString(),
    };

    localStorage.setItem(GUEST_CHECKOUT_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return null;
  }
}

export function saveGuestCheckout(data: Partial<GuestCheckoutData>) {
  if (!isBrowser()) return null;

  const normalized: GuestCheckoutData = {
    name: String(data.name || '').trim(),
    email: String(data.email || '').trim(),
    phone: String(data.phone || '').trim(),
    street: String(data.street || '').trim(),
    city: String(data.city || '').trim(),
    state: String(data.state || '').trim(),
    zip: String(data.zip || '').trim(),
    country: String(data.country || 'India').trim() || 'India',
    shippingAddress: String(data.shippingAddress || buildGuestShippingAddress(data)).trim(),
    createdAt: data.createdAt || nowIso(),
    expiresAt: data.expiresAt || new Date(Date.now() + GUEST_TTL_MS).toISOString(),
  };

  localStorage.setItem(GUEST_CHECKOUT_KEY, JSON.stringify(normalized));
  return normalized;
}

export function clearGuestCheckout() {
  if (!isBrowser()) return;
  localStorage.removeItem(GUEST_CHECKOUT_KEY);
}
