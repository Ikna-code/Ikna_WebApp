'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Sliders,
  Download,
  Upload,
  Trash2,
  Pencil,
  RotateCcw,
  Plus,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { createClient } from '@/backend/lib/supabaseClient';
import { IMAGE_BASE_URL } from '@/public/constants/constants';

// --- Interfaces ---
interface ProductDetail {
  id: string;
  sku: string;
  name: string;
  color: string;
  category: string;
  price: number;
  stock: number;
  salesVelocity: string;
  image: string;
  description: string;
  sizes: string[];
  rating: number | null;
  createdAt: string;
  images: { id: string; image_path: string; is_primary: boolean | null }[];
}

interface DbProduct {
  id: string;
  name: string;
  category: string;
  price: number | string;
  stock: number;
  image: string;
  description: string;
  sizes: string[];
  createdAt: string;
  rating?: number | null;
  tag?: string | null;
  reviews?: { rating: number }[];
  images?: { id: string; image_path: string; is_primary: boolean | null }[];
}

interface ProductFormState {
  name: string;
  price: string;
  stock: string;
  description: string;
  sizes: string;
  category: string;
  tag: string;
  image: string;
  rating: string;
}

interface DeleteModalState {
  isOpen: boolean;
  mode: 'single' | 'bulk';
  productId: string | null;
  count: number;
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

export default function ProductManagementDashboard() {
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
    tag: 'Black',
    image: '',
    rating: '',
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
  const [editProductImagePreviewItems, setEditProductImagePreviewItems] = useState<ImportImagePreviewItem[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [editingProductId, setEditingProductId] = useState('');
  const [editingProductSku, setEditingProductSku] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
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
    tag: 'Black',
    image: '',
    rating: '',
  });
  const [editProductImages, setEditProductImages] = useState<File[]>([]);
  const [editExistingImages, setEditExistingImages] = useState<EditableExistingImage[]>([]);
  const [removedEditImageIds, setRemovedEditImageIds] = useState<string[]>([]);
  const [removedEditImagePaths, setRemovedEditImagePaths] = useState<string[]>([]);

