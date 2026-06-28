'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search,
  Filter,
  Sliders,
  Download,
  Upload,
  Trash2,
  RotateCcw,
  Plus,
  X,
  MoreVertical,
  Package,
  AlertCircle,
  CircleX,
  FileText,
  ChevronLeft,
  ChevronRight,
  Tag,
  Boxes,
  ShieldCheck,
  CalendarDays,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { IMAGE_BASE_URL } from '@/public/constants/constants';
import { useStore } from '@/store/useStore';
import { InventoryDraftRow, toInventoryPayload, useInventoryDraft } from './useInventoryDraft';

// --- Interfaces ---
interface ProductInventoryRow {
  id: string;
  size: string;
  stock: number;
  reservedStock: number;
  createdAt: string;
  updatedAt: string;
}

interface ProductDetail {
  id: string;
  sku: string;
  name: string;
  color: string;
  category: string;
  productTypeId?: string;
  subCategoryId?: string;
  subCategoryName?: string;
  price: number;
  stock: number;
  salesVelocity: string;
  image: string;
  description: string;
  sizes: string[];
  rating: number | null;
  createdAt: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: string | null;
  images: { id: string; image_path: string; is_primary: boolean | null }[];
  filters: ProductFilterAssignment[];
  colorHex: string;
  colorName: string;
  fabricType: string;
  inventory: ProductInventoryRow[];
}

interface ProductFilterAssignment {
  id: string;
  filterOptionId: string;
  filterOption?: {
    id: string;
    value: string;
    displayLabel: string;
    filterGroup?: {
      id: string;
      name: string;
      displayName: string;
      slug: string;
    };
  };
}

interface DbProduct {
  id: string;
  name: string;
  category: string;
  productType?: { id: string; name: string; slug: string } | null;
  subCategory?: { id: string; name: string; slug: string } | null;
  price: number | string;
  stock: number;
  image: string;
  description: string;
  sizes: string[];
  createdAt: string;
  isActive?: boolean;
  isDeleted?: boolean;
  deletedAt?: string | null;
  rating?: number | null;
  tag?: string | null;
  reviews?: { rating: number }[];
  images?: { id: string; image_path: string; is_primary: boolean | null }[];
  filters?: ProductFilterAssignment[];
  colorHex?: string | null;
  colorName?: string | null;
  fabricType?: string | null;
  inventory?: ProductInventoryRow[];
}

interface FilterOptionMeta {
  id: string;
  value: string;
  displayLabel: string;
  colorHex?: string | null;
}

interface FilterGroupMeta {
  id: string;
  name: string;
  displayName: string;
  slug: string;
  filterType: string;
  filterOptions: FilterOptionMeta[];
}

interface ProductTypeFilterMeta {
  id: string;
  name: string;
  slug: string;
  filterGroups: FilterGroupMeta[];
}

interface ProductFormState {
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
}

interface TaxonomySubCategory {
  id: string;
  name: string;
  slug: string;
}

interface ProductTaxonomyType {
  id: string;
  name: string;
  slug: string;
  subcategories: TaxonomySubCategory[];
}

interface DeleteModalState {
  isOpen: boolean;
  mode: 'single' | 'bulk';
  productId: string | null;
  count: number;
}

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
}

interface ImportResult {
  createdCount: number;
  failedCount: number;
  errors?: string[];
}

interface ImportImagePreviewItem {
  key: string;
  file: File;
  url: string;
  relativePath: string;
}

interface EditableExistingImage {
  id: string;
  imagePath: string;
  isPrimary: boolean;
}


interface DBFilterOption {
  id: string;
  value: string;
  displayLabel: string;
}
interface DBFilterGroup {
  id: string;
  productTypeId: string;
  name: string;
  displayName: string;
  slug: string;
  filterOptions: DBFilterOption[];
}
const IMPORT_TEMPLATE_HEADERS = [
  'id',
  'name',
  'price',
  'description',
  'image',
  'category',
  'stock',
  'createdAt',
  'tag',
  'rating',
  'sizes',
];

const STOCK_THRESHOLD = 20;

