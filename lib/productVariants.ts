type ProductLike = Record<string, any>;

const KNOWN_COLOR_NAMES: Record<string, string> = {
  black: "#111111",
  white: "#F8F8F8",
  red: "#C9302C",
  blue: "#2B63C6",
  green: "#2E8B57",
  pink: "#E06A9B",
  beige: "#D8C3A5",
  nude: "#D3B195",
  maroon: "#7A1F3D",
  wine: "#6F1D3B",
  purple: "#6B4FA1",
  grey: "#808080",
  gray: "#808080",
  brown: "#7B5B47",
  peach: "#E8A87C",
  lavender: "#A98BC6",
  navy: "#243B6B",
  ivory: "#F5F0E6",
  mocha: "#8C6A54",
  tan: "#B58B67",
  coral: "#E07A6A",
  mint: "#76C8A8",
  yellow: "#E2B534",
  orange: "#D9822B",
};

const COLOR_FIELDS = [
  "color",
  "colour",
  "shade",
  "colorName",
  "variantColor",
] as const;

const COLOR_HEX_FIELDS = [
  "colorHex",
  "colourHex",
  "hex",
  "swatch",
  "swatchHex",
] as const;

const normalize = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const titleCase = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const extractKnownColorFromText = (text: string) => {
  const normalizedText = normalize(text);
  const entries = Object.keys(KNOWN_COLOR_NAMES).sort((a, b) => b.length - a.length);
  for (const colorName of entries) {
    const pattern = new RegExp(`(^|[^a-z])${colorName}([^a-z]|$)`, "i");
    if (pattern.test(normalizedText)) {
      return colorName;
    }
  }
  return "";
};

const isHexColor = (value: string) => /^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(value.trim());

const buildStableFallbackColor = (seed: string) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = seed.charCodeAt(index) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 55% 58%)`;
};

export const getProductCategory = (product: ProductLike) => {
  const category = product?.category?.name || product?.category || product?.category_name;
  const text = String(category || "").trim();
  return text || "Uncategorized";
};

export const getProductCategoryKey = (product: ProductLike) => normalize(getProductCategory(product));

export const getProductColorLabel = (product: ProductLike, index = 0) => {
  // 1. First check dedicated colorName field (highest priority from DB)
  if (typeof product?.colorName === "string" && product.colorName.trim()) {
    return titleCase(product.colorName.trim());
  }

  // 2. Fall back to legacy color fields
  for (const field of COLOR_FIELDS) {
    const raw = product?.[field];
    if (typeof raw === "string" && raw.trim()) {
      return titleCase(raw.trim());
    }
  }

  // 3. Try to extract from tag
  const tagCandidate = typeof product?.tag === "string" ? product.tag.trim() : "";
  if (tagCandidate) {
    const fromTag = extractKnownColorFromText(tagCandidate);
    if (fromTag) return titleCase(fromTag);
  }

  // 4. Try to extract from product name
  const nameCandidate = typeof product?.name === "string" ? product.name.trim() : "";
  const fromName = extractKnownColorFromText(nameCandidate);
  if (fromName) return titleCase(fromName);

  return `Option ${index + 1}`;
};

export const getProductSwatchColor = (product: ProductLike, index = 0) => {
  // 1. First check dedicated colorHex field from DB (highest priority)
  const colorHexFromDb = String(product?.colorHex || "").trim();
  if (colorHexFromDb && (isHexColor(colorHexFromDb) || /^rgb\(/i.test(colorHexFromDb) || /^hsl\(/i.test(colorHexFromDb))) {
    return colorHexFromDb;
  }

  // 2. Fall back to legacy colorHex fields
  for (const field of COLOR_HEX_FIELDS) {
    const raw = String(product?.[field] || "").trim();
    if (raw && (isHexColor(raw) || /^rgb\(/i.test(raw) || /^hsl\(/i.test(raw))) {
      return raw;
    }
  }

  // 3. Try to map colorName or derived label to known colors
  const colorLabel = normalize(getProductColorLabel(product, index));
  if (KNOWN_COLOR_NAMES[colorLabel]) return KNOWN_COLOR_NAMES[colorLabel];

  // 4. Generate stable fallback based on category and color label
  return buildStableFallbackColor(`${getProductCategoryKey(product)}:${colorLabel}`);
};

export const groupProductsByCategory = <T extends ProductLike>(products: T[]) => {
  const map = new Map<string, { category: string; categoryKey: string; variants: T[] }>();

  for (const product of products || []) {
    const category = getProductCategory(product);
    const categoryKey = normalize(category);
    const existing = map.get(categoryKey);

    if (existing) {
      existing.variants.push(product);
      continue;
    }

    map.set(categoryKey, {
      category,
      categoryKey,
      variants: [product],
    });
  }

  return Array.from(map.values());
};