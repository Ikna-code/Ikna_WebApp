'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Sliders,
  Upload,
  Trash2,
  Pencil,
  RotateCcw,
} from 'lucide-react';
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
  description?: string;
  sizes?: string[];
}

interface DbProduct {
  id: string;
  name: string;
  category: string;
  price: number | string;
  stock: number;
  image: string;
  tag?: string | null;
  reviews?: { rating: number }[];
  images?: { id: string; image_path: string; is_primary: boolean | null }[];
}

const STOCK_THRESHOLD = 20;

const parseSku = (value: string) => {
  const normalized = String(value || '').replace(/\D/g, '');
  const numeric = Number(normalized);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const getProductSku = (product: DbProduct, fallbackIndex: number) => {
  const primaryPath = product.images?.find((img) => img.is_primary)?.image_path || product.image || '';
  const folderName = primaryPath.split('/')[0] || '';
  const parsedFromPath = parseSku(folderName);

  if (parsedFromPath) {
    return String(parsedFromPath);
  }

  const parsedFromId = parseSku(product.id);
  if (parsedFromId) {
    return String(parsedFromId).slice(-6);
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
  const [newProductDetail, setNewProductDetail] = useState({
    name: '',
    price: '',
    stock: '',
    description: '',
    sizes: '',
    category: 'Bras',
    tag: 'Black',
  });

  const getImageUrl = (pathOrUrl: string) => {
    if (!pathOrUrl) return '';
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return pathOrUrl;
    }
    return `${IMAGE_BASE_URL}${pathOrUrl}`;
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
          description: '',
          sizes: [],
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

  const categories = ['All', ...Array.from(new Set(productDetails.map((p) => p.category)))];
  const styles = ['All', ...Array.from(new Set(productDetails.map((p) => p.color).filter(Boolean)))];

  const uploadImagesForSku = async (sku: string, files: File[]) => {
    if (!files.length) return [] as string[];

    const supabase = createClient();
    const uploadedPaths: string[] = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${sku}/${Date.now()}-${index}-${safeName}`;

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
        image: uploadedPaths[0] || undefined,
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
      });
      setProductImages([]);
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

    if (!confirm(`Delete ${selectedProducts.length} selected product(s)?`)) {
      return;
    }

    try {
      await Promise.all(
        selectedProducts.map((id) =>
          fetch(`/api/admin/products/${id}`, {
            method: 'DELETE',
          })
        )
      );
      await fetchProducts();
      setSelectedProducts([]);
    } catch {
      setErrorMessage('Failed to delete selected products.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      await fetchProducts();
      setSelectedProducts((current) => current.filter((item) => item !== id));
    } catch {
      setErrorMessage('Failed to delete product.');
    }
  };

  const handleEditProduct = async (product: ProductDetail) => {
    const name = prompt('Product name', product.name);
    if (!name) return;

    const priceInput = prompt('Price', String(product.price));
    if (!priceInput) return;

    const stockInput = prompt('Stock', String(product.stock));
    if (!stockInput) return;

    const category = prompt('Category', product.category);
    if (!category) return;

    const tag = prompt('Tag / Color', product.color);
    if (!tag) return;

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          price: Number(priceInput),
          stock: Number(stockInput),
          category: category.trim(),
          tag: tag.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update product');
      }

      await fetchProducts();
    } catch {
      setErrorMessage('Failed to update product.');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
            Global Admin
          </span>
          <h1 className="text-2xl font-black text-[#5b153b]">Product Management</h1>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 text-xs xl:w-auto xl:justify-end">
          <div className="bg-white px-4 py-2.5 rounded-2xl border border-neutral-200 shadow-sm flex items-center gap-3">
            <span className="text-neutral-400">Total Skus:</span>
            <span className="font-extrabold text-neutral-800">{totalSkus}</span>
            <span className="bg-neutral-100 px-2 py-0.5 rounded-md text-[10px] font-mono text-[#3d0d26]">SS</span>
          </div>
          <div className="bg-white px-4 py-2.5 rounded-2xl border border-neutral-200 shadow-sm flex items-center gap-3">
            <span className="text-neutral-400">Low Stock Alerts:</span>
            <span className="font-extrabold text-amber-600">{lowStockCount} Low Stocks</span>
            <span className="text-amber-500 text-xs">⚠️</span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="space-y-6">
        {/* Filter Panel Layer */}
        <div className="grid w-full grid-cols-1 gap-4 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1.2fr)] lg:items-end">
          <div className="min-w-0">
            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="w-full text-xs font-semibold bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2.5 outline-none focus:border-[#5b153b]"
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
              className="w-full text-xs font-semibold bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2.5 outline-none focus:border-[#5b153b]"
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
                max={Math.max(1500, ...productDetails.map((p) => p.price), 0)}
                value={maxPriceFilter}
                onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-[#5b153b]"
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
              className="w-full text-xs font-semibold bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2.5 outline-none focus:border-[#5b153b]"
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          <div className="space-y-5 lg:col-span-7 xl:col-span-8">

          {/* Actions Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedProducts(filteredProducts.map((product) => product.id))}
                title="Select visible products"
                aria-label="Select visible products"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-300 bg-neutral-50 font-semibold hover:bg-neutral-100"
              >
                <Filter className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setActiveCategory('All');
                  setActiveStyle('All');
                  setStockLevel('All');
                  setSearchQuery('');
                  setMaxPriceFilter(Math.max(1500, ...productDetails.map((p) => p.price), 0));
                }}
                title="Reset filters"
                aria-label="Reset filters"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-300 bg-neutral-50 font-semibold hover:bg-neutral-100"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
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
                onClick={handleArchiveSelected}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Selected
              </button>
            </div>
          </div>

          {/* Mobile Product Cards */}
          <div className="space-y-3 md:hidden">
            {!isLoading && paginatedProducts.map((p) => (
              <div key={p.id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 rounded border-neutral-300 text-[#5b153b]"
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
          <div className="hidden overflow-x-auto rounded-3xl border border-neutral-200 bg-white shadow-sm md:block">
            <table className="w-full min-w-180 border-collapse table-fixed text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-400 tracking-wider">
                  <th className="w-12 py-4 px-4">
                    <input
                      type="checkbox"
                      className="rounded border-neutral-300 text-[#5b153b]"
                      onChange={handleSelectAll}
                      checked={paginatedProducts.length > 0 && selectedProducts.length === paginatedProducts.length}
                    />
                  </th>
                  <th className="w-18 py-4 px-3 font-bold">Image</th>
                  <th className="w-24 py-4 px-3 font-bold">SKU</th>
                  <th className="py-4 px-3 font-bold">Name</th>
                  <th className="w-24 py-4 px-3 font-bold">Tag</th>
                  <th className="w-24 py-4 px-3 font-bold">Category</th>
                  <th className="w-20 py-4 px-3 font-bold text-right">Price</th>
                  <th className="w-20 py-4 px-3 font-bold text-right">Stock</th>
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
                        className="rounded border-neutral-300 text-[#5b153b]"
                        checked={selectedProducts.includes(p.id)}
                        onChange={() => handleSelectRow(p.id)}
                      />
                    </td>
                    <td className="py-4 px-3 align-middle">
                      <img src={getImageUrl(p.image)} className="w-10 h-10 object-cover rounded-xl border border-neutral-200" alt={p.name} />
                    </td>
                    <td className="py-4 px-3 align-middle font-mono font-bold text-neutral-800">{p.sku}</td>
                    <td className="py-4 px-3 align-middle text-neutral-800 truncate">{p.name}</td>
                    <td className="py-4 px-3 align-middle">
                      <span className="bg-neutral-100 px-2.5 py-1 rounded-lg text-[10px] font-bold text-neutral-700">
                        {p.color}
                      </span>
                    </td>
                    <td className="py-4 px-3 align-middle">{p.category}</td>
                    <td className="py-4 px-3 align-middle text-right font-semibold text-neutral-900">₹{p.price}</td>
                    <td className="py-4 px-3 align-middle text-right font-semibold text-neutral-900">{p.stock}</td>
                    <td className="py-4 px-3 align-middle text-[10px] text-neutral-400 font-semibold">{p.salesVelocity}</td>
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
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && paginatedProducts.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center font-semibold text-neutral-400">
                      No products found for the selected filters.
                    </td>
                  </tr>
                )}
                {isLoading && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center font-semibold text-neutral-400">
                      Loading products...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && filteredProducts.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-xs shadow-sm">
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
                <span className="min-w-22 text-center font-bold text-[#5b153b]">
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

        {/* Side Add Wizard */}
        <div className="space-y-6 lg:col-span-5 xl:col-span-4">
          <form onSubmit={handleAddProductDetail} className="bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200 shadow-sm">
            <h3 className="text-base font-black text-[#5b153b] mb-4">New Product Wizard</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-black tracking-widest text-neutral-400 mb-1">
                  NAME
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter short title..."
                  value={newProductDetail.name}
                  onChange={(e) => setNewProductDetail({ ...newProductDetail, name: e.target.value })}
                  className="w-full text-xs border border-neutral-300 rounded-xl px-3 py-2.5 outline-none focus:border-[#5b153b]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black tracking-widest text-neutral-400 mb-1">
                    CATEGORY
                  </label>
                  <select
                    value={newProductDetail.category}
                    onChange={(e) => setNewProductDetail({ ...newProductDetail, category: e.target.value })}
                    className="w-full text-xs border border-neutral-300 rounded-xl px-3 py-2.5"
                  >
                    {['Bras', 'Briefs', 'Sets', 'Others'].map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black tracking-widest text-neutral-400 mb-1">
                    TAG
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Black"
                    value={newProductDetail.tag}
                    onChange={(e) => setNewProductDetail({ ...newProductDetail, tag: e.target.value })}
                    className="w-full text-xs border border-neutral-300 rounded-xl px-3 py-2.5"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black tracking-widest text-neutral-400 mb-1">
                  DESCRIPTION
                </label>
                <textarea
                  required
                  placeholder="Enter product description..."
                  value={newProductDetail.description}
                  onChange={(e) => setNewProductDetail({ ...newProductDetail, description: e.target.value })}
                  className="w-full min-h-20 text-xs border border-neutral-300 rounded-xl px-3 py-2.5"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black tracking-widest text-neutral-400 mb-1">
                  SIZES (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 32B, 34B, 36C"
                  value={newProductDetail.sizes}
                  onChange={(e) => setNewProductDetail({ ...newProductDetail, sizes: e.target.value })}
                  className="w-full text-xs border border-neutral-300 rounded-xl px-3 py-2.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black tracking-widest text-neutral-400 mb-1">
                    PRICE (₹)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 480"
                    value={newProductDetail.price}
                    onChange={(e) => setNewProductDetail({ ...newProductDetail, price: e.target.value })}
                    className="w-full text-xs border border-neutral-300 rounded-xl px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black tracking-widest text-neutral-400 mb-1">
                    INITIAL STOCK
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 100"
                    value={newProductDetail.stock}
                    onChange={(e) => setNewProductDetail({ ...newProductDetail, stock: e.target.value })}
                    className="w-full text-xs border border-neutral-300 rounded-xl px-3 py-2.5"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black tracking-widest text-neutral-400 mb-1">
                  PRODUCT IMAGES (MULTIPLE)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setProductImages(Array.from(e.target.files || []))}
                  className="w-full text-xs border border-neutral-300 rounded-xl px-3 py-2.5 bg-white"
                />
                <p className="mt-1 text-[10px] text-neutral-500">
                  Files will be uploaded to Supabase bucket <span className="font-bold">products</span> under folder <span className="font-bold">{nextSku}</span>.
                </p>
              </div>
              <button
                type="submit"
                disabled={isUploadingImages}
                className="w-full bg-[#3d0d26] text-white text-xs py-3 rounded-xl font-extrabold hover:bg-[#5b153b] mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isUploadingImages ? 'Uploading Images + Creating SKU...' : 'Create and Launch SKU'}
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}