  const getImageUrl = (pathOrUrl: string) => {
    if (!pathOrUrl) return '';
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return pathOrUrl;
    }
    return `${IMAGE_BASE_URL}${pathOrUrl}`;
  };

  const getBucketFolderFromPath = (pathOrUrl: string) => {
    if (!pathOrUrl) return '';

    const normalized = String(pathOrUrl).trim().replace(/\\/g, '/');
    let storagePath = normalized;

    if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
      const marker = '/storage/v1/object/public/products/';
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
      const mappedProducts = products.map((product, index) => {
        const price = Number(product.price);
        const reviewCount = product.reviews?.length || 0;
        const primaryPath = product.images?.find((img) => img.is_primary)?.image_path || product.image;

        return {
          id: product.id,
          sku: getProductSku(product, index),
          name: product.name,
          color: product.tag || 'N/A',
          category: product.category,
          price,
          stock: product.stock,
          salesVelocity: `${Math.max(0, Math.round(reviewCount / 2))} units/week`,
          image: primaryPath,
          description: product.description || '',
          sizes: product.sizes || [],
          rating: typeof product.rating === 'number' ? product.rating : null,
          createdAt: product.createdAt,
          images: Array.isArray(product.images) ? product.images : [],
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
    const syncViewport = () => {
      setIsMobileViewport(window.innerWidth < 1024);
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);

    return () => window.removeEventListener('resize', syncViewport);
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

  const uploadImagesForSku = async (sku: string, files: File[]) => {
    if (!files.length) return [] as string[];

    const supabase = createClient();
    const uploadedPaths: string[] = [];

    const sanitizePathSegment = (value: string) =>
      String(value || '')
        .trim()
        .replace(/[^a-zA-Z0-9._-]/g, '_');

    const rootFolder = sanitizePathSegment(getRootFolderNameFromFiles(files));

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const withPath = file as File & { webkitRelativePath?: string; _relativePath?: string };
      const relativePath = withPath._relativePath || withPath.webkitRelativePath || file.name;
      const normalizedRelative = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
      const trimmedRelativeParts =
        rootFolder && normalizedRelative[0] === getRootFolderNameFromFiles(files)
          ? normalizedRelative.slice(1)
          : normalizedRelative;
      const safeParts = trimmedRelativeParts.map((part) => sanitizePathSegment(part));
      const safeFileName = safeParts[safeParts.length - 1] || sanitizePathSegment(file.name);
      const safeDirs = safeParts.slice(0, -1).join('/');
      const basePath = `product_photos/${rootFolder || sku}`;
      const storagePath = safeDirs
        ? `${basePath}/${safeDirs}/${Date.now()}-${index}-${safeFileName}`
        : `${basePath}/${Date.now()}-${index}-${safeFileName}`;

      const { error } = await supabase.storage.from('products').upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) {
        throw new Error(`Image upload failed: ${error.message}`);
      }

      uploadedPaths.push(storagePath);
    }

    return uploadedPaths;
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

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, activeStyle, stockLevel, searchQuery, maxPriceFilter]);

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
    setErrorMessage('');
    setIsUploadingImages(true);

    try {
      const folderSku = nextSku.trim();
      if (!folderSku) {
        throw new Error('SKU is required');
      }

      const uploadedPaths = await uploadImagesForSku(folderSku, productImages);

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
        tag: newProductDetail.tag,
        image: newProductDetail.image.trim() || uploadedPaths[0] || undefined,
        rating: newProductDetail.rating ? Number(newProductDetail.rating) : null,
        imagePaths: uploadedPaths,
      };

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to create product');
      }

      setNextSku(String((parseSku(folderSku) || Number(nextSku) || 200000) + 1));
      setNewProductDetail({
        name: '',
        price: '',
        stock: '',
        description: '',
        sizes: '',
        category: 'Bras',
        tag: 'Black',
        image: '',
        rating: '',
      });
      handleClearAddProductImages();
      setIsAddModalOpen(false);
      await fetchProducts();
    } catch {
      setErrorMessage('Failed to create product.');
    } finally {
      setIsUploadingImages(false);
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
      await fetchProducts();
      setSelectedProducts([]);
    } catch {
      setErrorMessage('Failed to update prices.');
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
      await fetchProducts();
      setSelectedProducts([]);
    } catch {
      setErrorMessage('Failed to update stock.');
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
      await fetchProducts();
    } catch {
      setErrorMessage(
        deleteModal.mode === 'bulk'
          ? 'Failed to delete selected products.'
          : 'Failed to delete product.'
      );
    } finally {
      setIsDeleting(false);
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
      tag: product.color,
      image: product.image,
      rating: product.rating != null ? String(product.rating) : '',
    });

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
    setRemovedEditImageIds([]);
    setRemovedEditImagePaths([]);
    handleClearEditProductImages();
    setIsEditModalOpen(true);
  };

  const handleRemoveExistingEditImage = (image: EditableExistingImage) => {
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

  const handleUpdateProductDetail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingProductId) return;

    try {
      const uploadedPaths = await uploadImagesForSku(editingProductSku || nextSku, editProductImages);
      const sizes = editProductDetail.sizes
        .split(',')
        .map((size) => size.trim())
        .filter(Boolean);

      const currentPrimaryPath = editProductDetail.image.trim();
      const removedPaths = new Set(removedEditImagePaths);
      const primaryWasRemoved = Boolean(currentPrimaryPath && removedPaths.has(currentPrimaryPath));
      const fallbackPrimaryFromExisting = editExistingImages.find(
        (image) => image.isPrimary && !removedPaths.has(image.imagePath)
      )?.imagePath;
      const fallbackPathFromExisting = editExistingImages.find(
        (image) => !removedPaths.has(image.imagePath)
      )?.imagePath;

      const resolvedPrimaryImage =
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
          tag: editProductDetail.tag.trim(),
          image: resolvedPrimaryImage,
          rating: editProductDetail.rating ? Number(editProductDetail.rating) : null,
          imagePaths: uploadedPaths.length ? uploadedPaths : undefined,
          removeImageIds: removedEditImageIds,
          removeImagePaths: removedEditImagePaths,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update product');
      }

      setIsEditModalOpen(false);
      setEditingProductId('');
      setEditingProductSku('');
      setEditExistingImages([]);
      setRemovedEditImageIds([]);
      setRemovedEditImagePaths([]);
      handleClearEditProductImages();
      await fetchProducts();
    } catch {
      setErrorMessage('Failed to update product.');
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

      await fetchProducts();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to import products.');
    } finally {
      setIsImporting(false);
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
          tag: 'Black',
          rating: 4.5,
          sizes: '32B,34B,36C',
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

  const handleRemoveImportImage = (itemToRemove: ImportImagePreviewItem) => {
    setImportImagePreviewItems((current) => {
      const next = current.filter((item) => item.key !== itemToRemove.key);
      URL.revokeObjectURL(itemToRemove.url);
      setImportImageFiles(next.map((item) => item.file));
      return next;
    });
  };

  const handleRemoveAddProductImage = (itemToRemove: ImportImagePreviewItem) => {
    setAddProductImagePreviewItems((current) => {
      const next = current.filter((item) => item.key !== itemToRemove.key);
      URL.revokeObjectURL(itemToRemove.url);
      setProductImages(next.map((item) => item.file));
      return next;
    });
  };

  const handleClearAddProductImages = () => {
    setAddProductImagePreviewItems((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
    setProductImages([]);
  };

  const handleRemoveEditProductImage = (itemToRemove: ImportImagePreviewItem) => {
    setEditProductImagePreviewItems((current) => {
      const next = current.filter((item) => item.key !== itemToRemove.key);
      URL.revokeObjectURL(itemToRemove.url);
      setEditProductImages(next.map((item) => item.file));
      return next;
    });
  };

  const handleClearEditProductImages = () => {
    setEditProductImagePreviewItems((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
    setEditProductImages([]);
  };

  const handleClearImportImages = () => {
    setImportImagePreviewItems((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
    setImportImageFiles([]);
  };

  const closeImportModal = () => {
    if (isImporting) return;
    setImportImagePreviewItems((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
    setImportImageFiles([]);
    setIsImportModalOpen(false);
  };

  const closeAddModal = () => {
    if (isUploadingImages) return;
    handleClearAddProductImages();
    setIsAddModalOpen(false);
  };

  const closeEditModal = () => {
    handleClearEditProductImages();
    setEditExistingImages([]);
    setRemovedEditImageIds([]);
    setRemovedEditImagePaths([]);
    setIsEditModalOpen(false);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
            Global Admin
          </span>
          <h1 className="text-2xl font-black text-[#840d5c]">Product Management</h1>
        </div>
        <div className="flex w-full flex-nowrap items-center gap-3 overflow-x-auto pb-1 text-xs xl:w-auto xl:justify-end">
          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 shadow-sm">
            <span className="text-neutral-400">Total Skus:</span>
            <span className="rounded-full bg-[#840d5c]/10 px-2.5 py-0.5 text-[10px] font-extrabold text-[#840d5c]">
              {totalSkus}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 shadow-sm">
            <span className="text-neutral-400">Low Stock Alerts:</span>
            <span className="font-extrabold text-[#840d5c]">{lowStockCount} Low Stocks</span>
            <span className="text-[#a33c82] text-xs">⚠️</span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="space-y-6">
        {/* Desktop Filter Panel */}
        <div className="hidden w-full grid-cols-1 gap-4 p-0 sm:p-0 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1.2fr)] lg:items-end">
          <div className="min-w-0">
            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="w-full text-xs font-semibold bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2.5 outline-none focus:border-[#840d5c]"
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-1">
              Style
            </label>
            <select
              value={activeStyle}
              onChange={(e) => setActiveStyle(e.target.value)}
              className="w-full text-xs font-semibold bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2.5 outline-none focus:border-[#840d5c]"
            >
              {styles.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-1">
              Price Range
            </label>
            <div className="flex items-center gap-3 bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2.5">
              <span className="text-[9px] font-bold text-neutral-400">₹0</span>
              <input
                type="range"
                min="0"
                max={maxPriceLimit}
                value={maxPriceFilter}
                onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-[#840d5c]"
              />
              <span className="text-[9px] font-bold text-neutral-400">₹{maxPriceFilter}</span>
            </div>
          </div>

          <div className="min-w-0">
            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-1">
              Stock Level
            </label>
            <select
              value={stockLevel}
              onChange={(e) => setStockLevel(e.target.value)}
              className="w-full text-xs font-semibold bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2.5 outline-none focus:border-[#840d5c]"
            >
              {['All', 'In Stock', 'Low Stock', 'Out of Stock'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-1">
              Global Search
            </label>
            <div className="flex items-center gap-2 border border-neutral-300 bg-neutral-50 rounded-xl px-3 py-2.5">
              <Search className="w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search query..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs outline-none w-full text-neutral-700"
              />
            </div>
          </div>
        </div>

        <div className="space-y-5">

          {/* Actions Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleBulkEditPrice}
                title="Bulk edit price"
                aria-label="Bulk edit price"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-300 text-neutral-700"
              >
                <Sliders className="h-4 w-4" />
              </button>
              <button
                onClick={handleBulkUpdateStock}
                title="Bulk update stock"
                aria-label="Bulk update stock"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-300 text-neutral-700"
              >
                <Upload className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsFilterSheetOpen(true)}
                title="Open filters"
                aria-label="Open filters"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-300 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 lg:hidden"
              >
                <Filter className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#840d5c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#840d5c] lg:hidden"
              >
                <Plus className="h-3.5 w-3.5" /> Add Product
              </button>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 md:justify-end lg:w-auto">
              <button
                onClick={openImportModal}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
              >
                <Upload className="h-3.5 w-3.5" /> Import Excel
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="hidden items-center gap-2 rounded-xl bg-[#840d5c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#840d5c] lg:inline-flex"
              >
                <Plus className="h-3.5 w-3.5" /> Add Product
              </button>
              <button
                onClick={handleArchiveSelected}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#840d5c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#6d0b4b] lg:w-auto lg:border lg:border-[#e8bfd5] lg:bg-transparent lg:text-[#840d5c] lg:hover:bg-[#f7e8f1]"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Selected
              </button>
            </div>
          </div>

          {/* Mobile Product Cards */}
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
                  <div>
                    <p className="font-bold uppercase tracking-wider text-neutral-400">Velocity</p>
                    <p className="mt-0.5 font-semibold text-neutral-900">{p.salesVelocity}</p>
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
            <table className="w-full min-w-7xl border-collapse table-auto text-left text-xs">
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
                  <th className="w-18 py-4 px-3 font-bold">Image</th>
                  <th className="w-24 py-4 px-3 font-bold">SKU</th>
                  <th className="w-32 py-4 px-3 font-bold">Product ID</th>
                  <th className="w-44 py-4 px-3 font-bold">Name</th>
                  <th className="w-56 py-4 px-3 font-bold">Description</th>
                  <th className="w-32 py-4 px-3 font-bold">Sizes</th>
                  <th className="w-24 py-4 px-3 font-bold">Tag</th>
                  <th className="w-24 py-4 px-3 font-bold">Category</th>
                  <th className="w-20 py-4 px-3 font-bold text-right">Rating</th>
                  <th className="w-20 py-4 px-3 font-bold text-right">Price</th>
                  <th className="w-20 py-4 px-3 font-bold text-right">Stock</th>
                  <th className="w-36 py-4 px-3 font-bold">Created At</th>
                  <th className="w-28 py-4 px-3 font-bold">Velocity</th>
                  <th className="w-24 py-4 px-3 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-600 font-medium">
                {!isLoading && paginatedProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50 transition cursor-pointer">
                    <td className="py-4 px-4 align-middle">
                      <input
                        type="checkbox"
                        className="rounded border-neutral-300 text-[#840d5c]"
                        checked={selectedProducts.includes(p.id)}
                        onChange={() => handleSelectRow(p.id)}
                      />
                    </td>
                    <td className="py-4 px-3 align-middle">
                      <img src={getImageUrl(p.image)} className="w-10 h-10 object-cover rounded-xl border border-neutral-200" alt={p.name} />
                    </td>
                    <td className="py-4 px-3 align-middle font-mono font-bold text-neutral-800 whitespace-nowrap">{p.sku}</td>
                    <td className="max-w-32 py-4 px-3 align-middle font-mono text-[10px] text-neutral-500 truncate" title={p.id}>{p.id}</td>
                    <td className="max-w-44 py-4 px-3 align-middle text-neutral-800 truncate" title={p.name}>{p.name}</td>
                    <td className="py-4 px-3 align-middle text-[11px] text-neutral-600">
                      <p className="max-w-56 truncate whitespace-nowrap" title={p.description}>
                        {p.description || 'N/A'}
                      </p>
                    </td>
                    <td className="py-4 px-3 align-middle">
                      <p className="max-w-32 truncate whitespace-nowrap text-[10px] text-neutral-600" title={p.sizes.join(', ')}>
                        {p.sizes.length ? p.sizes.join(', ') : 'N/A'}
                      </p>
                    </td>
                    <td className="py-4 px-3 align-middle whitespace-nowrap">
                      <span className="bg-neutral-100 px-2.5 py-1 rounded-lg text-[10px] font-bold text-neutral-700">
                        {p.color}
                      </span>
                    </td>
                    <td className="py-4 px-3 align-middle whitespace-nowrap">{p.category}</td>
                    <td className="py-4 px-3 align-middle text-right font-semibold text-neutral-900">
                      {p.rating != null ? p.rating.toFixed(1) : 'N/A'}
                    </td>
                    <td className="py-4 px-3 align-middle text-right font-semibold text-neutral-900">₹{p.price}</td>
                    <td className="py-4 px-3 align-middle text-right font-semibold text-neutral-900">{p.stock}</td>
                    <td className="py-4 px-3 align-middle text-[11px] text-neutral-500 whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-3 align-middle text-[10px] text-neutral-400 font-semibold whitespace-nowrap">{p.salesVelocity}</td>
                    <td className="py-4 px-3 align-middle">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditProduct(p)}
                          title="Edit product"
                          aria-label="Edit product"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p.id)}
                          title="Delete product"
                          aria-label="Delete product"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e8bfd5] text-[#840d5c] hover:bg-[#f7e8f1]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && paginatedProducts.length === 0 && (
                  <tr>
                    <td colSpan={15} className="py-8 text-center font-semibold text-neutral-400">
                      No products found for the selected filters.
                    </td>
                  </tr>
                )}
                {isLoading && (
                  <tr>
                    <td colSpan={15} className="py-8 text-center font-semibold text-neutral-400">
                      Loading products...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && filteredProducts.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1 text-xs">
              <p className="font-semibold text-neutral-500">
                Showing {pageStart + 1}-{Math.min(pageStart + itemsPerPage, filteredProducts.length)} of {filteredProducts.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPageSafe === 1}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 font-semibold text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="min-w-22 text-center font-bold text-[#840d5c]">
                  Page {currentPageSafe} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPageSafe === totalPages}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 font-semibold text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
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
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-neutral-400">Style</label>
                  <select
                    value={activeStyle}
                    onChange={(e) => setActiveStyle(e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2.5 text-xs font-semibold outline-none focus:border-[#840d5c]"
                  >
                    {styles.map((s) => (
                      <option key={s}>{s}</option>
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
                    <h3 className="text-base font-black text-[#840d5c]">Confirm Delete</h3>
                    <p className="mt-2 text-sm text-neutral-600">
                      {deleteModal.mode === 'bulk'
                        ? `Delete ${deleteModal.count} selected product${deleteModal.count === 1 ? '' : 's'}?`
                        : 'Delete this product?'}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      This action cannot be undone.
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
                    disabled={isDeleting}
                    className="flex-1 rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDelete}
                    disabled={isDeleting}
                    className="flex-1 rounded-xl bg-[#840d5c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6d0b4b] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
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
                      className={`mt-2 rounded-xl border border-dashed p-3 text-xs ${
                        isFolderDragActive
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
                      Uploaded images are stored in Supabase bucket <span className="font-bold">products</span>
                      inside folder <span className="font-bold">product_photos</span>.
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
                    disabled={isImporting || !hasDownloadedImportTemplate || !importExcelFile}
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">CATEGORY</label>
                      <select
                        value={newProductDetail.category}
                        onChange={(e) => setNewProductDetail({ ...newProductDetail, category: e.target.value })}
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                      >
                        {['Bras', 'Briefs', 'Sets', 'Others'].map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">TAG</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Black"
                        value={newProductDetail.tag}
                        onChange={(e) => setNewProductDetail({ ...newProductDetail, tag: e.target.value })}
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                      />
                    </div>
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
                    <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">SIZES (comma separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. 32B, 34B, 36C"
                      value={newProductDetail.sizes}
                      onChange={(e) => setNewProductDetail({ ...newProductDetail, sizes: e.target.value })}
                      className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
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
                      className={`mt-2 rounded-xl border border-dashed p-3 text-xs ${
                        isAddFolderDragActive
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
                      Files will be uploaded to Supabase bucket <span className="font-bold">products</span> under folder <span className="font-bold">product_photos/{getRootFolderNameFromFiles(productImages) || 'foldername'}</span>.
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
                            <div className="flex items-center justify-between gap-1 px-1.5 py-1">
                              <p className="truncate text-[9px] text-neutral-500" title={item.relativePath}>
                                {item.relativePath}
                              </p>
                              <button
                                type="button"
                                aria-label="Remove image"
                                onClick={() => handleRemoveAddProductImage(item)}
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
                  <button
                    type="submit"
                    disabled={isUploadingImages}
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
                      <input
                        type="text"
                        required
                        value={editProductDetail.category}
                        onChange={(e) => setEditProductDetail({ ...editProductDetail, category: e.target.value })}
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">TAG</label>
                      <input
                        type="text"
                        required
                        value={editProductDetail.tag}
                        onChange={(e) => setEditProductDetail({ ...editProductDetail, tag: e.target.value })}
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                      />
                    </div>
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
                    <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">SIZES (comma separated)</label>
                    <input
                      type="text"
                      value={editProductDetail.sizes}
                      onChange={(e) => setEditProductDetail({ ...editProductDetail, sizes: e.target.value })}
                      className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs"
                    />
                  </div>

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
                    <label className="mb-1 block text-[9px] font-black tracking-widest text-neutral-400">LINKED SUPABASE IMAGES</label>
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
                      className={`mt-2 rounded-xl border border-dashed p-3 text-xs ${
                        isEditFolderDragActive
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
                      Files will be uploaded to Supabase bucket <span className="font-bold">products</span> under folder <span className="font-bold">product_photos/{getRootFolderNameFromFiles(editProductImages) || 'foldername'}</span>.
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
                            <div className="flex items-center justify-between gap-1 px-1.5 py-1">
                              <p className="truncate text-[9px] text-neutral-500" title={item.relativePath}>
                                {item.relativePath}
                              </p>
                              <button
                                type="button"
                                aria-label="Remove image"
                                onClick={() => handleRemoveEditProductImage(item)}
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

                  <button
                    type="submit"
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
    </div>
  );
}