const getProductStatus = (product: ProductDetail) => {
  if (product.isDeleted) {
    return {
      label: 'Deleted',
      className: 'bg-red-100 text-red-700 border-red-200',
    };
  }

  if (!product.isActive) {
    return {
      label: 'Inactive',
      className: 'bg-amber-100 text-amber-700 border-amber-200',
    };
  }

  return {
    label: 'Active',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
};

const CATEGORY_OPTIONS = ['Bras', 'Panties', 'Briefs', 'Sets', 'Others'];
const REQUIRED_PRODUCT_BADGE_LABELS = ['Few Left', 'New Arrival', 'Best Seller', 'Limited Stock'];
const BADGE_GROUP_SLUGS = new Set(['tags', 'badges', 'product-filter']);

const parseSku = (value: string) => {
  const normalized = String(value || '').trim();
  if (!normalized) return null;

  if (/^\d+$/.test(normalized)) {
    const numeric = Number.parseInt(normalized, 10);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }

  return null;
};

const normalizeSkuNumber = (value: number) => {
  if (value < 200000) {
    return 200000 + value;
  }

  return value;
};

const extractDigits = (value: string) => {
  const matched = String(value || '').match(/\d+/g);
  return matched ? matched.join('') : '';
};

const getProductSku = (product: DbProduct, fallbackIndex: number) => {
  const primaryPath = product.images?.find((img) => img.is_primary)?.image_path || product.image || '';
  const folderName = primaryPath.split('/')[0] || '';
  const parsedFromPath = parseSku(extractDigits(folderName));

  if (parsedFromPath) {
    return String(normalizeSkuNumber(parsedFromPath));
  }

  const parsedFromId = parseSku(extractDigits(product.id));
  if (parsedFromId) {
    return String(normalizeSkuNumber(parsedFromId));
  }

  return String(200001 + fallbackIndex);
};

const normalizeSlug = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

const normalizeLabel = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const getCandidateTypeSlugs = (category: string) => {
  const base = normalizeSlug(category);
  if (!base) return [] as string[];

  if (base === 'briefs') return ['briefs', 'panties'];
  if (base === 'panties') return ['panties', 'briefs'];

  return [base];
};

const applySingleSelect = (
  current: string[],
  group: FilterGroupMeta,
  nextOptionId: string
) => {
  const groupOptionIds = new Set(group.filterOptions.map((option) => option.id));
  const next = current.filter((id) => !groupOptionIds.has(id));
  if (nextOptionId) {
    next.push(nextOptionId);
  }
  return next;
};

const applyFilterSelect = (
  current: string[],
  group: FilterGroupMeta,
  nextOptionId: string
) => {
  // If group is explicit multi-select or is labeled as badges/tags/status
  const isMultiSelect = 
    group.filterType === 'multi' || 
    group.slug === 'badges' || 
    group.slug === 'tags';

  if (isMultiSelect) {
    // Standard Toggle Behavior (Add if missing, remove if present)
    if (current.includes(nextOptionId)) {
      return current.filter((id) => id !== nextOptionId);
    } else {
      return [...current, nextOptionId];
    }
  }

  // Fallback to Single Select behavior for other standard filter dimensions
  const groupOptionIds = new Set(group.filterOptions.map((option) => option.id));
  const next = current.filter((id) => !groupOptionIds.has(id));
  if (nextOptionId) {
    next.push(nextOptionId);
  }
  return next;
};

export default function ProductManagementDashboard() {
  const refreshProducts = useStore((state) => state.refreshProducts);
  const [productDetails, setProductDetails] = useState<ProductDetail[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeStyle, setActiveStyle] = useState('All');
  const [stockLevel, setStockLevel] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState(1500);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [productImages, setProductImages] = useState<File[]>([]);
  const [nextSku, setNextSku] = useState('200001');
  const [newProductDetail, setNewProductDetail] = useState<ProductFormState>({
    name: '',
    price: '',
    stock: '',
    description: '',
    sizes: '',
    category: 'Bras',
    subCategoryId: '',
    tag: 'Black',
    image: '',
    rating: '',
    colorHex: '#000000',
    colorName: 'Black',
    fabricType: 'cotton',
  });
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isFolderDragActive, setIsFolderDragActive] = useState(false);
  const [isAddFolderDragActive, setIsAddFolderDragActive] = useState(false);
  const [isEditFolderDragActive, setIsEditFolderDragActive] = useState(false);
  const [hasDownloadedImportTemplate, setHasDownloadedImportTemplate] = useState(false);
  const [importExcelFile, setImportExcelFile] = useState<File | null>(null);
  const [importImageFiles, setImportImageFiles] = useState<File[]>([]);
  const [importImagePreviewItems, setImportImagePreviewItems] = useState<ImportImagePreviewItem[]>([]);
  const [addProductImagePreviewItems, setAddProductImagePreviewItems] = useState<ImportImagePreviewItem[]>([]);
  const [addPrimaryImagePreviewKey, setAddPrimaryImagePreviewKey] = useState('');
  const [editProductImagePreviewItems, setEditProductImagePreviewItems] = useState<ImportImagePreviewItem[]>([]);
  const [editPrimaryImagePreviewKey, setEditPrimaryImagePreviewKey] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [editingProductId, setEditingProductId] = useState('');
  const [editingProductSku, setEditingProductSku] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isApiCallInProgress, setIsApiCallInProgress] = useState(false);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: 'Confirm Action',
    message: '',
    confirmLabel: 'Confirm',
  });
  const [isConfirmModalProcessing, setIsConfirmModalProcessing] = useState(false);
  const apiCallLockRef = useRef(false);
  const confirmModalActionRef = useRef<null | (() => void | Promise<void>)>(null);
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    mode: 'single',
    productId: null,
    count: 0,
  });
  const [editProductDetail, setEditProductDetail] = useState<ProductFormState>({
    name: '',
    price: '',
    stock: '',
    description: '',
    sizes: '',
    category: 'Bras',
    subCategoryId: '',
    tag: 'Black',
    image: '',
    rating: '',
    colorHex: '#000000',
    colorName: 'Black',
    fabricType: 'cotton',
  });
  const [editProductImages, setEditProductImages] = useState<File[]>([]);
  const [editExistingImages, setEditExistingImages] = useState<EditableExistingImage[]>([]);
  const [removedEditImageIds, setRemovedEditImageIds] = useState<string[]>([]);
  const [removedEditImagePaths, setRemovedEditImagePaths] = useState<string[]>([]);
  const [filterMetadata, setFilterMetadata] = useState<ProductTypeFilterMeta[]>([]);
  const [productTaxonomy, setProductTaxonomy] = useState<ProductTaxonomyType[]>([]);
  const [newFilterOptionIds, setNewFilterOptionIds] = useState<string[]>([]);
  const [editFilterOptionIds, setEditFilterOptionIds] = useState<string[]>([]);
  const [dbFilterGroups, setDbFilterGroups] = useState<DBFilterGroup[]>([]);
  const [editInventorySeed, setEditInventorySeed] = useState<InventoryDraftRow[]>([]);
  const [activeActionMenuProductId, setActiveActionMenuProductId] = useState<string | null>(null);
  const [viewingProduct, setViewingProduct] = useState<ProductDetail | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);

  const {
    rows: newInventoryRows,
    totalStock: newInventoryTotal,
    updateRowStock: updateNewInventoryStock,
  } = useInventoryDraft({
    sizesValue: newProductDetail.sizes,
    totalStockValue: newProductDetail.stock,
    resetKey: `new:${isAddModalOpen ? 'open' : 'closed'}`,
  });

  const {
    rows: editInventoryRows,
    totalStock: editInventoryTotal,
    updateRowStock: updateEditInventoryStock,
  } = useInventoryDraft({
    sizesValue: editProductDetail.sizes,
    totalStockValue: editProductDetail.stock,
    initialRows: editInventorySeed,
    resetKey: editingProductId,
  });


  const addFilterGroupsMemo = useMemo(() => {
    // If no category/productTypeId is selected yet, show all groups; otherwise match them
    if (!newProductDetail.category) return dbFilterGroups;
    return dbFilterGroups.filter(
      (g) => g.productTypeId === newProductDetail.category || g.slug === 'tags'
    );
  }, [dbFilterGroups, newProductDetail.category]);

  const editFilterGroupsMemo = useMemo(() => {
    if (!editProductDetail.category) return dbFilterGroups;
    return dbFilterGroups.filter(
      (g) => g.productTypeId === editProductDetail.category || g.slug === 'tags'
    );
  }, [dbFilterGroups, editProductDetail.category]);

  useEffect(() => {
    if (newInventoryRows.length === 0) return;

    setNewProductDetail((current) => {
      const nextStock = String(newInventoryTotal);
      return current.stock === nextStock ? current : { ...current, stock: nextStock };
    });
  }, [newInventoryRows, newInventoryTotal]);

  useEffect(() => {
    if (editInventoryRows.length === 0) return;

    setEditProductDetail((current) => {
      const nextStock = String(editInventoryTotal);
      return current.stock === nextStock ? current : { ...current, stock: nextStock };
    });
  }, [editInventoryRows, editInventoryTotal]);

  useEffect(() => {
    const handleDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-row-action-root="true"]')) return;
      setActiveActionMenuProductId(null);
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setActiveActionMenuProductId(null);
      setViewingProduct(null);
    };

    document.addEventListener('mousedown', handleDocumentMouseDown);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  useEffect(() => {
    setPreviewImageIndex(0);
  }, [viewingProduct?.id]);

  const viewingProductImages = useMemo(() => {
    if (!viewingProduct) return [] as string[];

    const images = [
      viewingProduct.image,
      ...(viewingProduct.images || []).map((item) => item.image_path),
    ]
      .map((item) => getImageUrl(item))
      .filter(Boolean);

    return Array.from(new Set(images));
  }, [viewingProduct]);


  const getFilterGroupsForCategory = useCallback(
    (category: string) => {
      const candidateSlugs = getCandidateTypeSlugs(category);
      const groupMap = new Map<string, FilterGroupMeta>();
      const requiredBadgeLabels = new Set(REQUIRED_PRODUCT_BADGE_LABELS.map(normalizeLabel));
      const badgeOptionsFromAllTypes = new Map<string, FilterOptionMeta>();

      for (const type of filterMetadata) {
        const typeSlug = normalizeSlug(type.slug || type.name);

        for (const group of type.filterGroups || []) {
          const groupSlug = normalizeSlug(group.slug || '');
          const groupName = normalizeLabel(group.displayName || group.name || '');
          const isBadgeGroup =
            BADGE_GROUP_SLUGS.has(groupSlug) ||
            groupName.includes('badge') ||
            groupName.includes('tag') ||
            groupName.includes('product filter');

          if (!isBadgeGroup) continue;

          for (const option of group.filterOptions || []) {
            const optionLabel = String(option.displayLabel || option.value || '').trim();
            const normalizedOptionLabel = normalizeLabel(optionLabel);
            if (!requiredBadgeLabels.has(normalizedOptionLabel)) continue;

            if (!badgeOptionsFromAllTypes.has(normalizedOptionLabel)) {
              badgeOptionsFromAllTypes.set(normalizedOptionLabel, {
                id: option.id,
                value: option.value,
                displayLabel: optionLabel,
                colorHex: option.colorHex ?? null,
              });
            }
          }
        }

        if (!candidateSlugs.includes(typeSlug)) continue;

        for (const group of type.filterGroups || []) {
          if (!groupMap.has(group.id)) {
            groupMap.set(group.id, group);
          }
        }
      }

      const groups = Array.from(groupMap.values());
      const existingBadgeGroup = groups.find((group) => BADGE_GROUP_SLUGS.has(normalizeSlug(group.slug || '')));
      const targetBadgeGroup: FilterGroupMeta = existingBadgeGroup || {
        id: 'global-product-badges',
        name: 'Product Badges',
        displayName: 'Product Badges',
        slug: 'tags',
        filterType: 'multi',
        filterOptions: [],
      };

      const existingBadgeOptionLabels = new Set(
        (targetBadgeGroup.filterOptions || []).map((option) => normalizeLabel(option.displayLabel || option.value || ''))
      );

      for (const requiredLabel of REQUIRED_PRODUCT_BADGE_LABELS) {
        const normalizedRequiredLabel = normalizeLabel(requiredLabel);
        if (existingBadgeOptionLabels.has(normalizedRequiredLabel)) continue;

        const sourceOption = badgeOptionsFromAllTypes.get(normalizedRequiredLabel);
        targetBadgeGroup.filterOptions.push(
          sourceOption || {
            id: `global-product-badge-${normalizeSlug(requiredLabel)}`,
            value: normalizeSlug(requiredLabel),
            displayLabel: requiredLabel,
            colorHex: null,
          }
        );
      }

      if (!existingBadgeGroup) {
        groups.push(targetBadgeGroup);
      }

      return groups;
    },
    [filterMetadata]
  );

  const addFilterGroups = useMemo(
    () => getFilterGroupsForCategory(newProductDetail.category),
    [getFilterGroupsForCategory, newProductDetail.category]
  );

  const editFilterGroups = useMemo(
    () => getFilterGroupsForCategory(editProductDetail.category),
    [getFilterGroupsForCategory, editProductDetail.category]
  );

  function getImageUrl(pathOrUrl: string) {
    if (!pathOrUrl) return '';
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return pathOrUrl;
    }
    return `${IMAGE_BASE_URL}${pathOrUrl}`;
  }

  const getBucketFolderFromPath = (pathOrUrl: string) => {
    if (!pathOrUrl) return '';

    const normalized = String(pathOrUrl).trim().replace(/\\/g, '/');
    let storagePath = normalized;

    if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
      const marker = '/image/upload/';
      const markerIndex = storagePath.indexOf(marker);

      if (markerIndex >= 0) {
        storagePath = storagePath.slice(markerIndex + marker.length);
      }
    }

    const parts = storagePath.split('/').filter(Boolean);
    if (parts.length <= 1) {
      return parts[0] || '';
    }

    return parts.slice(0, -1).join('/');
  };

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/admin/products', { cache: 'no-store' });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const products: DbProduct[] = await response.json();
// Find this block around line 321 inside fetchProducts:
const mappedProducts = products.map((product, index) => {
  const price = Number(product.price);
  const reviewCount = product.reviews?.length || 0;
  const primaryPath = product.image || product.images?.find((img) => img.is_primary)?.image_path || '';

  return {
    id: product.id,
    sku: getProductSku(product, index),
    name: product.name,
    color: product.colorName || product.tag || 'N/A', // Set colorName as primary fallback
    category: product.category,
    productTypeId: product.productType?.id,
    subCategoryId: product.subCategory?.id || undefined,
    subCategoryName: product.subCategory?.name || undefined,
    price,
    stock: product.stock,
    salesVelocity: `${Math.max(0, Math.round(reviewCount / 2))} units/week`,
    image: primaryPath,
    description: product.description || '',
    sizes: product.sizes || [],
    rating: typeof product.rating === 'number' ? product.rating : null,
    createdAt: product.createdAt,
    isActive: typeof product.isActive === 'boolean' ? product.isActive : true,
    isDeleted: typeof product.isDeleted === 'boolean' ? product.isDeleted : false,
    deletedAt: product.deletedAt || null,
    images: Array.isArray(product.images) ? product.images : [],
    filters: Array.isArray(product.filters) ? product.filters : [],
    colorHex: product.colorHex || '#000000',
    colorName: product.colorName || product.tag || 'Unspecified',
    fabricType: product.fabricType || 'cotton',
    inventory: Array.isArray(product.inventory) ? product.inventory : [],
  };
});
      setProductDetails(mappedProducts);

      const maxSku = mappedProducts.reduce((max, product) => {
        const skuNumber = parseSku(product.sku) || 200000;
        return Math.max(max, skuNumber);
      }, 200000);
      const generatedSku = String(maxSku + 1);
      setNextSku(generatedSku);

      const maxPriceFromProducts = mappedProducts.length
        ? Math.max(...mappedProducts.map((product) => product.price), 1500)
        : 1500;
      setMaxPriceFilter(maxPriceFromProducts);
    } catch {
      setErrorMessage('Unable to load products right now.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    let isMounted = true;

    const fetchFilterMetadata = async () => {
      try {
        const response = await fetch('/api/filters', { cache: 'no-store' });
        if (!response.ok) return;

        const payload: ProductTypeFilterMeta[] = await response.json();
        if (isMounted) {
          setFilterMetadata(Array.isArray(payload) ? payload : []);
        }
      } catch {
        if (isMounted) {
          setFilterMetadata([]);
        }
      }
    };

    void fetchFilterMetadata();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchProductTaxonomy = async () => {
      try {
        const response = await fetch('/api/admin/product-taxonomy', { cache: 'no-store' });
        if (!response.ok) {
          if (isMounted) {
            setProductTaxonomy([]);
          }
          return;
        }

        const payload: ProductTaxonomyType[] = await response.json();
        if (isMounted) {
          setProductTaxonomy(Array.isArray(payload) ? payload : []);
        }
      } catch {
        if (isMounted) {
          setProductTaxonomy([]);
        }
      }
    };

    void fetchProductTaxonomy();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    console.log('Derived addFilterGroups:', addFilterGroups);
    const allowed = new Set(addFilterGroups.flatMap((group) => group.filterOptions.map((option) => option.id)));
    setNewFilterOptionIds((current) => current.filter((id) => allowed.has(id)));
  }, [addFilterGroups]);

  useEffect(() => {
    const allowed = new Set(editFilterGroups.flatMap((group) => group.filterOptions.map((option) => option.id)));
    setEditFilterOptionIds((current) => current.filter((id) => allowed.has(id)));
  }, [editFilterGroups]);

  const getSubcategoryOptions = useCallback(
    (category: string) => {
      const candidateSlugs = getCandidateTypeSlugs(category);
      const mapped = new Map<string, TaxonomySubCategory>();

      for (const type of productTaxonomy) {
        const normalizedTypeSlug = normalizeSlug(type.slug || type.name);
        if (!candidateSlugs.includes(normalizedTypeSlug)) {
          continue;
        }

        for (const subcategory of type.subcategories || []) {
          if (!mapped.has(subcategory.id)) {
            mapped.set(subcategory.id, subcategory);
          }
        }
      }

      if (mapped.size > 0) {
        return Array.from(mapped.values());
      }

      return [] as TaxonomySubCategory[];
    },
    [productTaxonomy]
  );

  const addSubcategoryOptions = useMemo(
    () => getSubcategoryOptions(newProductDetail.category),
    [getSubcategoryOptions, newProductDetail.category]
  );

  const editSubcategoryOptions = useMemo(
    () => getSubcategoryOptions(editProductDetail.category),
    [getSubcategoryOptions, editProductDetail.category]
  );

  useEffect(() => {
    setNewProductDetail((current) => {
      if (!current.subCategoryId) {
        return current;
      }

      const isAllowed = addSubcategoryOptions.some((option) => option.id === current.subCategoryId);
      return isAllowed ? current : { ...current, subCategoryId: '' };
    });
  }, [addSubcategoryOptions]);

  useEffect(() => {
    setEditProductDetail((current) => {
      if (!current.subCategoryId) {
        return current;
      }

      const isAllowed = editSubcategoryOptions.some((option) => option.id === current.subCategoryId);
      return isAllowed ? current : { ...current, subCategoryId: '' };
    });
  }, [editSubcategoryOptions]);

  useEffect(() => {
    const syncViewport = () => {
      setIsMobileViewport(window.innerWidth < 1024);
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);

    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  // Fetch Filter Groups and Options from DB
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await fetch('/api/filters', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const normalizedGroups = Array.isArray(data)
            ? data.flatMap((type: any) => {
                const productTypeId = typeof type?.id === 'string' ? type.id : '';
                const groups = Array.isArray(type?.filterGroups) ? type.filterGroups : [];

                return groups.map((group: any) => ({
                  id: String(group?.id || ''),
                  productTypeId,
                  name: String(group?.name || ''),
                  displayName: String(group?.displayName || ''),
                  slug: String(group?.slug || ''),
                  filterOptions: Array.isArray(group?.filterOptions)
                    ? group.filterOptions.map((option: any) => ({
                        id: String(option?.id || ''),
                        value: String(option?.value || ''),
                        displayLabel: String(option?.displayLabel || ''),
                      }))
                    : [],
                }));
              })
            : [];
          setDbFilterGroups(normalizedGroups);
        }
      } catch (err) {
        console.error('Failed to load filter tags:', err);
      }
    };
    fetchFilters();
  }, []);

  const categories = ['All', ...Array.from(new Set(productDetails.map((p) => p.category)))];
  const styles = ['All', ...Array.from(new Set(productDetails.map((p) => p.color).filter(Boolean)))];

  const getRootFolderNameFromFiles = (files: File[]) => {
    const firstWithPath = files.find((file) => {
      const withPath = file as File & { _relativePath?: string; webkitRelativePath?: string };
      return Boolean(withPath._relativePath || withPath.webkitRelativePath);
    });

    if (!firstWithPath) return '';

    const withPath = firstWithPath as File & { _relativePath?: string; webkitRelativePath?: string };
    const relativePath = (withPath._relativePath || withPath.webkitRelativePath || '').replace(/\\/g, '/');
    const parts = relativePath.split('/').filter(Boolean);
    return parts.length > 1 ? parts[0] : '';
  };

  const uploadImagesForProductId = async (productId: string, files: File[]) => {
    if (!files.length) return [] as string[];

    if (!String(productId || '').trim()) {
      throw new Error('Product id is required to upload images');
    }

    const formData = new FormData();
    formData.append('productId', String(productId).trim());

    files.forEach((file) => {
      const withPath = file as File & { webkitRelativePath?: string; _relativePath?: string };
      const relativePath = withPath._relativePath || withPath.webkitRelativePath || file.name;
      formData.append('files', file);
      formData.append('paths', relativePath);
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

  const filteredProducts = productDetails.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
    const matchesStyle = activeStyle === 'All' || product.color === activeStyle;
    const matchesStock =
      stockLevel === 'All' ||
      (stockLevel === 'In Stock' && product.stock > STOCK_THRESHOLD) ||
      (stockLevel === 'Low Stock' && product.stock > 0 && product.stock <= STOCK_THRESHOLD) ||
      (stockLevel === 'Out of Stock' && product.stock === 0);
    const matchesPrice = product.price <= maxPriceFilter;

    return matchesSearch && matchesCategory && matchesStyle && matchesStock && matchesPrice;
  });
  const maxPriceLimit = Math.max(1500, ...productDetails.map((p) => p.price), 0);

  const itemsPerPage = 8;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pageStart = (currentPageSafe - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(pageStart, pageStart + itemsPerPage);

  const totalSkus = productDetails.length;
  const lowStockCount = productDetails.filter(
    (product) => product.stock > 0 && product.stock <= STOCK_THRESHOLD
  ).length;
  const outOfStockCount = productDetails.filter((product) => product.stock === 0).length;
  const draftProductsCount = productDetails.filter(
    (product) => !product.isDeleted && !product.isActive
  ).length;
  const activeProductsCount = productDetails.filter(
    (product) => !product.isDeleted && product.isActive
  ).length;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, activeStyle, stockLevel, searchQuery, maxPriceFilter]);

  const beginApiCall = () => {
    if (apiCallLockRef.current) return false;
    apiCallLockRef.current = true;
    setIsApiCallInProgress(true);
    return true;
  };

  const endApiCall = () => {
    apiCallLockRef.current = false;
    setIsApiCallInProgress(false);
  };

  const openConfirmModal = ({
    title,
    message,
    confirmLabel,
    onConfirm,
  }: {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void | Promise<void>;
  }) => {
    confirmModalActionRef.current = onConfirm;
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmLabel: confirmLabel || 'Confirm',
    });
  };

  const closeConfirmModal = () => {
    if (isConfirmModalProcessing) return;
    confirmModalActionRef.current = null;
    setConfirmModal((current) => ({
      ...current,
      isOpen: false,
    }));
  };

  const confirmModalSubmit = async () => {
    const action = confirmModalActionRef.current;

    if (!action) {
      closeConfirmModal();
      return;
    }

    try {
      setIsConfirmModalProcessing(true);
      await action();
      confirmModalActionRef.current = null;
      setConfirmModal((current) => ({
        ...current,
        isOpen: false,
      }));
    } finally {
      setIsConfirmModalProcessing(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedProducts(paginatedProducts.map((p) => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedProducts.includes(id)) {
      setSelectedProducts(selectedProducts.filter((item) => item !== id));
    } else {
      setSelectedProducts([...selectedProducts, id]);
    }
  };

  const handleAddProductDetail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beginApiCall()) return;
    setErrorMessage('');
    setIsUploadingImages(true);

    try {
      const folderSku = nextSku.trim();
      if (!folderSku) {
        throw new Error('SKU is required');
      }

      const sizes = newProductDetail.sizes
        .split(',')
        .map((size) => size.trim())
        .filter(Boolean);

const payload = {
        name: newProductDetail.name.trim(),
        price: Number(newProductDetail.price),
        stock: Number(newProductDetail.stock),
        description: newProductDetail.description.trim(),
        sizes,
        category: newProductDetail.category,
  subCategoryId: newProductDetail.subCategoryId || undefined,
  subCategoryName: addSubcategoryOptions.find((option) => option.id === newProductDetail.subCategoryId)?.name || undefined,
        tag: newProductDetail.tag,
        image: newProductDetail.image.trim() || undefined,
        rating: newProductDetail.rating ? Number(newProductDetail.rating) : null,
        filterOptionIds: newFilterOptionIds,
        
        // Exact column map alignment for Postgres table definition
        colorHex: newProductDetail.colorHex.trim() || '#000000',
        colorName: newProductDetail.colorName.trim() || 'Unspecified',
        fabricType: newProductDetail.fabricType.trim() || 'cotton',
        inventory: toInventoryPayload(newInventoryRows),
        // productTypeId: newProductDetail.productTypeId || 'default_type_id_here'
      };

      const createResponse = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create product');
      }

      const createdProduct = await createResponse.json();
      const createdProductId = String(createdProduct?.id || '').trim();

      if (!createdProductId) {
        throw new Error('Created product id missing');
      }

      if (productImages.length > 0) {
        const uploadedPaths = await uploadImagesForProductId(createdProductId, productImages);
        const selectedAddPrimaryIndex = addProductImagePreviewItems.findIndex(
          (item) => item.key === addPrimaryImagePreviewKey
        );
        const selectedUploadedPrimary =
          selectedAddPrimaryIndex >= 0 ? uploadedPaths[selectedAddPrimaryIndex] : '';
        const resolvedPrimaryUploadedPath = selectedUploadedPrimary || uploadedPaths[0] || '';

        if (uploadedPaths.length > 0) {
          const patchResponse = await fetch(`/api/admin/products/${createdProductId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: resolvedPrimaryUploadedPath,
              primaryImagePath: resolvedPrimaryUploadedPath,
              imagePaths: uploadedPaths,
            }),
          });

          if (!patchResponse.ok) {
            throw new Error('Product created but failed to attach uploaded images');
          }
        }
      }

      setNextSku(String((parseSku(folderSku) || Number(nextSku) || 200000) + 1));
      setNewProductDetail({
        name: '',
        price: '',
        stock: '',
        description: '',
        sizes: '',
        category: 'Bras',
        subCategoryId: '',
        tag: 'New Arrival',
        image: '',
        rating: '',
        colorHex: '#000000',
        colorName: 'Black',
        fabricType: 'cotton',
      });
      setNewFilterOptionIds([]);
      setEditInventorySeed([]);
      clearAddProductImages();
      setAddPrimaryImagePreviewKey('');
      setIsAddModalOpen(false);
      setNewFilterOptionIds([]);
      await Promise.all([fetchProducts(), refreshProducts()]);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to create product.');
    } finally {
      setIsUploadingImages(false);
      endApiCall();
    }
  };

  const handleBulkEditPrice = async () => {
    if (selectedProducts.length === 0) {
      alert('Select at least one product first.');
      return;
    }

    const input = prompt('Enter new price (₹) for selected products:');
    if (!input) return;

    const newPrice = Number(input);
    if (!Number.isFinite(newPrice) || newPrice < 0) {
      alert('Please enter a valid price.');
      return;
    }

    if (!beginApiCall()) return;

    try {
      await Promise.all(
        selectedProducts.map((id) =>
          fetch(`/api/admin/products/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price: newPrice }),
          })
        )
      );
      await Promise.all([fetchProducts(), refreshProducts()]);
      setSelectedProducts([]);
    } catch {
      setErrorMessage('Failed to update prices.');
    } finally {
      endApiCall();
    }
  };

  const handleBulkUpdateStock = async () => {
    if (selectedProducts.length === 0) {
      alert('Select at least one product first.');
      return;
    }

    const input = prompt('Enter new stock quantity for selected products:');
    if (!input) return;

    const newStock = Number(input);
    if (!Number.isInteger(newStock) || newStock < 0) {
      alert('Please enter a valid stock quantity.');
      return;
    }

    if (!beginApiCall()) return;

    try {
      await Promise.all(
        selectedProducts.map((id) =>
          fetch(`/api/admin/products/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stock: newStock }),
          })
        )
      );
      await Promise.all([fetchProducts(), refreshProducts()]);
      setSelectedProducts([]);
    } catch {
      setErrorMessage('Failed to update stock.');
    } finally {
      endApiCall();
    }
  };

  const handleArchiveSelected = async () => {
    if (selectedProducts.length === 0) {
      alert('Select at least one product first.');
      return;
    }

    setDeleteModal({
      isOpen: true,
      mode: 'bulk',
      productId: null,
      count: selectedProducts.length,
    });
  };

  const handleDeleteProduct = async (id: string) => {
    setDeleteModal({
      isOpen: true,
      mode: 'single',
      productId: id,
      count: 1,
    });
  };

  const handleRestoreProduct = async (id: string) => {
    if (!beginApiCall()) return;
    setErrorMessage('');

    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to restore product');
      }

      await Promise.all([fetchProducts(), refreshProducts()]);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to restore product.');
    } finally {
      endApiCall();
    }
  };

  const handleHardDeleteProduct = async (id: string) => {
    openConfirmModal({
      title: 'Confirm Permanent Delete',
      message: 'This permanently deletes the product and related records. Continue?',
      confirmLabel: 'Delete Permanently',
      onConfirm: async () => {
        if (!beginApiCall()) return;

        setErrorMessage('');

        try {
          const response = await fetch(`/api/admin/products/${id}?mode=hard`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload?.error || 'Failed to permanently delete product');
          }

          await Promise.all([fetchProducts(), refreshProducts()]);
        } catch (error: any) {
          setErrorMessage(error?.message || 'Failed to permanently delete product.');
        } finally {
          endApiCall();
        }
      },
    });
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;

    setDeleteModal({
      isOpen: false,
      mode: 'single',
      productId: null,
      count: 0,
    });
  };

  const resetDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      mode: 'single',
      productId: null,
      count: 0,
    });
  };

  const confirmDelete = async () => {
    if (!beginApiCall()) return;
    setIsDeleting(true);

    try {
      if (deleteModal.mode === 'bulk') {
        await Promise.all(
          selectedProducts.map((id) =>
            fetch(`/api/admin/products/${id}`, {
              method: 'DELETE',
            })
          )
        );
        setSelectedProducts([]);
      } else if (deleteModal.productId) {
        const response = await fetch(`/api/admin/products/${deleteModal.productId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete product');
        }

        setSelectedProducts((current) => current.filter((item) => item !== deleteModal.productId));
      }

      resetDeleteModal();
      await Promise.all([fetchProducts(), refreshProducts()]);
    } catch {
      setErrorMessage(
        deleteModal.mode === 'bulk'
          ? 'Failed to delete selected products.'
          : 'Failed to delete product.'
      );
    } finally {
      setIsDeleting(false);
      endApiCall();
    }
  };

  const handleEditProduct = async (product: ProductDetail) => {
    setEditingProductId(product.id);
    setEditingProductSku(product.sku);
    setEditProductDetail({
      name: product.name,
      price: String(product.price),
      stock: String(product.stock),
      description: product.description,
      sizes: product.sizes.join(', '),
      category: product.category,
      subCategoryId: product.subCategoryId || '',
      tag: product.color,
      image: product.image,
      rating: product.rating != null ? String(product.rating) : '',
      colorHex: (product as any).colorHex || '#000000',
      colorName: (product as any).colorName || 'Black',
      fabricType: (product as any).fabricType || 'cotton',
    });
    setEditInventorySeed(
      Array.isArray(product.inventory)
        ? product.inventory.map((row) => ({
            size: row.size,
            stock: String(row.stock),
          }))
        : []
    );
// Extract existing filter option relationships out of the product if present
    const existingOptionIds = product.filters?.map(f => f.filterOptionId) || [];
    setEditFilterOptionIds(existingOptionIds);

    const normalizedExistingImages =
      product.images.length > 0
        ? product.images.map((image) => ({
          id: image.id,
          imagePath: image.image_path,
          isPrimary: Boolean(image.is_primary),
        }))
        : product.image
          ? [
            {
              id: '',
              imagePath: product.image,
              isPrimary: true,
            },
          ]
          : [];

    setEditExistingImages(normalizedExistingImages);
    const initialPrimary =
      normalizedExistingImages.find((image) => image.isPrimary)?.imagePath ||
      normalizedExistingImages[0]?.imagePath ||
      '';
    setEditProductDetail((current) => ({
      ...current,
      image: initialPrimary,
    }));
    setEditPrimaryImagePreviewKey('');
    setRemovedEditImageIds([]);
    setRemovedEditImagePaths([]);
    clearEditProductImages();
    setIsEditModalOpen(true);
  };

  const openViewProductModal = (product: ProductDetail) => {
    setActiveActionMenuProductId(null);
    setViewingProduct(product);
  };

  const closeViewProductModal = () => {
    setViewingProduct(null);
  };

  const handleRowActionEdit = (product: ProductDetail) => {
    setActiveActionMenuProductId(null);
    void handleEditProduct(product);
  };

  const handleRowActionDelete = (product: ProductDetail) => {
    setActiveActionMenuProductId(null);
    void handleDeleteProduct(product.id);
  };

  const removeExistingEditImage = (image: EditableExistingImage) => {
    setEditExistingImages((current) => {
      const next = current.filter((item) => item.imagePath !== image.imagePath);

      setEditProductDetail((previous) => {
        if (previous.image.trim() !== image.imagePath) {
          return previous;
        }

        return {
          ...previous,
          image: next[0]?.imagePath || '',
        };
      });

      return next;
    });

    if (image.id) {
      setRemovedEditImageIds((current) => (current.includes(image.id) ? current : [...current, image.id]));
    }

    if (image.imagePath) {
      setRemovedEditImagePaths((current) =>
        current.includes(image.imagePath) ? current : [...current, image.imagePath]
      );
    }
  };

  const handleRemoveExistingEditImage = (image: EditableExistingImage) => {
    openConfirmModal({
      title: 'Remove Linked Image',
      message: 'Remove this linked image from the product? This change will be applied when you save.',
      confirmLabel: 'Remove',
      onConfirm: () => removeExistingEditImage(image),
    });
  };

  const handleUpdateProductDetail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingProductId) return;
    if (!beginApiCall()) return;

    try {
      const uploadedPaths = await uploadImagesForProductId(editingProductId, editProductImages);
      const sizes = editProductDetail.sizes
        .split(',')
        .map((size) => size.trim())
        .filter(Boolean);

      const currentPrimaryPath = editProductDetail.image.trim();
      const selectedEditPrimaryIndex = editProductImagePreviewItems.findIndex(
        (item) => item.key === editPrimaryImagePreviewKey
      );
      const selectedUploadedPrimary =
        selectedEditPrimaryIndex >= 0 ? uploadedPaths[selectedEditPrimaryIndex] : '';
      const removedPaths = new Set(removedEditImagePaths);
      const primaryWasRemoved = Boolean(currentPrimaryPath && removedPaths.has(currentPrimaryPath));
      const fallbackPrimaryFromExisting = editExistingImages.find(
        (image) => image.isPrimary && !removedPaths.has(image.imagePath)
      )?.imagePath;
      const fallbackPathFromExisting = editExistingImages.find(
        (image) => !removedPaths.has(image.imagePath)
      )?.imagePath;

      const resolvedPrimaryImage =
        selectedUploadedPrimary ||
        (!primaryWasRemoved && currentPrimaryPath) ||
        uploadedPaths[0] ||
        fallbackPrimaryFromExisting ||
        fallbackPathFromExisting ||
        null;

const response = await fetch(`/api/admin/products/${editingProductId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editProductDetail.name.trim(),
          price: Number(editProductDetail.price),
          stock: Number(editProductDetail.stock),
          description: editProductDetail.description.trim(),
          sizes,
          category: editProductDetail.category.trim(),
          subCategoryId: editProductDetail.subCategoryId || null,
          subCategoryName: editSubcategoryOptions.find((option) => option.id === editProductDetail.subCategoryId)?.name || null,
          tag: editProductDetail.tag.trim(),
          image: resolvedPrimaryImage,
          primaryImagePath: resolvedPrimaryImage,
          rating: editProductDetail.rating ? Number(editProductDetail.rating) : null,
          filterOptionIds: editFilterOptionIds,
          imagePaths: uploadedPaths.length ? uploadedPaths : undefined,
          removeImageIds: removedEditImageIds,
          removeImagePaths: removedEditImagePaths,
          colorHex: editProductDetail.colorHex.trim() || '#000000',
          colorName: editProductDetail.colorName.trim() || 'Unspecified',
          fabricType: editProductDetail.fabricType.trim() || 'cotton',
          inventory: toInventoryPayload(editInventoryRows),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to update product');
      }

      setIsEditModalOpen(false);
      setEditingProductId('');
      setEditingProductSku('');
      setEditExistingImages([]);
      setEditInventorySeed([]);
      setEditFilterOptionIds([]);
      setRemovedEditImageIds([]);
      setRemovedEditImagePaths([]);
      setEditPrimaryImagePreviewKey('');
      clearEditProductImages();
      await Promise.all([fetchProducts(), refreshProducts()]);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to update product.');
    } finally {
      endApiCall();
    }
  };

  const resetFilters = () => {
    setActiveCategory('All');
    setActiveStyle('All');
    setStockLevel('All');
    setSearchQuery('');
    setMaxPriceFilter(maxPriceLimit);
  };

  const handleImportProducts = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!importExcelFile) {
      setErrorMessage('Please choose an Excel file first.');
      return;
    }

    if (!beginApiCall()) return;

    setErrorMessage('');
    setImportResult(null);
    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append('excelFile', importExcelFile);
      importImagePreviewItems.forEach((item) => {
        formData.append('images', item.file, item.relativePath);
      });

      const response = await fetch('/api/admin/products/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to import products.');
      }

      setImportResult({
        createdCount: data.createdCount || 0,
        failedCount: data.failedCount || 0,
        errors: Array.isArray(data.errors) ? data.errors : [],
      });

      await Promise.all([fetchProducts(), refreshProducts()]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to import products.');
    } finally {
      setIsImporting(false);
      endApiCall();
    }
  };

  const handleDownloadImportTemplate = () => {
    const workbook = XLSX.utils.book_new();

    const productsSheet = XLSX.utils.json_to_sheet(
      [
        {
          id: '',
          name: 'Lace Comfort Bra',
          price: 1299,
          description: 'Soft lace support bra with adjustable straps',
          image: 'bra_black_1.jpg,bra_black_2.jpg',
          category: 'Bras',
          stock: 25,
          createdAt: '',
          tag: 'New Arrival',
          rating: 4.5,
          sizes: '32B,34B,36C',
          colorHex: '#000000',
          colorName: 'Black',
        },
      ],
      { header: IMPORT_TEMPLATE_HEADERS }
    );

    const instructionsSheet = XLSX.utils.aoa_to_sheet([
      ['How to use this template'],
      ['1. Fill each row with product data.'],
      ['2. Keep headers unchanged.'],
      ['3. Leave id and createdAt blank for new products.'],
      ['4. Use comma separated values for sizes.'],
      ['5. In image column, put comma-separated image file names OR a direct image URL/path.'],
      ['6. Upload the same filled file in this modal.'],
      ['7. Attach matching image files with exact names used in image column.'],
    ]);

    XLSX.utils.book_append_sheet(workbook, productsSheet, 'Products');
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

    XLSX.writeFile(workbook, 'product-import-template.xls', {
      bookType: 'biff8',
    });

    setHasDownloadedImportTemplate(true);
  };

  const openImportModal = () => {
    setIsImportModalOpen(true);
    setHasDownloadedImportTemplate(false);
    setImportExcelFile(null);
    setImportImagePreviewItems((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
    setImportImageFiles([]);
    setImportResult(null);
    setErrorMessage('');
  };

  const appendImportFolderFiles = (items: Array<{ file: File; relativePath: string }>) => {
    if (!items.length) return;

    setImportImagePreviewItems((current) => {
      const existing = new Set(current.map((item) => item.key));
      const incoming = items
        .map(({ file, relativePath }) => ({
          key: `${relativePath}-${file.size}-${file.lastModified}`,
          file,
          relativePath,
        }))
        .filter((item) => !existing.has(item.key));

      const incomingWithUrls = incoming.map((item) => ({
        ...item,
        url: URL.createObjectURL(item.file),
      }));

      const next = [...current, ...incomingWithUrls];
      setImportImageFiles(next.map((item) => item.file));
      return next;
    });
  };

  const appendAddProductFolderFiles = (items: Array<{ file: File; relativePath: string }>) => {
    if (!items.length) return;

    setAddProductImagePreviewItems((current) => {
      const existing = new Set(current.map((item) => item.key));
      const incoming = items
        .map(({ file, relativePath }) => {
          (file as File & { _relativePath?: string })._relativePath = relativePath;
          return {
            key: `${relativePath}-${file.size}-${file.lastModified}`,
            file,
            relativePath,
          };
        })
        .filter((item) => !existing.has(item.key));

      const incomingWithUrls = incoming.map((item) => ({
        ...item,
        url: URL.createObjectURL(item.file),
      }));

      const next = [...current, ...incomingWithUrls];
      setProductImages(next.map((item) => item.file));
      setAddPrimaryImagePreviewKey((currentKey) =>
        currentKey && next.some((item) => item.key === currentKey)
          ? currentKey
          : next[0]?.key || ''
      );
      return next;
    });
  };

  const appendEditProductFolderFiles = (items: Array<{ file: File; relativePath: string }>) => {
    if (!items.length) return;

    setEditProductImagePreviewItems((current) => {
      const existing = new Set(current.map((item) => item.key));
      const incoming = items
        .map(({ file, relativePath }) => {
          (file as File & { _relativePath?: string })._relativePath = relativePath;
          return {
            key: `${relativePath}-${file.size}-${file.lastModified}`,
            file,
            relativePath,
          };
        })
        .filter((item) => !existing.has(item.key));

      const incomingWithUrls = incoming.map((item) => ({
        ...item,
        url: URL.createObjectURL(item.file),
      }));

      const next = [...current, ...incomingWithUrls];
      setEditProductImages(next.map((item) => item.file));
      setEditPrimaryImagePreviewKey((currentKey) =>
        currentKey && next.some((item) => item.key === currentKey)
          ? currentKey
          : next[0]?.key || ''
      );
      return next;
    });
  };

  const handleAddImportFolder = (files: FileList | null) => {
    if (!files?.length) return;

    const items = Array.from(files).map((file) => {
      const withPath = file as File & { webkitRelativePath?: string };
      return {
        file,
        relativePath: withPath.webkitRelativePath || file.name,
      };
    });

    appendImportFolderFiles(items);
  };

  const readDirectoryEntries = async (reader: any): Promise<any[]> => {
    const allEntries: any[] = [];

    const readBatch = (): Promise<any[]> =>
      new Promise((resolve) => {
        reader.readEntries((entries: any[]) => resolve(entries));
      });

    while (true) {
      const batch = await readBatch();
      if (!batch.length) break;
      allEntries.push(...batch);
    }

    return allEntries;
  };

  const walkDroppedEntry = async (
    entry: any,
    parentPath = ''
  ): Promise<Array<{ file: File; relativePath: string }>> => {
    if (!entry) return [];

    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        entry.file(resolve, reject);
      });

      return [
        {
          file,
          relativePath: `${parentPath}${entry.name}`,
        },
      ];
    }

    if (entry.isDirectory) {
      const reader = entry.createReader();
      const entries = await readDirectoryEntries(reader);
      let files: Array<{ file: File; relativePath: string }> = [];

      for (const child of entries) {
        const childFiles = await walkDroppedEntry(child, `${parentPath}${entry.name}/`);
        files = files.concat(childFiles);
      }

      return files;
    }

    return [];
  };

  const extractDroppedFiles = async (
    event: React.DragEvent<HTMLDivElement>
  ): Promise<Array<{ file: File; relativePath: string }>> => {
    const items = event.dataTransfer?.items;
    if (items?.length) {
      let dropped: Array<{ file: File; relativePath: string }> = [];
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index] as DataTransferItem & {
          webkitGetAsEntry?: () => any;
        };
        const entry = item.webkitGetAsEntry?.();
        if (!entry) continue;

        const files = await walkDroppedEntry(entry, '');
        dropped = dropped.concat(files);
      }

      if (dropped.length) return dropped;
    }

    return Array.from(event.dataTransfer.files || []).map((file) => {
      const withPath = file as File & { webkitRelativePath?: string };
      return {
        file,
        relativePath: withPath.webkitRelativePath || file.name,
      };
    });
  };

  const handleFolderDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsFolderDragActive(true);
  };

  const handleFolderDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsFolderDragActive(false);
  };

  const handleFolderDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsFolderDragActive(false);

    const droppedItems = await extractDroppedFiles(event);
    appendImportFolderFiles(droppedItems);
  };

  const handleAddFolderDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsAddFolderDragActive(false);

    const droppedItems = await extractDroppedFiles(event);
    appendAddProductFolderFiles(droppedItems);
  };

  const handleEditFolderDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsEditFolderDragActive(false);

    const droppedItems = await extractDroppedFiles(event);
    appendEditProductFolderFiles(droppedItems);
  };

  const clearAddProductImages = () => {
    setAddProductImagePreviewItems((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
    setProductImages([]);
    setAddPrimaryImagePreviewKey('');
  };

  const clearEditProductImages = () => {
    setEditProductImagePreviewItems((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
    setEditProductImages([]);
    setEditPrimaryImagePreviewKey('');
  };

  const clearImportImages = () => {
    setImportImagePreviewItems((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
    setImportImageFiles([]);
  };

  const handleRemoveImportImage = (itemToRemove: ImportImagePreviewItem) => {
    openConfirmModal({
      title: 'Remove Image',
      message: 'Remove this import image from the list?',
      confirmLabel: 'Remove',
      onConfirm: () => {
        setImportImagePreviewItems((current) => {
          const next = current.filter((item) => item.key !== itemToRemove.key);
          URL.revokeObjectURL(itemToRemove.url);
          setImportImageFiles(next.map((item) => item.file));
          return next;
        });
      },
    });
  };

  const handleRemoveAddProductImage = (itemToRemove: ImportImagePreviewItem) => {
    openConfirmModal({
      title: 'Remove Image',
      message: 'Remove this selected image?',
      confirmLabel: 'Remove',
      onConfirm: () => {
        setAddProductImagePreviewItems((current) => {
          const next = current.filter((item) => item.key !== itemToRemove.key);
          URL.revokeObjectURL(itemToRemove.url);
          setProductImages(next.map((item) => item.file));
          setAddPrimaryImagePreviewKey((currentKey) =>
            currentKey === itemToRemove.key ? next[0]?.key || '' : currentKey
          );
          return next;
        });
      },
    });
  };

  const handleClearAddProductImages = () => {
    if (!addProductImagePreviewItems.length) {
      clearAddProductImages();
      return;
    }

    openConfirmModal({
      title: 'Clear Selected Images',
      message: 'Clear all selected images?',
      confirmLabel: 'Clear',
      onConfirm: () => clearAddProductImages(),
    });
  };

  const handleRemoveEditProductImage = (itemToRemove: ImportImagePreviewItem) => {
    openConfirmModal({
      title: 'Remove Image',
      message: 'Remove this selected image?',
      confirmLabel: 'Remove',
      onConfirm: () => {
        setEditProductImagePreviewItems((current) => {
          const next = current.filter((item) => item.key !== itemToRemove.key);
          URL.revokeObjectURL(itemToRemove.url);
          setEditProductImages(next.map((item) => item.file));
          setEditPrimaryImagePreviewKey((currentKey) =>
            currentKey === itemToRemove.key ? next[0]?.key || '' : currentKey
          );
          return next;
        });
      },
    });
  };

  const handleClearEditProductImages = () => {
    if (!editProductImagePreviewItems.length) {
      clearEditProductImages();
      return;
    }

    openConfirmModal({
      title: 'Clear Selected Images',
      message: 'Clear all selected images?',
      confirmLabel: 'Clear',
      onConfirm: () => clearEditProductImages(),
    });
  };

  const handleClearImportImages = () => {
    if (!importImagePreviewItems.length) {
      clearImportImages();
      return;
    }

    openConfirmModal({
      title: 'Clear Import Images',
      message: 'Clear all import images?',
      confirmLabel: 'Clear',
      onConfirm: () => clearImportImages(),
    });
  };

  const closeImportModal = () => {
    if (isImporting) return;
    clearImportImages();
    setIsImportModalOpen(false);
  };

  const closeAddModal = () => {
    if (isUploadingImages) return;
    clearAddProductImages();
    setNewFilterOptionIds([]);
    setNewProductDetail((current) => ({
      ...current,
      subCategoryId: '',
    }));
    setAddPrimaryImagePreviewKey('');
    setIsAddModalOpen(false);
  };

  const closeEditModal = () => {
    clearEditProductImages();
    setEditExistingImages([]);
    setEditFilterOptionIds([]);
    setRemovedEditImageIds([]);
    setRemovedEditImagePaths([]);
    setEditPrimaryImagePreviewKey('');
    setIsEditModalOpen(false);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Global Admin
          </span>
          <h1 className="text-4xl font-black tracking-tight text-[#2a1031]">Product Management</h1>
        </div>
        <div className="hidden w-full flex-nowrap items-center gap-3 overflow-x-auto pb-1 md:flex md:w-auto">
          <div className="flex min-w-42.5 items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f7e8f1] text-[#840d5c]">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-neutral-500">Total SKUs</p>
              <p className="text-2xl font-black leading-tight text-[#2a1031]">{totalSkus}</p>
            </div>
          </div>
          <div className="flex min-w-52.5 items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-500">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-neutral-500">Low Stock Alerts</p>
              <p className="text-xl font-black leading-tight text-red-600">{lowStockCount} Low Stocks</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#f7e8f1] text-[#840d5c]">
            <Package className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-neutral-500">Total Products</p>
          <p className="mt-0.5 text-3xl font-black text-[#2a1031]">{totalSkus}</p>
          <p className="mt-1 text-[11px] text-neutral-500">{activeProductsCount} active products</p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-500">
            <AlertCircle className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-neutral-500">Low Stock</p>
          <p className="mt-0.5 text-3xl font-black text-[#2a1031]">{lowStockCount}</p>
          <p className="mt-1 text-[11px] text-neutral-500">Products running low</p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500">
            <CircleX className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-neutral-500">Out of Stock</p>
          <p className="mt-0.5 text-3xl font-black text-[#2a1031]">{outOfStockCount}</p>
          <p className="mt-1 text-[11px] text-neutral-500">Currently unavailable</p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-500">
            <FileText className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-neutral-500">Draft Products</p>
          <p className="mt-0.5 text-3xl font-black text-[#2a1031]">{draftProductsCount}</p>
          <p className="mt-1 text-[11px] text-neutral-500">Not published yet</p>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="space-y-5">

          {/* Actions Toolbar */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-2 shadow-sm md:flex-nowrap md:p-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button
                onClick={() => setIsFilterSheetOpen(true)}
                title="Open filters"
                aria-label="Open filters"
                className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-300 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 md:hidden"
              >
                <Filter className="h-3.5 w-3.5" />
              </button>

              <div className="flex min-w-55 flex-1 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2">
                <Search className="h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search products by name, SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium text-neutral-700 outline-none"
                />
              </div>

              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                className="hidden h-10 min-w-28 rounded-xl border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-700 outline-none md:block"
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <select
                value={stockLevel}
                onChange={(e) => setStockLevel(e.target.value)}
                className="hidden h-10 min-w-28 rounded-xl border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-700 outline-none md:block"
              >
                {['All', 'In Stock', 'Low Stock', 'Out of Stock'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>

              <select
                value={maxPriceFilter}
                onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                className="hidden h-10 min-w-32 rounded-xl border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-700 outline-none md:block"
              >
                <option value={750}>₹0 - ₹750</option>
                <option value={1000}>₹0 - ₹1,000</option>
                <option value={1500}>₹0 - ₹1,500</option>
                <option value={Math.max(maxPriceLimit, 2000)}>₹0 - ₹{Math.max(maxPriceLimit, 2000)}</option>
              </select>

              {/* <button
                onClick={() => setIsFilterSheetOpen(true)}
                className="hidden h-10 shrink-0 items-center gap-2 rounded-xl border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 md:inline-flex"
              >
                <Filter className="h-3.5 w-3.5" /> More Filters
              </button> */}
            </div>

            <div className="flex w-full items-center justify-end gap-2 md:w-auto">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#840d5c] px-3 text-xs font-semibold text-white hover:bg-[#6d0b4b]"
              >
                <Plus className="h-3.5 w-3.5" /> Add Product
              </button>
              {/* <button
                onClick={() => setIsAddModalOpen(true)}
                title="More actions"
                aria-label="More actions"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
              >
                <MoreVertical className="h-4 w-4" />
              </button> */}
              <button
                onClick={handleArchiveSelected}
                disabled={isApiCallInProgress}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-xl border border-[#e8bfd5] px-3 text-xs font-semibold text-[#840d5c] hover:bg-[#f7e8f1]"
              >
                <Trash2 className="h-3.5 w-3.5" /> <span className="hidden lg:inline">Soft Delete</span>
              </button>
            </div>
          </div>

          {/* Mobile Product Cards - HIDDEN */}
          <div className="hidden space-y-3 md:hidden">
            {!isLoading && paginatedProducts.map((p) => (
              <div key={p.id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 rounded border-neutral-300 text-[#840d5c]"
                    checked={selectedProducts.includes(p.id)}
                    onChange={() => handleSelectRow(p.id)}
                  />
                  <img src={getImageUrl(p.image)} className="h-12 w-12 rounded-xl border border-neutral-200 object-cover" alt={p.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-neutral-800">{p.name}</p>
                    <p className="mt-0.5 text-[10px] font-mono text-neutral-500">SKU {p.sku}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-700">{p.category}</span>
                      <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-700">{p.color}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-neutral-600">
                  <div>
                    <p className="font-bold uppercase tracking-wider text-neutral-400">Price</p>
                    <p className="mt-0.5 font-semibold text-neutral-900">₹{p.price}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase tracking-wider text-neutral-400">Stock</p>
                    <p className="mt-0.5 font-semibold text-neutral-900">{p.stock}</p>
                  </div>
                </div>
              </div>
            ))}

            {!isLoading && paginatedProducts.length === 0 && (
              <div className="rounded-2xl border border-neutral-200 bg-white py-8 text-center text-xs font-semibold text-neutral-400 shadow-sm">
                No products found for the selected filters.
              </div>
            )}

            {isLoading && (
              <div className="rounded-2xl border border-neutral-200 bg-white py-8 text-center text-xs font-semibold text-neutral-400 shadow-sm">
                Loading products...
              </div>
            )}
          </div>

          {/* Product Table */}
          <div className="overflow-x-auto rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <table className="w-full min-w-245 border-collapse table-auto text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-400 tracking-wider whitespace-nowrap">
                  <th className="w-12 py-4 px-4">
                    <input
                      type="checkbox"
                      className="rounded border-neutral-300 text-[#840d5c]"
                      onChange={handleSelectAll}
                      checked={paginatedProducts.length > 0 && selectedProducts.length === paginatedProducts.length}
                    />
                  </th>
                  <th className="w-60 py-4 px-3 font-bold">Product</th>
                  <th className="w-24 py-4 px-3 font-bold">SKU</th>
                  <th className="w-28 py-4 px-3 font-bold">Stock</th>
                  <th className="w-24 py-4 px-3 font-bold">Price</th>
                  <th className="w-32 py-4 px-3 font-bold">Sizes</th>
                  <th className="w-28 py-4 px-3 font-bold">Color</th>
                  <th className="w-24 py-4 px-3 font-bold">Status</th>
                  <th className="w-24 py-4 px-3 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-600 font-medium">
                {!isLoading && paginatedProducts.map((p) => (
                  <tr key={p.id} className="transition hover:bg-neutral-50">
                    <td className="py-4 px-4 align-middle">
                      <input
                        type="checkbox"
                        className="rounded border-neutral-300 text-[#840d5c]"
                        checked={selectedProducts.includes(p.id)}
                        onChange={() => handleSelectRow(p.id)}
                      />
                    </td>
                    <td className="py-4 px-3 align-middle">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={getImageUrl(p.image)}
                          className="h-12 w-12 rounded-xl border border-neutral-200 object-cover"
                          alt={p.name}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-neutral-800" title={p.name}>{p.name}</p>
                          <p className="truncate text-[11px] text-neutral-500">{p.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3 align-middle font-mono font-bold text-neutral-800 whitespace-nowrap">{p.sku}</td>
                    <td className="py-4 px-3 align-middle">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-900">{p.stock}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            p.stock === 0
                              ? 'bg-red-100 text-red-700'
                              : p.stock <= STOCK_THRESHOLD
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {p.stock === 0
                            ? 'Out of Stock'
                            : p.stock <= STOCK_THRESHOLD
                              ? 'Low Stock'
                              : 'In Stock'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-3 align-middle font-semibold text-neutral-900">₹{p.price}</td>
                    <td className="py-4 px-3 align-middle">
                      <p className="max-w-36 truncate whitespace-nowrap text-[11px] text-neutral-700" title={p.sizes.join(', ')}>
                        {p.sizes.length ? p.sizes.join(', ') : 'N/A'}
                      </p>
                    </td>
                    <td className="py-4 px-3 align-middle">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-neutral-300"
                          style={{ backgroundColor: p.colorHex }}
                          title={p.colorHex}
                        />
                        <span className="text-[11px] font-semibold text-neutral-700 capitalize">
                          {p.colorName || p.color || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-3 align-middle">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-bold ${getProductStatus(p).className}`}
                      >
                        {getProductStatus(p).label}
                      </span>
                    </td>
                    <td className="relative py-4 px-3 align-middle">
                      <div className="flex items-center justify-center" data-row-action-root="true">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveActionMenuProductId((current) =>
                              current === p.id ? null : p.id
                            )
                          }
                          title="Open action menu"
                          aria-label="Open action menu"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>

                        {activeActionMenuProductId === p.id && (
                          <div className="absolute right-2 top-12 z-20 w-36 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl">
                            <button
                              type="button"
                              onClick={() => openViewProductModal(p)}
                              className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRowActionEdit(p)}
                              className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={isApiCallInProgress || p.isDeleted}
                              onClick={() => handleRowActionDelete(p)}
                              className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && paginatedProducts.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center font-semibold text-neutral-400">
                      No products found for the selected filters.
                    </td>
                  </tr>
                )}
                {isLoading && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center font-semibold text-neutral-400">
                      Loading products...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && filteredProducts.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1 text-xs text-neutral-500">
              <p className="font-semibold">
                Showing {pageStart + 1} to {Math.min(pageStart + itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPageSafe === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-300 text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {Array.from({ length: Math.min(totalPages, 4) }, (_, index) => {
                  const pageNumber = index + 1;
                  const isActive = currentPageSafe === pageNumber;
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold ${
                        isActive
                          ? 'border-[#840d5c] bg-[#840d5c] text-white'
                          : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPageSafe === totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-300 text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <div className="ml-2 inline-flex h-8 items-center rounded-lg border border-neutral-300 bg-white px-2 text-neutral-700">
                  {itemsPerPage} / page
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Filter Bottom Sheet */}
        {isFilterSheetOpen && (
          <>
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => setIsFilterSheetOpen(false)}
              className="fixed inset-0 z-40 bg-neutral-900/45 lg:hidden"
            />
            <div className="fixed inset-x-0 bottom-0 z-50 max-h-[82vh] rounded-t-3xl border border-neutral-200 bg-white p-4 shadow-2xl lg:hidden">
              <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-neutral-200" />
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-[#840d5c]">Filters</h3>
                <button
                  type="button"
                  onClick={() => setIsFilterSheetOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-300 text-neutral-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4 overflow-y-auto pb-4">
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-neutral-400">Category</label>
                  <select
                    value={activeCategory}
                    onChange={(e) => setActiveCategory(e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2.5 text-xs font-semibold outline-none focus:border-[#840d5c]"
                  >
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>



                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-neutral-400">Price Range</label>
                  <div className="flex items-center gap-3 rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2.5">
                    <span className="text-[9px] font-bold text-neutral-400">₹0</span>
                    <input
                      type="range"
                      min="0"
                      max={maxPriceLimit}
                      value={maxPriceFilter}
                      onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                      className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-neutral-200 accent-[#840d5c]"
                    />
                    <span className="text-[9px] font-bold text-neutral-400">₹{maxPriceFilter}</span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-neutral-400">Stock Level</label>
                  <select
                    value={stockLevel}
                    onChange={(e) => setStockLevel(e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2.5 text-xs font-semibold outline-none focus:border-[#840d5c]"
                  >
                    {['All', 'In Stock', 'Low Stock', 'Out of Stock'].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-neutral-400">Global Search</label>
                  <div className="flex items-center gap-2 rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2.5">
                    <Search className="h-4 w-4 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search query..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent text-xs text-neutral-700 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterSheetOpen(false)}
                  className="flex-1 rounded-xl bg-[#840d5c] px-3 py-2 text-xs font-semibold text-white"
                >
                  Apply
                </button>
              </div>
            </div>
          </>
        )}

        {viewingProduct && (
          <>
            <button
              type="button"
              aria-label="Close product preview"
              onClick={closeViewProductModal}
              className="fixed inset-0 z-40 bg-neutral-900/60"
            />
            <div className="fixed inset-0 z-50 grid place-items-center p-4">
              <div className="my-6 flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl">
                <div className="overflow-y-auto p-5 sm:p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#7a2a6d]">Product Preview</p>
                    <h3 className="mt-1 text-4xl font-black tracking-tight text-[#2a1031]">{viewingProduct.name}</h3>
                    <p className="mt-2 text-sm font-semibold text-neutral-700">
                      SKU: {viewingProduct.sku}
                      <span className="mx-2 text-neutral-300">•</span>
                      Category: <span className="text-[#7a2a6d]">{viewingProduct.category}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeViewProductModal}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-300 text-neutral-600 hover:bg-neutral-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.15fr_1.85fr]">
                  <div>
                    <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
                      {(viewingProductImages[previewImageIndex] || getImageUrl(viewingProduct.image)) ? (
                        <img
                          src={viewingProductImages[previewImageIndex] || getImageUrl(viewingProduct.image)}
                          alt={viewingProduct.name}
                          className="h-120 w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-120 place-items-center text-sm font-semibold text-neutral-400">No image</div>
                      )}

                      <div className="absolute left-3 top-3 rounded-lg bg-neutral-900/35 px-2 py-1 text-sm font-semibold text-white">
                        {Math.min(previewImageIndex + 1, Math.max(viewingProductImages.length, 1))} / {Math.max(viewingProductImages.length, 1)}
                      </div>

                      {viewingProductImages.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImageIndex((current) =>
                                (current - 1 + viewingProductImages.length) % viewingProductImages.length
                              )
                            }
                            className="absolute left-4 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow hover:bg-white"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImageIndex((current) =>
                                (current + 1) % viewingProductImages.length
                              )
                            }
                            className="absolute right-4 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow hover:bg-white"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>

                    {viewingProductImages.length > 1 && (
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {viewingProductImages.slice(0, 4).map((imageUrl, index) => (
                          <button
                            key={`${imageUrl}-${index}`}
                            type="button"
                            onClick={() => setPreviewImageIndex(index)}
                            className={`overflow-hidden rounded-xl border ${
                              previewImageIndex === index
                                ? 'border-[#7a2a6d] ring-1 ring-[#7a2a6d]'
                                : 'border-neutral-200'
                            }`}
                          >
                            <img src={imageUrl} alt={`${viewingProduct.name} ${index + 1}`} className="h-16 w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="rounded-2xl border border-neutral-200 p-2">
                        <p className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f7e8f1] text-[#7a2a6d]"><Tag className="h-4 w-4" /></p>
                        <p className="mt-2 text-sm font-semibold text-neutral-500">Price</p>
                        <p className="text-3xl font-black text-[#2a1031]">₹{viewingProduct.price}</p>
                      </div>
                      <div className="rounded-2xl border border-neutral-200 p-2">
                        <p className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f7e8f1] text-[#7a2a6d]"><Boxes className="h-4 w-4" /></p>
                        <p className="mt-2 text-sm font-semibold text-neutral-500">Stock</p>
                        <p className="text-3xl font-black text-[#2a1031]">{viewingProduct.stock}</p>
                        <p className={`text-sm font-semibold ${viewingProduct.stock > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {viewingProduct.stock > 0 ? '• In Stock' : '• Out of Stock'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-neutral-200 p-2">
                        <p className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f7e8f1] text-[#7a2a6d]"><ShieldCheck className="h-4 w-4" /></p>
                        <p className="mt-2 text-sm font-semibold text-neutral-500">Status</p>
                        <span className={`mt-1 inline-flex rounded-full border px-3 py-1 text-sm font-bold ${getProductStatus(viewingProduct).className}`}>
                          {getProductStatus(viewingProduct).label}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-neutral-200 p-2">
                        <p className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f7e8f1] text-[#7a2a6d]"><Boxes className="h-4 w-4" /></p>
                        <p className="mt-2 text-sm font-semibold text-neutral-500">Category</p>
                        <p className="text-xl font-black text-[#2a1031]">{viewingProduct.category}</p>
                      </div>
                      <div className="rounded-2xl border border-neutral-200 p-2">
                        <p className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f7e8f1] text-[#7a2a6d]"><CalendarDays className="h-4 w-4" /></p>
                        <p className="mt-2 text-sm font-semibold text-neutral-500">Created On</p>
                        <p className="text-lg font-bold text-[#2a1031]">
                          {new Date(viewingProduct.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-neutral-200 p-2">
                      <p className="text-sm font-black text-[#2a1031]">Description</p>
                      <p className="mt-2 text-sm leading-relaxed text-neutral-700">
                        {viewingProduct.description || 'No description available.'}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-neutral-200 p-2">
                      <p className="text-sm font-black text-[#2a1031]">Sizes</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(viewingProduct.sizes.length ? viewingProduct.sizes : ['N/A']).map((size) => (
                          <span key={size} className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1 text-sm font-semibold text-neutral-700">
                            {size}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-neutral-200 p-2">
                      <p className="text-sm font-black text-[#2a1031]">Color</p>
                      <div className="mt-3 inline-flex items-center gap-3">
                        <span
                          className="h-9 w-9 rounded-full border border-neutral-300"
                          style={{ backgroundColor: viewingProduct.colorHex }}
                          title={viewingProduct.colorHex}
                        />
                        <div>
                          <p className="text-base font-semibold text-neutral-700">{viewingProduct.colorName || viewingProduct.color || 'N/A'}</p>
                          <p className="text-xs font-semibold uppercase text-neutral-400">{viewingProduct.colorHex}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                </div>

                <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-4 sm:px-6">
                  <div className="text-xs text-neutral-500">
                    <p className="font-semibold">Last Updated</p>
                    <p>{new Date(viewingProduct.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModal.isOpen && (
          <>
            <button
              type="button"
              aria-label="Close delete confirmation"
              onClick={closeDeleteModal}
              className="fixed inset-0 z-40 bg-neutral-900/50"
            />
            <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
              <div className="my-8 w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black text-[#840d5c]">Confirm Soft Delete</h3>
                    <p className="mt-2 text-sm text-neutral-600">
                      {deleteModal.mode === 'bulk'
                        ? `Soft delete ${deleteModal.count} selected product${deleteModal.count === 1 ? '' : 's'}?`
                        : 'Soft delete this product?'}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Product can be restored later from this dashboard.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    disabled={isDeleting}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-300 text-neutral-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    disabled={isDeleting || isApiCallInProgress}
                    className="flex-1 rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDelete}
                    disabled={isDeleting || isApiCallInProgress}
                    className="flex-1 rounded-xl bg-[#840d5c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6d0b4b] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeleting ? 'Deleting...' : 'Soft Delete'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {confirmModal.isOpen && (
          <>
            <button
              type="button"
              aria-label="Close confirmation modal"
              onClick={closeConfirmModal}
              className="fixed inset-0 z-90 bg-neutral-900/50"
            />
            <div className="fixed inset-0 z-100 grid place-items-center overflow-y-auto p-4">
              <div className="my-8 w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black text-[#840d5c]">{confirmModal.title}</h3>
                    <p className="mt-2 text-sm text-neutral-600">{confirmModal.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeConfirmModal}
                    disabled={isConfirmModalProcessing}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-300 text-neutral-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={closeConfirmModal}
                    disabled={isConfirmModalProcessing}
                    className="flex-1 rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmModalSubmit}
                    disabled={isConfirmModalProcessing}
                    className="flex-1 rounded-xl bg-[#840d5c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6d0b4b] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isConfirmModalProcessing ? 'Processing...' : confirmModal.confirmLabel}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Import Products Modal */}
        {isImportModalOpen && (
          <>
            <button
              type="button"
              aria-label="Close import products modal"
              onClick={closeImportModal}
              className="fixed inset-0 z-40 bg-neutral-900/50"
            />
            <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
              <form
                onSubmit={handleImportProducts}
                className="my-8 w-full max-w-2xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl sm:p-7"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-black text-[#840d5c]">Import Products (Excel)</h3>
                  <button
                    type="button"
                    onClick={closeImportModal}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-300 text-neutral-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-700">
                    <p className="font-semibold text-neutral-800">Step 1: Download Template</p>
                    <p className="mt-1 text-[11px] text-neutral-600">
                      Download the XLS template with Product-schema headings, fill that same file,
                      then upload the filled file here.
                    </p>
                    <button
                      type="button"
                      onClick={handleDownloadImportTemplate}
                      disabled={hasDownloadedImportTemplate}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#840d5c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#840d5c] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {hasDownloadedImportTemplate ? 'Template Downloaded' : 'Download XLS Template'}
                    </button>
                  </div>

                  {hasDownloadedImportTemplate && (
                    <div>
                      <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-neutral-400">
                        EXCEL FILE
                      </label>
                      <input
                        id="import-excel-input"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        required
                        onChange={(event) => setImportExcelFile(event.target.files?.[0] || null)}
                        className="sr-only"
                      />

                      <label
                        htmlFor="import-excel-input"
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                      >
                        <Upload className="h-3.5 w-3.5" /> Choose XLS File
                      </label>

                      <p className="mt-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
                        {importExcelFile ? importExcelFile.name : 'Upload The downloaded XLS file'}
                      </p>

                      <p className="mt-1 text-[10px] text-neutral-500">
                        Expected columns: id, name, price, description, image, category, stock, createdAt, tag, rating, sizes.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-neutral-400">
                      IMAGE FOLDER
                    </label>

                    <input
                      id="import-folder-input"
                      type="file"
                      multiple
                      accept="image/*"
                      {...({ webkitdirectory: '', directory: '' } as any)}
                      onChange={(event) => {
                        handleAddImportFolder(event.target.files);
                        event.target.value = '';
                      }}
                      className="sr-only"
                    />

                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="import-folder-input"
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Folder
                      </label>

                      {importImageFiles.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearImportImages}
                          className="inline-flex items-center gap-1 rounded-xl border border-[#e8bfd5] bg-[#f7e8f1] px-3 py-2 text-xs font-semibold text-[#6d0b4b] hover:bg-[#edd4e3]"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Clear
                        </button>
                      )}
                    </div>

                    <div
                      onDragOver={handleFolderDragOver}
                      onDragLeave={handleFolderDragLeave}
                      onDrop={handleFolderDrop}
                      className={`mt-2 rounded-xl border border-dashed p-3 text-xs ${isFolderDragActive
                          ? 'border-[#840d5c] bg-[#840d5c]/5 text-[#840d5c]'
                          : 'border-neutral-300 bg-neutral-50 text-neutral-600'
                        }`}
                    >
                      Drag and drop your image folder here.
                    </div>

                    <p className="mt-1 text-[10px] text-neutral-500">
                      {importImageFiles.length} image{importImageFiles.length === 1 ? '' : 's'} selected from folder.
                    </p>

                    {!!importImagePreviewItems.length && (
                      <p className="mt-1 text-[10px] text-neutral-500">
                        Folder: {importImagePreviewItems[0].relativePath.split('/')[0] || 'Selected folder'}
                      </p>
                    )}

                    <p className="mt-1 text-[10px] text-neutral-500">
                      Uploaded images are stored in Cloudinary folder <span className="font-bold">product_photos</span>.
                      If Product ID is provided in XLS, images are stored inside that product folder.
                    </p>

                    {importImagePreviewItems.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {importImagePreviewItems.map((item, index) => (
                          <div key={item.key} className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                            <img
                              src={item.url}
                              alt={item.file.name || `Selected image ${index + 1}`}
                              className="h-16 w-full object-cover"
                            />
                            <div className="flex items-center justify-between gap-1 px-1.5 py-1">
                              <p className="truncate text-[9px] text-neutral-500" title={item.relativePath}>
                                {item.relativePath}
                              </p>
                              <button
                                type="button"
                                aria-label="Remove image"
                                onClick={() => handleRemoveImportImage(item)}
                                className="inline-flex h-4 w-4 items-center justify-center rounded border border-neutral-300 text-neutral-500 hover:bg-neutral-100"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {importResult && (
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs">
                      <p className="font-semibold text-neutral-700">
                        Imported: {importResult.createdCount} | Failed: {importResult.failedCount}
                      </p>
                      {!!importResult.errors?.length && (
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-[#840d5c]">
                          {importResult.errors.slice(0, 8).map((error) => (
                            <li key={error}>{error}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isApiCallInProgress || isImporting || !hasDownloadedImportTemplate || !importExcelFile}
                    className="w-full rounded-xl bg-[#840d5c] py-3 text-xs font-extrabold text-white hover:bg-[#840d5c] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isImporting ? 'Importing...' : 'Import Product Data'}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {/* Add Product Modal */}
        {isAddModalOpen && (
          <>
            <button
              type="button"
              aria-label="Close add product modal"
              onClick={closeAddModal}
              className="fixed inset-0 z-40 bg-neutral-900/50"
            />
            <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
              <form onSubmit={handleAddProductDetail} className="my-8 max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl sm:p-7">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-black text-[#840d5c]">New Product Wizard</h3>
                  <button
                    type="button"
                    onClick={closeAddModal}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-300 text-neutral-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">NAME</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter short title..."
                      value={newProductDetail.name}
                      onChange={(e) => setNewProductDetail({ ...newProductDetail, name: e.target.value })}
                      className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs outline-none focus:border-[#840d5c]"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">CATEGORY</label>
                      <select
                        value={newProductDetail.category}
                        onChange={(e) => setNewProductDetail({ ...newProductDetail, category: e.target.value, subCategoryId: '' })}
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                      >
                        {CATEGORY_OPTIONS.map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">SUBCATEGORY</label>
                      <select
                        value={newProductDetail.subCategoryId}
                        onChange={(e) => setNewProductDetail({ ...newProductDetail, subCategoryId: e.target.value })}
                        disabled={addSubcategoryOptions.length === 0}
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs outline-none focus:border-[#840d5c]"
                      >
                        <option value="">{addSubcategoryOptions.length > 0 ? 'Select subcategory' : 'No subcategories configured'}</option>
                        {addSubcategoryOptions.map((subcategory) => (
                          <option key={subcategory.id} value={subcategory.id}>
                            {subcategory.name}
                          </option>
                        ))}
                      </select>
                      {addSubcategoryOptions.length === 0 && (
                        <p className="mt-1 text-[10px] text-neutral-500">
                          Add rows in the <span className="font-semibold">sub_categories</span> table for this category to populate this list.
                        </p>
                      )}
                    </div>
                    {/* <div>
                      <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">COLOR HEX</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. #000000"
                        value={newProductDetail.colorHex}
                        onChange={(e) => setNewProductDetail({ ...newProductDetail, colorHex: e.target.value })}
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                      />
                    </div> */}
                  </div>

                  <div>
                    <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">DYNAMIC FILTERS</label>
                    {addFilterGroups.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
{addFilterGroups.map((group) => (
  <div key={group.id} className="mb-4">
    <p className="text-[10px] font-bold text-[#840d5c] uppercase mb-1">{group.displayName}</p>
    <div className="flex flex-wrap gap-1.5">
      {group.filterOptions.map((option) => {
        const isSelected = newFilterOptionIds.includes(option.id);
        return (
          <button
            type="button"
            key={option.id}
onClick={() => {
  setNewFilterOptionIds((prev) => {
    // Check if the current group is "Comfort Type"
    const isSingleSelectGroup = 
      group.name === 'Comfort Type' || 
      group.slug === 'comfort-type' || 
      group.name=== 'Rise Type' ||
      group.slug === 'rise-type';

    if (isSingleSelectGroup) {
      // Single-select behavior: Clear previous options from this group and add the new one
      const groupOptionIds = new Set(group.filterOptions.map((opt) => opt.id));
      const next = prev.filter((id) => !groupOptionIds.has(id));
      return [...next, option.id];
    } else {
      // Standard multi-select toggle behavior for badges or other tags
      if (prev.includes(option.id)) {
        return prev.filter((id) => id !== option.id);
      } else {
        return [...prev, option.id];
      }
    }
  });
}}
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all border ${
              isSelected
                ? 'bg-[#840d5c] border-[#840d5c] text-white shadow-sm'
                : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-100'
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
                      <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2 text-[11px] text-neutral-500">
                        No dynamic filters configured for this category.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">DESCRIPTION</label>
                    <textarea
                      required
                      placeholder="Enter product description..."
                      value={newProductDetail.description}
                      onChange={(e) => setNewProductDetail({ ...newProductDetail, description: e.target.value })}
                      className="min-h-20 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">FABRIC TYPE</label>
                    <input
                      type="text"
                      placeholder="e.g. cotton, nylon, spandex"
                      value={newProductDetail.fabricType}
                      onChange={(e) => setNewProductDetail({ ...newProductDetail, fabricType: e.target.value })}
                      className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">SIZES (comma separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. 32B, 34B, 36C"
                      value={newProductDetail.sizes}
                      onChange={(e) => setNewProductDetail({ ...newProductDetail, sizes: e.target.value })}
                      className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                    />
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-500">Inventory</p>
                        <p className="mt-1 text-[11px] text-neutral-500">
                          Size-level stock is the source of truth. Aggregate stock stays synced for backward compatibility.
                        </p>
                      </div>
                    </div>
                    {newInventoryRows.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        <div className="grid grid-cols-[1fr_120px] gap-3 px-1 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
                          <span>Size</span>
                          <span>Stock</span>
                        </div>
                        {newInventoryRows.map((row) => (
                          <div key={row.size} className="grid grid-cols-[1fr_120px] gap-3">
                            <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs font-semibold text-neutral-700">
                              {row.size}
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={row.stock}
                              onChange={(e) => updateNewInventoryStock(row.size, e.target.value)}
                              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-xs text-neutral-500">Add sizes above to generate inventory rows.</p>
                    )}
                  </div>
{/* Hex Color Picker, Color Name, & Color Preview Block */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-1">
                        Color Hex Code
                      </label>
                      <div className="flex items-center gap-2 border border-neutral-300 rounded-xl px-3 py-1 bg-neutral-50">
                        <input
                          type="color"
                          value={newProductDetail.colorHex}
                          onChange={(e) => setNewProductDetail({ ...newProductDetail, colorHex: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer border border-neutral-300 p-0 bg-transparent shrink-0"
                        />
                        <input
                          type="text"
                          value={newProductDetail.colorHex}
                          onChange={(e) => setNewProductDetail({ ...newProductDetail, colorHex: e.target.value })}
                          placeholder="#000000"
                          maxLength={7}
                          className="w-full bg-transparent text-xs font-mono outline-none text-neutral-700 uppercase"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-1">
                        Color Name
                      </label>
                      <input
                        type="text"
                        value={newProductDetail.colorName}
                        onChange={(e) => setNewProductDetail({ ...newProductDetail, colorName: e.target.value })}
                        placeholder="e.g. Crimson Red"
                        className="w-full text-xs font-semibold bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2.5 outline-none focus:border-[#840d5c]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-1">
                        Color Preview
                      </label>
                      <div 
                        style={{ backgroundColor: newProductDetail.colorHex }}
                        className="w-full h-9 rounded-xl border border-neutral-300 shadow-inner flex items-center justify-center transition-all duration-200"
                      >
                        <span className="text-[9px] font-mono mix-blend-difference text-white font-extrabold uppercase drop-shadow-sm">
                          {newProductDetail.colorHex}
                        </span>
                      </div>
                    </div>
                  </div>


                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">PRICE (₹)</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 480"
                        value={newProductDetail.price}
                        onChange={(e) => setNewProductDetail({ ...newProductDetail, price: e.target.value })}
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">INITIAL STOCK</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 100"
                        value={newProductDetail.stock}
                        onChange={(e) => setNewProductDetail({ ...newProductDetail, stock: e.target.value })}
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                      />
                      <p className="mt-1 text-[10px] text-neutral-400">When sizes are present, this mirrors the sum of size inventory.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">PRIMARY IMAGE URL/PATH</label>
                      <input
                        type="text"
                        placeholder="Optional image URL or storage path"
                        value={newProductDetail.image}
                        onChange={(e) => setNewProductDetail({ ...newProductDetail, image: e.target.value })}
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">RATING</label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        placeholder="e.g. 4.5"
                        value={newProductDetail.rating}
                        onChange={(e) => setNewProductDetail({ ...newProductDetail, rating: e.target.value })}
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">PRODUCT IMAGE FOLDER</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      {...({ webkitdirectory: '', directory: '' } as any)}
                      onChange={(e) => {
                        appendAddProductFolderFiles(
                          Array.from(e.target.files || []).map((file) => {
                            const withPath = file as File & { webkitRelativePath?: string };
                            return {
                              file,
                              relativePath: withPath.webkitRelativePath || file.name,
                            };
                          })
                        );
                        e.target.value = '';
                      }}
                      className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-xs"
                    />
                    {addProductImagePreviewItems.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAddProductImages}
                        className="mt-2 inline-flex items-center gap-1 rounded-xl border border-[#e8bfd5] bg-[#f7e8f1] px-3 py-2 text-xs font-semibold text-[#6d0b4b] hover:bg-[#edd4e3]"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Clear
                      </button>
                    )}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsAddFolderDragActive(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsAddFolderDragActive(false);
                      }}
                      onDrop={handleAddFolderDrop}
                      className={`mt-2 rounded-xl border border-dashed p-3 text-xs ${isAddFolderDragActive
                          ? 'border-[#840d5c] bg-[#840d5c]/5 text-[#840d5c]'
                          : 'border-neutral-300 bg-neutral-50 text-neutral-600'
                        }`}
                    >
                      Drag and drop image folder here.
                    </div>
                    <p className="mt-1 text-[10px] text-neutral-500">
                      {productImages.length} image{productImages.length === 1 ? '' : 's'} selected.
                    </p>
                    <p className="mt-1 text-[10px] text-neutral-500">
                      Files will be uploaded to Cloudinary folder <span className="font-bold">product_photos/{getRootFolderNameFromFiles(productImages) || 'foldername'}</span>.
                    </p>

                    {addProductImagePreviewItems.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {addProductImagePreviewItems.map((item, index) => (
                          <div key={item.key} className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                            <img
                              src={item.url}
                              alt={item.file.name || `Selected image ${index + 1}`}
                              className="h-16 w-full object-cover"
                            />
                            <div className="space-y-1 px-1.5 py-1">
                              <p className="truncate text-[9px] text-neutral-500" title={item.relativePath}>
                                {item.relativePath}
                              </p>
                              {addPrimaryImagePreviewKey === item.key ? (
                                <p className="text-[9px] font-semibold text-[#840d5c]">Primary image</p>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setAddPrimaryImagePreviewKey(item.key)}
                                  className="inline-flex h-5 w-full items-center justify-center rounded border border-neutral-300 text-[9px] font-semibold text-neutral-600 hover:bg-neutral-100"
                                >
                                  Set as Primary
                                </button>
                              )}
                              <button
                                type="button"
                                aria-label="Remove image"
                                onClick={() => handleRemoveAddProductImage(item)}
                                className="inline-flex h-5 w-full items-center justify-center rounded border border-neutral-300 text-[9px] font-semibold text-neutral-500 hover:bg-neutral-100"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isApiCallInProgress || isUploadingImages}
                    className="mt-4 w-full rounded-xl bg-[#840d5c] py-3 text-xs font-extrabold text-white hover:bg-[#840d5c] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isUploadingImages ? 'Uploading Images + Creating SKU...' : 'Create and Launch SKU'}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {/* Edit Product Modal */}
        {isEditModalOpen && (
          <>
            <button
              type="button"
              aria-label="Close edit product modal"
              onClick={closeEditModal}
              className="fixed inset-0 z-40 bg-neutral-900/50"
            />
            <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
              <form onSubmit={handleUpdateProductDetail} className="my-8 max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl sm:p-7">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-black text-[#840d5c]">Edit Product</h3>
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-300 text-neutral-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">NAME</label>
                    <input
                      type="text"
                      required
                      value={editProductDetail.name}
                      onChange={(e) => setEditProductDetail({ ...editProductDetail, name: e.target.value })}
                      className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">CATEGORY</label>
                      <select
                        value={editProductDetail.category}
                        onChange={(e) => setEditProductDetail({ ...editProductDetail, category: e.target.value, subCategoryId: '' })}
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                      >
                        {CATEGORY_OPTIONS.map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">SUBCATEGORY</label>
                      <select
                        value={editProductDetail.subCategoryId}
                        onChange={(e) => setEditProductDetail({ ...editProductDetail, subCategoryId: e.target.value })}
                        disabled={editSubcategoryOptions.length === 0}
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs outline-none focus:border-[#840d5c]"
                      >
                        <option value="">{editSubcategoryOptions.length > 0 ? 'Select subcategory' : 'No subcategories configured'}</option>
                        {editSubcategoryOptions.map((subcategory) => (
                          <option key={subcategory.id} value={subcategory.id}>
                            {subcategory.name}
                          </option>
                        ))}
                      </select>
                      {editSubcategoryOptions.length === 0 && (
                        <p className="mt-1 text-[10px] text-neutral-500">
                          Add rows in the <span className="font-semibold">sub_categories</span> table for this category to populate this list.
                        </p>
                      )}
                    </div>
                    {/* <div>
                      <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">TAG</label>
                      <input
                        type="text"
                        required
                        value={editProductDetail.tag}
                        onChange={(e) => setEditProductDetail({ ...editProductDetail, tag: e.target.value })}
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                      />
                    </div> */}
                  </div>

                  <div>
                    <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">DYNAMIC FILTERS</label>
                    {editFilterGroups.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
{editFilterGroups.map((group) => (
  <div key={group.id} className="mb-4">
    <p className="text-[10px] font-bold text-[#840d5c] uppercase mb-1">{group.displayName}</p>
    <div className="flex flex-wrap gap-1.5">
      {group.filterOptions.map((option) => {
        const isSelected = editFilterOptionIds.includes(option.id);
        return (
          <button
            type="button"
            key={option.id}
onClick={() => {
  setEditFilterOptionIds((prev) => {
    // Check if the current group is "Comfort Type"
    const isSingleSelectGroup = 
      group.name === 'Comfort Type' || 
      group.slug === 'comfort-type';

    if (isSingleSelectGroup) {
      // Single-select behavior: Clear previous options from this group and add the new one
      const groupOptionIds = new Set(group.filterOptions.map((opt) => opt.id));
      const next = prev.filter((id) => !groupOptionIds.has(id));
      return [...next, option.id];
    } else {
      // Standard multi-select toggle behavior for badges or other tags
      if (prev.includes(option.id)) {
        return prev.filter((id) => id !== option.id);
      } else {
        return [...prev, option.id];
      }
    }
  });
}}
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all border ${
              isSelected
                ? 'bg-[#840d5c] border-[#840d5c] text-white shadow-sm'
                : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-100'
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
                      <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2 text-[11px] text-neutral-500">
                        No dynamic filters configured for this category.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">DESCRIPTION</label>
                    <textarea
                      required
                      value={editProductDetail.description}
                      onChange={(e) => setEditProductDetail({ ...editProductDetail, description: e.target.value })}
                      className="min-h-24 w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">FABRIC TYPE</label>
                    <input
                      type="text"
                      placeholder="e.g. cotton, nylon, spandex"
                      value={editProductDetail.fabricType}
                      onChange={(e) => setEditProductDetail({ ...editProductDetail, fabricType: e.target.value })}
                      className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">SIZES (comma separated)</label>
                    <input
                      type="text"
                      value={editProductDetail.sizes}
                      onChange={(e) => setEditProductDetail({ ...editProductDetail, sizes: e.target.value })}
                      className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                    />
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-500">Inventory</p>
                      <p className="mt-1 text-[11px] text-neutral-500">
                        Update stock per size here. The legacy product stock field remains synced from these rows.
                      </p>
                    </div>
                    {editInventoryRows.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        <div className="grid grid-cols-[1fr_120px] gap-3 px-1 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
                          <span>Size</span>
                          <span>Stock</span>
                        </div>
                        {editInventoryRows.map((row) => (
                          <div key={row.size} className="grid grid-cols-[1fr_120px] gap-3">
                            <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs font-semibold text-neutral-700">
                              {row.size}
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={row.stock}
                              onChange={(e) => updateEditInventoryStock(row.size, e.target.value)}
                              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-xs text-neutral-500">Add sizes above to manage per-size inventory.</p>
                    )}
                  </div>
{/* Hex Color Picker, Color Name, & Color Preview Block (EDIT) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-1">
                        Color Hex Code
                      </label>
                      <div className="flex items-center gap-2 border border-neutral-300 rounded-xl px-3 py-1 bg-neutral-50">
                        <input
                          type="color"
                          value={editProductDetail.colorHex}
                          onChange={(e) => setEditProductDetail({ ...editProductDetail, colorHex: e.target.value })}

                          className="w-8 h-8 rounded cursor-pointer border border-neutral-300 p-0 bg-transparent shrink-0"
                        />
                        <input
                          type="text"
                          value={editProductDetail.colorHex}
                          onChange={(e) => setEditProductDetail({ ...editProductDetail, colorHex: e.target.value })}
                          placeholder="#000000"
                          maxLength={7}
                          className="w-full bg-transparent text-xs font-mono outline-none text-neutral-700 uppercase"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-1">
                        Color Name
                      </label>
                      <input
                        type="text"
                        value={editProductDetail.colorName}
                        onChange={(e) => setEditProductDetail({ ...editProductDetail, colorName: e.target.value })}
                        placeholder="e.g. Crimson Red"
                        className="w-full text-xs font-semibold bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2.5 outline-none focus:border-[#840d5c]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-1">
                        Color Preview
                      </label>
                      <div 
                        style={{ backgroundColor: editProductDetail.colorHex }}
                        className="w-full h-9 rounded-xl border border-neutral-300 shadow-inner flex items-center justify-center transition-all duration-200"
                      >
                        <span className="text-[9px] font-mono mix-blend-difference text-white font-extrabold uppercase drop-shadow-sm">
                          {editProductDetail.colorHex}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Select Database Filter Tags Box (EDIT) */}


                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">PRICE (₹)</label>
                      <input
                        type="number"
                        required
                        value={editProductDetail.price}
                        onChange={(e) => setEditProductDetail({ ...editProductDetail, price: e.target.value })}
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">STOCK</label>
                      <input
                        type="number"
                        required
                        value={editProductDetail.stock}
                        onChange={(e) => setEditProductDetail({ ...editProductDetail, stock: e.target.value })}
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                      />
                      <p className="mt-1 text-[10px] text-neutral-400">This aggregate remains available for existing screens and APIs.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">PRIMARY IMAGE URL/PATH</label>
                      <input
                        type="text"
                        value={editProductDetail.image}
                        onChange={(e) => setEditProductDetail({ ...editProductDetail, image: e.target.value })}
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">RATING</label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={editProductDetail.rating}
                        onChange={(e) => setEditProductDetail({ ...editProductDetail, rating: e.target.value })}
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">CREATED AT</label>
                      <input
                        type="text"
                        value={new Date(
                          productDetails.find((product) => product.id === editingProductId)?.createdAt || ''
                        ).toLocaleString()}
                        readOnly
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs text-neutral-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">PRODUCT ID</label>
                      <input
                        type="text"
                        value={editingProductId}
                        readOnly
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs text-neutral-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">LINKED PRODUCT IMAGES</label>
                    {editExistingImages.length > 0 ? (
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                        <p className="text-[10px] font-semibold text-neutral-600">
                          Bucket path: products/{getBucketFolderFromPath(editExistingImages[0].imagePath) || 'product_photos'}
                        </p>

                        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                          {editExistingImages.map((image, index) => (
                            <div
                              key={`${image.id || image.imagePath}-${index}`}
                              className="overflow-hidden rounded-lg border border-neutral-200 bg-white"
                            >
                              <img
                                src={getImageUrl(image.imagePath)}
                                alt={`Linked product image ${index + 1}`}
                                className="h-16 w-full object-cover"
                              />
                              <div className="space-y-1 px-1.5 py-1">
                                <p className="truncate text-[9px] text-neutral-500" title={image.imagePath}>
                                  {image.imagePath}
                                </p>
                                {image.isPrimary && (
                                  <p className="text-[9px] font-semibold text-[#840d5c]">Primary image</p>
                                )}
                                {!image.isPrimary && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditProductDetail((current) => ({
                                        ...current,
                                        image: image.imagePath,
                                      }));
                                      setEditExistingImages((current) =>
                                        current.map((item) => ({
                                          ...item,
                                          isPrimary: item.imagePath === image.imagePath,
                                        }))
                                      );
                                      setEditPrimaryImagePreviewKey('');
                                    }}
                                    className="inline-flex h-5 w-full items-center justify-center rounded border border-neutral-300 text-[9px] font-semibold text-neutral-600 hover:bg-neutral-100"
                                  >
                                    Set as Primary
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExistingEditImage(image)}
                                  className="inline-flex h-5 w-full items-center justify-center rounded border border-[#e8bfd5] text-[9px] font-semibold text-[#6d0b4b] hover:bg-[#f7e8f1]"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[10px] text-neutral-500">
                        No linked images found for this product.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">REPLACE PRODUCT IMAGE FOLDER</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      {...({ webkitdirectory: '', directory: '' } as any)}
                      onChange={(e) => {
                        appendEditProductFolderFiles(
                          Array.from(e.target.files || []).map((file) => {
                            const withPath = file as File & { webkitRelativePath?: string };
                            return {
                              file,
                              relativePath: withPath.webkitRelativePath || file.name,
                            };
                          })
                        );
                        e.target.value = '';
                      }}
                      className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-xs"
                    />
                    {editProductImagePreviewItems.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearEditProductImages}
                        className="mt-2 inline-flex items-center gap-1 rounded-xl border border-[#e8bfd5] bg-[#f7e8f1] px-3 py-2 text-xs font-semibold text-[#6d0b4b] hover:bg-[#edd4e3]"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Clear
                      </button>
                    )}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsEditFolderDragActive(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsEditFolderDragActive(false);
                      }}
                      onDrop={handleEditFolderDrop}
                      className={`mt-2 rounded-xl border border-dashed p-3 text-xs ${isEditFolderDragActive
                          ? 'border-[#840d5c] bg-[#840d5c]/5 text-[#840d5c]'
                          : 'border-neutral-300 bg-neutral-50 text-neutral-600'
                        }`}
                    >
                      Drag and drop image folder here.
                    </div>
                    <p className="mt-1 text-[10px] text-neutral-500">
                      {editProductImages.length} image{editProductImages.length === 1 ? '' : 's'} selected.
                    </p>
                    {!!removedEditImagePaths.length && (
                      <p className="mt-1 text-[10px] font-semibold text-[#840d5c]">
                        {removedEditImagePaths.length} linked image{removedEditImagePaths.length === 1 ? '' : 's'} marked for removal.
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-neutral-500">
                      Files will be uploaded to Cloudinary folder <span className="font-bold">product_photos/{getRootFolderNameFromFiles(editProductImages) || 'foldername'}</span>.
                    </p>

                    {editProductImagePreviewItems.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {editProductImagePreviewItems.map((item, index) => (
                          <div key={item.key} className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                            <img
                              src={item.url}
                              alt={item.file.name || `Selected image ${index + 1}`}
                              className="h-16 w-full object-cover"
                            />
                            <div className="space-y-1 px-1.5 py-1">
                              <p className="truncate text-[9px] text-neutral-500" title={item.relativePath}>
                                {item.relativePath}
                              </p>
                              {editPrimaryImagePreviewKey === item.key ? (
                                <p className="text-[9px] font-semibold text-[#840d5c]">Primary image</p>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditPrimaryImagePreviewKey(item.key);
                                    setEditProductDetail((current) => ({
                                      ...current,
                                      image: '',
                                    }));
                                    setEditExistingImages((current) =>
                                      current.map((existing) => ({ ...existing, isPrimary: false }))
                                    );
                                  }}
                                  className="inline-flex h-5 w-full items-center justify-center rounded border border-neutral-300 text-[9px] font-semibold text-neutral-600 hover:bg-neutral-100"
                                >
                                  Set as Primary
                                </button>
                              )}
                              <button
                                type="button"
                                aria-label="Remove image"
                                onClick={() => handleRemoveEditProductImage(item)}
                                className="inline-flex h-5 w-full items-center justify-center rounded border border-neutral-300 text-[9px] font-semibold text-neutral-500 hover:bg-neutral-100"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isApiCallInProgress}
                    className="mt-4 w-full rounded-xl bg-[#840d5c] py-3 text-xs font-extrabold text-white hover:bg-[#840d5c]"
                  >
                    Save Product Changes
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
    </div>
  );
}
