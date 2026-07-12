'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Boxes,
  Circle,
  CircleDollarSign,
  Images,
  Info,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { IMAGE_BASE_URL } from '@/public/constants/constants';
import { toInventoryPayload, useInventoryDraft } from '../useInventoryDraft';

type ProductInventoryRow = {
  id: string;
  size: string;
  stock: number;
  reservedStock: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type ProductFilterAssignment = {
  id: string;
  filterOptionId: string;
};

type ProductDetail = {
  id: string;
  name: string;
  category: string | null;
  productType?: { id: string; name: string; slug: string } | null;
  subCategory?: { id: string; name: string; slug: string } | null;
  price: number | string;
  stock: number;
  image: string;
  description: string;
  sizes: string[];
  createdAt: string | Date;
  isActive?: boolean;
  isDeleted?: boolean;
  rating?: number | null;
  images?: { id: string; image_path: string; is_primary: boolean | null }[];
  filters?: ProductFilterAssignment[];
  colorHex?: string | null;
  colorName?: string | null;
  fabricType?: string | null;
  inventory?: ProductInventoryRow[];
};

type ProductFormState = {
  name: string;
  price: string;
  stock: string;
  description: string;
  sizes: string;
  category: string;
  subCategoryId: string;
  tag: string;
  image: string;
  rating: string;
  colorHex: string;
  colorName: string;
  fabricType: string;
};

type TaxonomySubCategory = {
  id: string;
  name: string;
  slug: string;
};

type ProductTaxonomyType = {
  id: string;
  name: string;
  slug: string;
  subcategories: TaxonomySubCategory[];
};

type FilterOptionMeta = {
  id: string;
  value: string;
  displayLabel: string;
  colorHex?: string | null;
};

type FilterGroupMeta = {
  id: string;
  name: string;
  displayName: string;
  slug: string;
  filterType: string;
  filterOptions: FilterOptionMeta[];
};

type ProductTypeFilterMeta = {
  id: string;
  name: string;
  slug: string;
  filterGroups: FilterGroupMeta[];
};

type FilterApiOption = {
  id?: unknown;
  value?: unknown;
  displayLabel?: unknown;
  colorHex?: unknown;
};

type FilterApiGroup = {
  id?: unknown;
  name?: unknown;
  displayName?: unknown;
  slug?: unknown;
  filterType?: unknown;
  filterOptions?: FilterApiOption[];
};

type FilterApiProductType = {
  id?: unknown;
  name?: unknown;
  slug?: unknown;
  filterGroups?: FilterApiGroup[];
};

type EditableExistingImage = {
  id: string;
  imagePath: string;
  isPrimary: boolean;
};

type ImagePreviewItem = {
  key: string;
  file: File;
  url: string;
  relativePath: string;
};

const CATEGORY_OPTIONS = ['Bras', 'Panties', 'Briefs', 'Sets', 'Others'];

const normalizeSlug = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

const getCandidateTypeSlugs = (category: string) => {
  const base = normalizeSlug(category);
  if (!base) return [] as string[];
  if (base === 'briefs') return ['briefs', 'panties'];
  if (base === 'panties') return ['panties', 'briefs'];
  return [base];
};

const applyFilterSelect = (
  current: string[],
  group: FilterGroupMeta,
  nextOptionId: string,
) => {
  const isMultiSelect = group.filterType === 'multi' || group.slug === 'badges' || group.slug === 'tags';

  if (isMultiSelect) {
    return current.includes(nextOptionId)
      ? current.filter((id) => id !== nextOptionId)
      : [...current, nextOptionId];
  }

  const groupOptionIds = new Set(group.filterOptions.map((option) => option.id));
  const next = current.filter((id) => !groupOptionIds.has(id));
  if (nextOptionId) {
    next.push(nextOptionId);
  }
  return next;
};

function getImageUrl(pathOrUrl: string) {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  return `${IMAGE_BASE_URL}${pathOrUrl}`;
}

function formatRelativeTime(value: string | Date) {
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return 'N/A';
  const diffMinutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function stockStatus(stock: number) {
  if (stock <= 0) {
    return { label: 'Out of Stock', className: 'bg-red-100 text-red-600' };
  }
  if (stock < 5) {
    return { label: 'Low Stock', className: 'bg-amber-100 text-amber-600' };
  }
  return { label: 'In Stock', className: 'bg-emerald-100 text-emerald-600' };
}

export default function EditProductPageClient({
  productId,
  initialProduct,
  initialTaxonomy,
}: {
  productId: string;
  initialProduct: ProductDetail | null;
  initialTaxonomy: ProductTaxonomyType[];
}) {
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(initialProduct);
  const [isLoading, setIsLoading] = useState(!initialProduct);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'images' | 'inventory' | 'pricing' | 'seo'>('inventory');
  const [productTaxonomy, setProductTaxonomy] = useState<ProductTaxonomyType[]>(initialTaxonomy || []);
  const [filterMetadata, setFilterMetadata] = useState<ProductTypeFilterMeta[]>([]);
  const [selectedFilterOptionIds, setSelectedFilterOptionIds] = useState<string[]>(
    Array.isArray(initialProduct?.filters)
      ? initialProduct.filters
          .map((item) => String(item.filterOptionId || '').trim())
          .filter(Boolean)
      : [],
  );
  const [form, setForm] = useState<ProductFormState>({
    name: '',
    price: '',
    stock: '',
    description: '',
    sizes: '',
    category: 'Bras',
    subCategoryId: '',
    tag: '',
    image: '',
    rating: '',
    colorHex: '#9ca3af',
    colorName: 'Grey',
    fabricType: 'cotton',
  });
  const [editInventorySeed, setEditInventorySeed] = useState<Array<{ size: string; stock: string }>>(
    Array.isArray(initialProduct?.inventory)
      ? initialProduct.inventory.map((row) => ({ size: row.size, stock: String(row.stock) }))
      : [],
  );
  const [existingImages, setExistingImages] = useState<EditableExistingImage[]>(
    Array.isArray(initialProduct?.images) && initialProduct.images.length > 0
      ? initialProduct.images.map((image) => ({
          id: image.id,
          imagePath: image.image_path,
          isPrimary: Boolean(image.is_primary),
        }))
      : initialProduct?.image
        ? [{ id: '', imagePath: initialProduct.image, isPrimary: true }]
        : [],
  );
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [removedImagePaths, setRemovedImagePaths] = useState<string[]>([]);
  const [newImageItems, setNewImageItems] = useState<ImagePreviewItem[]>([]);
  const [primaryImagePreviewKey, setPrimaryImagePreviewKey] = useState('');

  useEffect(() => {
    if (!initialProduct) return;

    setForm({
      name: initialProduct.name || '',
      price: String(Number(initialProduct.price || 0)),
      stock: String(Number(initialProduct.stock || 0)),
      description: initialProduct.description || '',
      sizes: Array.isArray(initialProduct.sizes) ? initialProduct.sizes.join(', ') : '',
      category: initialProduct.category || 'Bras',
      subCategoryId: initialProduct.subCategory?.id || '',
      tag: initialProduct.colorName || '',
      image: initialProduct.image || '',
      rating: initialProduct.rating != null ? String(initialProduct.rating) : '',
      colorHex: initialProduct.colorHex || '#9ca3af',
      colorName: initialProduct.colorName || 'Grey',
      fabricType: initialProduct.fabricType || 'cotton',
    });
    setSelectedFilterOptionIds(
      Array.isArray(initialProduct.filters)
        ? initialProduct.filters
            .map((item) => String(item.filterOptionId || '').trim())
            .filter(Boolean)
        : [],
    );
  }, [initialProduct]);

  const { rows: inventoryRows, totalStock, updateRowStock } = useInventoryDraft({
    sizesValue: form.sizes,
    totalStockValue: form.stock,
    initialRows: editInventorySeed,
    resetKey: productId,
  });

  useEffect(() => {
    if (inventoryRows.length === 0) return;
    setForm((current) => {
      const nextStock = String(totalStock);
      return current.stock === nextStock ? current : { ...current, stock: nextStock };
    });
  }, [inventoryRows, totalStock]);

  const subcategoryOptions = useMemo(() => {
    const candidateSlugs = getCandidateTypeSlugs(form.category);
    const mapped = new Map<string, TaxonomySubCategory>();

    for (const type of productTaxonomy) {
      const normalizedTypeSlug = normalizeSlug(type.slug || type.name);
      if (!candidateSlugs.includes(normalizedTypeSlug)) continue;
      for (const subcategory of type.subcategories || []) {
        if (!mapped.has(subcategory.id)) mapped.set(subcategory.id, subcategory);
      }
    }

    return Array.from(mapped.values());
  }, [form.category, productTaxonomy]);

  const filterGroups = useMemo(() => {
    const candidateSlugs = getCandidateTypeSlugs(form.category);
    const groups = new Map<string, FilterGroupMeta>();

    for (const type of filterMetadata) {
      const typeSlug = normalizeSlug(type.slug || type.name);
      if (!candidateSlugs.includes(typeSlug)) continue;

      for (const group of type.filterGroups || []) {
        if (!groups.has(group.id)) {
          groups.set(group.id, group);
        }
      }
    }

    return Array.from(groups.values());
  }, [filterMetadata, form.category]);

  useEffect(() => {
    // Skip cleanup until filter metadata has loaded — otherwise the initial empty
    // filterGroups would wipe out the pre-selected IDs (e.g. "Limited Stock" badge).
    if (filterMetadata.length === 0) return;
    const allowed = new Set(filterGroups.flatMap((group) => group.filterOptions.map((option) => option.id)));
    setSelectedFilterOptionIds((current) => current.filter((id) => allowed.has(id)));
  }, [filterGroups, filterMetadata]);

  useEffect(() => {
    let isMounted = true;

    const loadFilterMetadata = async () => {
      try {
        const response = await fetch('/api/filters', { cache: 'no-store' });
        if (!response.ok) return;

        const payload = (await response.json()) as unknown;
        if (!isMounted) return;

        setFilterMetadata(
          Array.isArray(payload)
            ? (payload as FilterApiProductType[]).map((type) => ({
                id: String(type?.id || ''),
                name: String(type?.name || ''),
                slug: String(type?.slug || ''),
                filterGroups: Array.isArray(type?.filterGroups)
                  ? type.filterGroups.map((group) => ({
                      id: String(group?.id || ''),
                      name: String(group?.name || ''),
                      displayName: String(group?.displayName || ''),
                      slug: String(group?.slug || ''),
                      filterType: String(group?.filterType || ''),
                      filterOptions: Array.isArray(group?.filterOptions)
                        ? group.filterOptions.map((option) => ({
                            id: String(option?.id || ''),
                            value: String(option?.value || ''),
                            displayLabel: String(option?.displayLabel || ''),
                            colorHex: typeof option?.colorHex === 'string' ? option.colorHex : null,
                          }))
                        : [],
                    }))
                  : [],
              }))
            : [],
        );
      } catch {
        if (isMounted) {
          setFilterMetadata([]);
        }
      }
    };

    void loadFilterMetadata();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const [productResponse, taxonomyResponse] = await Promise.all([
          fetch(`/api/admin/products/${productId}`, { cache: 'no-store' }),
          fetch('/api/admin/product-taxonomy', { cache: 'no-store' }),
        ]);

        if (!productResponse.ok) {
          const payload = await productResponse.json().catch(() => ({}));
          throw new Error(payload?.error || 'Failed to load product');
        }

        const loadedProduct = (await productResponse.json()) as ProductDetail;
        const taxonomyPayload = taxonomyResponse.ok ? await taxonomyResponse.json() : [];

        if (!isMounted) return;

        setProduct(loadedProduct);
        setProductTaxonomy(Array.isArray(taxonomyPayload) ? taxonomyPayload : []);
        setForm({
          name: loadedProduct.name || '',
          price: String(Number(loadedProduct.price || 0)),
          stock: String(Number(loadedProduct.stock || 0)),
          description: loadedProduct.description || '',
          sizes: Array.isArray(loadedProduct.sizes) ? loadedProduct.sizes.join(', ') : '',
          category: loadedProduct.category || 'Bras',
          subCategoryId: loadedProduct.subCategory?.id || '',
          tag: loadedProduct.colorName || '',
          image: loadedProduct.image || '',
          rating: loadedProduct.rating != null ? String(loadedProduct.rating) : '',
          colorHex: loadedProduct.colorHex || '#9ca3af',
          colorName: loadedProduct.colorName || 'Grey',
          fabricType: loadedProduct.fabricType || 'cotton',
        });
        setSelectedFilterOptionIds(
          Array.isArray(loadedProduct.filters)
            ? loadedProduct.filters
                .map((item) => String(item.filterOptionId || '').trim())
                .filter(Boolean)
            : [],
        );
        setEditInventorySeed(
          Array.isArray(loadedProduct.inventory)
            ? loadedProduct.inventory.map((row) => ({ size: row.size, stock: String(row.stock) }))
            : [],
        );

        const normalizedImages = Array.isArray(loadedProduct.images) && loadedProduct.images.length > 0
          ? loadedProduct.images.map((image) => ({
              id: image.id,
              imagePath: image.image_path,
              isPrimary: Boolean(image.is_primary),
            }))
          : loadedProduct.image
            ? [{ id: '', imagePath: loadedProduct.image, isPrimary: true }]
            : [];

        setExistingImages(normalizedImages);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load product');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void load();

    return () => {
      isMounted = false;
      setNewImageItems((current) => {
        current.forEach((item) => URL.revokeObjectURL(item.url));
        return current;
      });
    };
  }, [productId]);

  const appendNewImages = (files: FileList | null) => {
    if (!files?.length) return;

    const imageFiles = Array.from(files).filter(
      (file) => file.size > 0 && String(file.type || '').toLowerCase().startsWith('image/')
    );
    if (!imageFiles.length) return;

    setNewImageItems((current) => {
      const existing = new Set(current.map((item) => item.key));
      const incoming = imageFiles
        .map((file) => ({
          key: `${file.name}-${file.size}-${file.lastModified}`,
          file,
          relativePath: file.name,
        }))
        .filter((item) => !existing.has(item.key))
        .map((item) => ({
          ...item,
          url: URL.createObjectURL(item.file),
        }));

      const next = [...current, ...incoming];
      setPrimaryImagePreviewKey((currentKey) => (currentKey && next.some((item) => item.key === currentKey) ? currentKey : next[0]?.key || ''));
      return next;
    });
  };

  const uploadImagesForProductId = async (id: string, files: File[]) => {
    const validImageFiles = files.filter(
      (file) => file.size > 0 && String(file.type || '').toLowerCase().startsWith('image/')
    );

    if (!validImageFiles.length) return [] as string[];

    const formData = new FormData();
    formData.append('productId', String(id).trim());

    validImageFiles.forEach((file) => {
      formData.append('files', file);
      formData.append('paths', file.name);
    });

    const response = await fetch('/api/admin/images/upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result?.error || 'Image upload failed');
    }

    return Array.isArray(result?.uploadedPaths) ? result.uploadedPaths : [];
  };

  const handleRemoveExistingImage = (image: EditableExistingImage) => {
    setExistingImages((current) => {
      const next = current.filter((item) => item.imagePath !== image.imagePath);
      setForm((previous) => ({
        ...previous,
        image: previous.image === image.imagePath ? next[0]?.imagePath || '' : previous.image,
      }));
      return next;
    });

    if (image.id) {
      setRemovedImageIds((current) => (current.includes(image.id) ? current : [...current, image.id]));
    }
    if (image.imagePath) {
      setRemovedImagePaths((current) => (current.includes(image.imagePath) ? current : [...current, image.imagePath]));
    }
  };

  const handleSave = async () => {
    if (!product) return;

    try {
      setIsSaving(true);
      setErrorMessage('');

      const uploadedPaths = await uploadImagesForProductId(product.id, newImageItems.map((item) => item.file));
      const selectedPrimaryIndex = newImageItems.findIndex((item) => item.key === primaryImagePreviewKey);
      const selectedUploadedPrimary = selectedPrimaryIndex >= 0 ? uploadedPaths[selectedPrimaryIndex] : '';
      const removedPaths = new Set(removedImagePaths);
      const currentPrimaryPath = form.image.trim();
      const primaryWasRemoved = Boolean(currentPrimaryPath && removedPaths.has(currentPrimaryPath));
      const fallbackPrimaryFromExisting = existingImages.find((image) => image.isPrimary && !removedPaths.has(image.imagePath))?.imagePath;
      const fallbackPathFromExisting = existingImages.find((image) => !removedPaths.has(image.imagePath))?.imagePath;

      const resolvedPrimaryImage =
        selectedUploadedPrimary ||
        (!primaryWasRemoved && currentPrimaryPath) ||
        uploadedPaths[0] ||
        fallbackPrimaryFromExisting ||
        fallbackPathFromExisting ||
        null;

      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        stock: Number(form.stock),
        description: form.description.trim(),
        sizes: form.sizes.split(',').map((size) => size.trim()).filter(Boolean),
        category: form.category.trim(),
        subCategoryId: form.subCategoryId || null,
        subCategoryName: subcategoryOptions.find((option) => option.id === form.subCategoryId)?.name || null,
        tag: form.tag.trim(),
        image: resolvedPrimaryImage,
        primaryImagePath: resolvedPrimaryImage,
        rating: form.rating ? Number(form.rating) : null,
        filterOptionIds: selectedFilterOptionIds,
        imagePaths: uploadedPaths.length ? uploadedPaths : undefined,
        removeImageIds: removedImageIds,
        removeImagePaths: removedImagePaths,
        colorHex: form.colorHex.trim() || '#000000',
        colorName: form.colorName.trim() || 'Unspecified',
        fabricType: form.fabricType.trim() || 'cotton',
        inventory: toInventoryPayload(inventoryRows),
      };

      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || 'Failed to update product');
      }

      router.push('/Admin/ProductDashboard');
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update product');
    } finally {
      setIsSaving(false);
    }
  };

  const inventorySummary = useMemo(() => {
    return inventoryRows.map((row, index) => {
      const existing = product?.inventory?.find((item) => item.size === row.size);
      const availableStock = Number(row.stock || 0);
      const reservedStock = Number(existing?.reservedStock || 0);
      const totalVariantStock = availableStock + reservedStock;
      const status = stockStatus(availableStock);
      const colorLabel = form.colorName || 'Grey';
      const sku = `${product?.id || 'PRD'}-${row.size}-${colorLabel.slice(0, 3).toUpperCase()}`;

      return {
        key: `${row.size}-${index}`,
        size: row.size,
        colorLabel,
        sku,
        availableStock,
        reservedStock,
        totalVariantStock,
        updatedAt: existing?.updatedAt || product?.createdAt || '',
        status,
      };
    });
  }, [form.colorName, inventoryRows, product]);

  const topImage = useMemo(() => {
    const primaryExisting = existingImages.find((image) => image.isPrimary)?.imagePath;
    return getImageUrl(form.image || primaryExisting || product?.image || '');
  }, [existingImages, form.image, product?.image]);

  const tabButtonClass = (tab: typeof activeTab) =>
    `inline-flex items-center gap-1.5 border-b-2 px-2 py-2 text-xs font-semibold sm:gap-2 sm:px-3 sm:py-3 sm:text-sm ${
      activeTab === tab
        ? 'border-[#8a0f5c] text-[#8a0f5c]'
        : 'border-transparent text-neutral-500 hover:text-neutral-700'
    }`;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="h-4 w-32 rounded bg-white/60" />
            <div className="mt-3 h-10 w-56 rounded bg-white/70" />
          </div>
          <div className="h-10 w-40 rounded-xl bg-white/70" />
        </div>
        <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="h-28 w-28 rounded-2xl bg-neutral-100" />
            <div className="flex-1 space-y-3">
              <div className="h-8 w-72 rounded bg-neutral-100" />
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="h-14 rounded-xl bg-neutral-100" />
                <div className="h-14 rounded-xl bg-neutral-100" />
                <div className="h-14 rounded-xl bg-neutral-100" />
                <div className="h-14 rounded-xl bg-neutral-100" />
              </div>
            </div>
          </div>
          <div className="mt-5 h-12 rounded-xl bg-neutral-100" />
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="space-y-4 rounded-2xl border border-neutral-200 p-4">
              <div className="h-12 rounded-xl bg-neutral-100" />
              <div className="h-12 rounded-xl bg-neutral-100" />
              <div className="h-36 rounded-xl bg-neutral-100" />
            </div>
            <div className="space-y-4 rounded-2xl border border-neutral-200 p-4">
              <div className="h-12 rounded-xl bg-neutral-100" />
              <div className="h-12 rounded-xl bg-neutral-100" />
              <div className="h-12 rounded-xl bg-neutral-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-xs font-semibold text-red-700 shadow-sm sm:rounded-3xl sm:p-10 sm:text-sm">{errorMessage || 'Product not found.'}</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-xs font-semibold text-neutral-400">Products &gt; Edit Product</p>
          <h1 className="mt-1 text-2xl font-black text-[#840d5c]">Edit Product</h1>
        </div>
        <button
          type="button"
          onClick={() => router.push('/Admin/ProductDashboard')}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 sm:px-4 sm:text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Products</span>
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{errorMessage}</div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-5">
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center">
          <img src={topImage} alt={product.name} className="h-20 w-20 rounded-2xl border border-neutral-200 object-cover sm:h-28 sm:w-28" />
          <div className="flex-1">
            <h2 className="text-lg font-black text-[#2a1031] sm:text-2xl">{form.name}</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xs font-semibold text-neutral-400">SKU</p>
                <div className="mt-1 rounded-lg bg-[#f6ecf4] px-2 py-1.5 text-xs font-bold text-[#5e2b4a] sm:px-3 sm:py-2 sm:text-sm">{product.id}</div>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-400">Status</p>
                <div className="mt-1 w-full rounded-lg bg-emerald-100 px-2 py-1.5 text-center text-xs font-bold text-emerald-700 sm:px-3 sm:py-2 sm:text-sm">{product.isDeleted || !product.isActive ? 'Inactive' : 'Active'}</div>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-400">Category</p>
                <div className="mt-1 rounded-lg bg-[#f6ecf4] px-2 py-1.5 text-xs font-semibold text-[#5e2b4a] sm:px-3 sm:py-2 sm:text-sm">{form.category}</div>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-400">Fabric</p>
                <div className="mt-1 rounded-lg bg-[#f6ecf4] px-2 py-1.5 text-xs font-semibold text-[#5e2b4a] sm:px-3 sm:py-2 sm:text-sm">{form.fabricType}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 border-b border-neutral-200 sm:mt-5">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" aria-label="General" className={tabButtonClass('general')} onClick={() => setActiveTab('general')}><Info className="h-4 w-4" /><span className="hidden sm:inline">General</span></button>
            <button type="button" aria-label="Images" className={tabButtonClass('images')} onClick={() => setActiveTab('images')}><Images className="h-4 w-4" /><span className="hidden sm:inline">Images</span></button>
            <button type="button" aria-label="Inventory" className={tabButtonClass('inventory')} onClick={() => setActiveTab('inventory')}><Boxes className="h-4 w-4" /><span className="hidden sm:inline">Inventory</span></button>
            <button type="button" aria-label="Pricing" className={tabButtonClass('pricing')} onClick={() => setActiveTab('pricing')}><CircleDollarSign className="h-4 w-4" /><span className="hidden sm:inline">Pricing</span></button>
            <button type="button" aria-label="SEO" className={tabButtonClass('seo')} onClick={() => setActiveTab('seo')}><Sparkles className="h-4 w-4" /><span className="hidden sm:inline">SEO</span></button>
          </div>
        </div>

        <div className="mt-4 space-y-4 sm:mt-6 sm:space-y-6">
          {activeTab === 'general' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-4 rounded-2xl border border-neutral-200 p-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-500">Product name</label>
                  <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-[#8a0f5c]" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-500">Category</label>
                    <select value={form.category} onChange={(e) => setForm((current) => ({ ...current, category: e.target.value, subCategoryId: '' }))} className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-[#8a0f5c]">
                      {CATEGORY_OPTIONS.map((category) => <option key={category}>{category}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-500">Subcategory</label>
                    <select value={form.subCategoryId} onChange={(e) => setForm((current) => ({ ...current, subCategoryId: e.target.value }))} className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-[#8a0f5c]">
                      <option value="">Select subcategory</option>
                      {subcategoryOptions.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-500">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} className="min-h-36 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-[#8a0f5c]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-500">Dynamic filters</label>
                  {filterGroups.length > 0 ? (
                    <div className="grid gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                      {filterGroups.map((group) => (
                        <div key={group.id}>
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#8a0f5c]">{group.displayName || group.name}</p>
                          <div className="flex flex-wrap gap-2">
                            {group.filterOptions.map((option) => {
                              const isSelected = selectedFilterOptionIds.includes(option.id);

                              return (
                                <button
                                  type="button"
                                  key={option.id}
                                  onClick={() => {
                                    setSelectedFilterOptionIds((current) => applyFilterSelect(current, group, option.id));
                                  }}
                                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    isSelected
                                      ? 'border-[#8a0f5c] bg-[#8a0f5c] text-white'
                                      : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100'
                                  }`}
                                >
                                  {option.displayLabel}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
                      No dynamic filters configured for this category.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-neutral-200 p-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-500">Sizes</label>
                  <input value={form.sizes} onChange={(e) => setForm((current) => ({ ...current, sizes: e.target.value }))} className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-[#8a0f5c]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-500">Fabric</label>
                  <input value={form.fabricType} onChange={(e) => setForm((current) => ({ ...current, fabricType: e.target.value }))} className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-[#8a0f5c]" />
                </div>
                <div className="grid gap-4 sm:grid-cols-[1fr_1fr_120px]">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-500">Color name</label>
                    <input value={form.colorName} onChange={(e) => setForm((current) => ({ ...current, colorName: e.target.value }))} className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-[#8a0f5c]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-500">Color hex</label>
                    <input value={form.colorHex} onChange={(e) => setForm((current) => ({ ...current, colorHex: e.target.value }))} className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-[#8a0f5c]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-500">Preview</label>
                    <div className="flex h-10.5 items-center justify-center rounded-xl border border-neutral-300" style={{ backgroundColor: form.colorHex }}>
                      <span className="text-[10px] font-bold text-white mix-blend-difference">{form.colorHex}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'images' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-neutral-200 p-4">
                <p className="text-sm font-bold text-[#2a1031]">Existing Images</p>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                  {existingImages.length > 0 ? existingImages.map((image) => (
                    <div key={`${image.id}-${image.imagePath}`} className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
                      <img src={getImageUrl(image.imagePath)} alt="Product" className="h-28 w-full object-cover" />
                      <div className="space-y-2 p-2">
                        <p className="truncate text-[10px] text-neutral-500" title={image.imagePath}>{image.imagePath}</p>
                        {image.isPrimary ? (
                          <div className="rounded-lg bg-[#f6ecf4] px-2 py-1 text-center text-[10px] font-semibold text-[#8a0f5c]">Primary</div>
                        ) : (
                          <button type="button" onClick={() => {
                            setForm((current) => ({ ...current, image: image.imagePath }));
                            setExistingImages((current) => current.map((item) => ({ ...item, isPrimary: item.imagePath === image.imagePath })));
                            setPrimaryImagePreviewKey('');
                          }} className="w-full rounded-lg border border-neutral-300 px-2 py-1 text-[10px] font-semibold text-neutral-600 hover:bg-white">Set Primary</button>
                        )}
                        <button type="button" onClick={() => handleRemoveExistingImage(image)} className="w-full rounded-lg border border-red-200 px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-50">Remove</button>
                      </div>
                    </div>
                  )) : <p className="col-span-full text-sm text-neutral-500">No linked images found.</p>}
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#2a1031]">Upload New Images</p>
                    <p className="text-xs text-neutral-500">Add replacement or additional images for this product.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#8a0f5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6e0d49]">
                    <Plus className="h-4 w-4" /> Add Images
                    <input type="file" multiple accept="image/*" className="hidden" onChange={(event) => { appendNewImages(event.target.files); event.currentTarget.value = ''; }} />
                  </label>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                  {newImageItems.length > 0 ? newImageItems.map((item) => (
                    <div key={item.key} className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
                      <img src={item.url} alt={item.file.name} className="h-28 w-full object-cover" />
                      <div className="space-y-2 p-2">
                        <p className="truncate text-[10px] text-neutral-500" title={item.relativePath}>{item.relativePath}</p>
                        {primaryImagePreviewKey === item.key ? (
                          <div className="rounded-lg bg-[#f6ecf4] px-2 py-1 text-center text-[10px] font-semibold text-[#8a0f5c]">Primary</div>
                        ) : (
                          <button type="button" onClick={() => setPrimaryImagePreviewKey(item.key)} className="w-full rounded-lg border border-neutral-300 px-2 py-1 text-[10px] font-semibold text-neutral-600 hover:bg-white">Set Primary</button>
                        )}
                        <button type="button" onClick={() => setNewImageItems((current) => {
                          const next = current.filter((candidate) => candidate.key !== item.key);
                          URL.revokeObjectURL(item.url);
                          setPrimaryImagePreviewKey((currentKey) => currentKey === item.key ? next[0]?.key || '' : currentKey);
                          return next;
                        })} className="w-full rounded-lg border border-neutral-300 px-2 py-1 text-[10px] font-semibold text-neutral-500 hover:bg-white">Remove</button>
                      </div>
                    </div>
                  )) : <p className="col-span-full text-sm text-neutral-500">No new images selected.</p>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#2a1031] sm:text-lg">Inventory (Size & Color Variants)</h3>
                  <p className="text-xs text-neutral-500 sm:text-sm">Manage stock for all size and color combinations.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input value="" readOnly placeholder="Search size or SKU..." className="w-40 rounded-xl border border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs text-neutral-400 outline-none sm:w-56 sm:text-sm" />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-neutral-200">
                <table className="w-full min-w-225 text-left text-sm">
                  <thead className="bg-white text-neutral-400">
                    <tr className="border-b border-neutral-200">
                      <th className="px-4 py-3 font-semibold">Size</th>
                      <th className="px-4 py-3 font-semibold">Color</th>
                      <th className="px-4 py-3 font-semibold">SKU</th>
                      <th className="px-4 py-3 font-semibold">Available Stock</th>
                      <th className="px-4 py-3 font-semibold">Reserved</th>
                      <th className="px-4 py-3 font-semibold">Total Stock</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 bg-white">
                    {inventorySummary.map((row) => (
                      <tr key={row.key}>
                        <td className="px-4 py-4 font-semibold text-neutral-700">{row.size}</td>
                        <td className="px-4 py-4 text-neutral-500">
                          <div className="flex items-center gap-2">
                            <Circle className="h-3 w-3 fill-current" style={{ color: form.colorHex }} />
                            {row.colorLabel}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs font-semibold text-neutral-500">{row.sku}</td>
                        <td className="px-4 py-4">
                          <input type="number" min="0" value={String(row.availableStock)} onChange={(e) => updateRowStock(row.size, e.target.value)} className="w-24 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-emerald-600 outline-none focus:border-[#8a0f5c]" />
                        </td>
                        <td className="px-4 py-4 text-neutral-600">{row.reservedStock}</td>
                        <td className="px-4 py-4 text-neutral-700">{row.totalVariantStock}</td>
                        <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.status.className}`}>{row.status.label}</span></td>
                        <td className="px-4 py-4 text-neutral-500">{formatRelativeTime(row.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-neutral-200 p-4">
                <label className="mb-1 block text-xs font-semibold text-neutral-500">Price</label>
                <input type="number" value={form.price} onChange={(e) => setForm((current) => ({ ...current, price: e.target.value }))} className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-[#8a0f5c]" />
              </div>
              <div className="rounded-2xl border border-neutral-200 p-4">
                <label className="mb-1 block text-xs font-semibold text-neutral-500">Rating</label>
                <input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(e) => setForm((current) => ({ ...current, rating: e.target.value }))} className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-[#8a0f5c]" />
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-neutral-200 p-4">
                <label className="mb-1 block text-xs font-semibold text-neutral-500">Product ID</label>
                <input readOnly value={product.id} className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-500 outline-none" />
              </div>
              <div className="rounded-2xl border border-neutral-200 p-4">
                <label className="mb-1 block text-xs font-semibold text-neutral-500">Created At</label>
                <input readOnly value={new Date(product.createdAt).toLocaleString()} className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-500 outline-none" />
              </div>
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-500 lg:col-span-2">
                SEO-specific fields are not currently persisted by the admin product API. This page keeps the section visible so the full-page editor matches the intended admin information architecture.
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 sm:gap-3">
        <button type="button" onClick={() => router.push('/Admin/ProductDashboard')} className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 sm:px-5 sm:py-3 sm:text-sm">Cancel</button>
        <button type="button" onClick={handleSave} disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-[#8a0f5c] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#6e0d49] disabled:cursor-not-allowed disabled:opacity-60 sm:px-5 sm:py-3 sm:text-sm">
          <ShieldCheck className="h-4 w-4" />
          {isSaving ? 'Saving Changes...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}