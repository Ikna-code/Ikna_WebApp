'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  ChevronDown,
  Filter,
  Sliders,
  Upload,
  FolderOpen,
} from 'lucide-react';

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
}

export default function ProductManagementDashboard() {
  const [productDetails, setProductDetails] = useState<ProductDetail[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('Bras');
  const [activeStyle, setActiveStyle] = useState('Padded');
  const [stockLevel, setStockLevel] = useState('In Stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [newProductDetail, setNewProductDetail] = useState({
    name: '',
    price: '',
    stock: '',
    category: 'Bras',
    color: 'Black',
  });

  // Fetch Product Data
  useEffect(() => {
    const fetchProducts = async () => {
      const dbProductDetails: ProductDetail[] = [
        { id: '1', sku: '205000', name: 'Barely there comfy bra', color: 'Black', category: 'Bras', price: 2400, stock: 200, salesVelocity: '15 units/week', image: 'https://images.unsplash.com/photo-1567016549366-5f3194bab37b?w=100&auto=format&fit=crop' },
        { id: '2', sku: '203006', name: 'Barely there - Light padded...', color: 'Rose', category: 'Briefs', price: 4480, stock: 100, salesVelocity: '15 units/week', image: 'https://images.unsplash.com/photo-1583743814966-8936f5b741aa?w=100&auto=format&fit=crop' },
      ];
      setProductDetails(dbProductDetails);
    };
    fetchProducts();
  }, []);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedProducts(productDetails.map((p) => p.id));
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

  const handleAddProductDetail = (e: React.FormEvent) => {
    e.preventDefault();
    const p: ProductDetail = {
      id: Date.now().toString(),
      sku: Math.floor(100000 + Math.random() * 900000).toString(),
      name: newProductDetail.name || 'New Product Item',
      color: newProductDetail.color,
      category: newProductDetail.category,
      price: parseFloat(newProductDetail.price) || 2400,
      stock: parseInt(newProductDetail.stock) || 50,
      salesVelocity: '0 units/week',
      image: 'https://images.unsplash.com/photo-1567016549366-5f3194bab37b?w=100&auto=format&fit=crop',
    };
    setProductDetails([...productDetails, p]);
    setNewProductDetail({ name: '', price: '', stock: '', category: 'Bras', color: 'Black' });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
            Global Admin
          </span>
          <h1 className="text-2xl font-black text-[#5b153b]">Product Management</h1>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="bg-white px-4 py-2.5 rounded-2xl border border-neutral-200 shadow-sm flex items-center gap-3">
            <span className="text-neutral-400">Total Skus:</span>
            <span className="font-extrabold text-neutral-800">162</span>
            <span className="bg-neutral-100 px-2 py-0.5 rounded-md text-[10px] font-mono text-[#3d0d26]">SS</span>
          </div>
          <div className="bg-white px-4 py-2.5 rounded-2xl border border-neutral-200 shadow-sm flex items-center gap-3">
            <span className="text-neutral-400">Low Stock Alerts:</span>
            <span className="font-extrabold text-amber-600">2 Low Stocks</span>
            <span className="text-amber-500 text-xs">⚠️</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Filter Panel Layer */}
          <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm flex flex-wrap gap-6 items-center">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                className="w-full text-xs font-semibold bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2.5 outline-none focus:border-[#5b153b]"
              >
                {['Bras', 'Briefs', 'Sets', 'Etc..', 'Others...'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-1">
                Style
              </label>
              <select
                value={activeStyle}
                onChange={(e) => setActiveStyle(e.target.value)}
                className="w-full text-xs font-semibold bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2.5 outline-none focus:border-[#5b153b]"
              >
                {['Padded', 'Wireless', 'Sports', 'Seamless', 'Spors'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-1">
                Price Range
              </label>
              <div className="flex items-center gap-3 bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2.5">
                <span className="text-[9px] font-bold text-neutral-400">₹0</span>
                <input
                  type="range"
                  min="0"
                  max="1500"
                  className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-[#5b153b]"
                />
                <span className="text-[9px] font-bold text-neutral-400">₹1,500</span>
              </div>
            </div>

            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-1">
                Stock Level
              </label>
              <select
                value={stockLevel}
                onChange={(e) => setStockLevel(e.target.value)}
                className="w-full text-xs font-semibold bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2.5 outline-none focus:border-[#5b153b]"
              >
                {['In Stock', 'Low Stock', 'Out of Stock'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[180px]">
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

          {/* Actions Toolbar */}
          <div className="flex justify-between items-center flex-wrap gap-3 bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm">
            <div className="flex items-center gap-3">
              <button className="text-xs border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 px-3 py-2 rounded-xl flex items-center gap-2 font-semibold">
                <Filter className="w-4 h-4" /> Multi-select
              </button>
              <button className="text-xs border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 px-3 py-2 rounded-xl flex items-center gap-2 font-semibold">
                More <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="text-xs border border-neutral-300 px-3 py-2 rounded-xl flex items-center gap-1 font-semibold text-neutral-700">
                <Sliders className="w-3.5 h-3.5" /> Bulk Edit Price
              </button>
              <button className="text-xs border border-neutral-300 px-3 py-2 rounded-xl flex items-center gap-1 font-semibold text-neutral-700">
                <Upload className="w-3.5 h-3.5" /> Bulk Update Stock
              </button>
              <button className="text-xs border border-rose-200 px-3 py-2 rounded-xl flex items-center gap-1 font-semibold text-rose-600 hover:bg-rose-50">
                <FolderOpen className="w-3.5 h-3.5" /> Archive Selected
              </button>
            </div>
          </div>

          {/* Product Table */}
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-400 tracking-wider">
                  <th className="py-4 px-6">
                    <input
                      type="checkbox"
                      className="rounded border-neutral-300 text-[#5b153b]"
                      onChange={handleSelectAll}
                      checked={selectedProducts.length === productDetails.length && productDetails.length > 0}
                    />
                  </th>
                  <th className="py-4 font-bold">Product Image</th>
                  <th className="py-4 font-bold">SKU</th>
                  <th className="py-4 font-bold">Name</th>
                  <th className="py-4 font-bold">Color</th>
                  <th className="py-4 font-bold">Category</th>
                  <th className="py-4 font-bold">Price</th>
                  <th className="py-4 font-bold">Current Stock</th>
                  <th className="py-4 font-bold">Sales Velocity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-600 font-medium">
                {productDetails.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50 transition cursor-pointer">
                    <td className="py-5 px-6">
                      <input
                        type="checkbox"
                        className="rounded border-neutral-300 text-[#5b153b]"
                        checked={selectedProducts.includes(p.id)}
                        onChange={() => handleSelectRow(p.id)}
                      />
                    </td>
                    <td className="py-3">
                      <img src={p.image} className="w-10 h-10 object-cover rounded-xl border border-neutral-200" alt={p.name} />
                    </td>
                    <td className="py-3 font-mono font-bold text-neutral-800">{p.sku}</td>
                    <td className="py-3 text-neutral-800 max-w-[150px] truncate">{p.name}</td>
                    <td className="py-3">
                      <span className="bg-neutral-100 px-2.5 py-1 rounded-lg text-[10px] font-bold text-neutral-700">
                        {p.color}
                      </span>
                    </td>
                    <td className="py-3">{p.category}</td>
                    <td className="py-3 font-semibold text-neutral-900">₹{p.price}</td>
                    <td className="py-3 font-semibold text-neutral-900">{p.stock}</td>
                    <td className="py-3 text-[10px] text-neutral-400 font-semibold">{p.salesVelocity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Add Wizard */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
          <form onSubmit={handleAddProductDetail} className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
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
              <button type="submit" className="w-full bg-[#3d0d26] text-white text-xs py-3 rounded-xl font-extrabold hover:bg-[#5b153b] mt-4">
                Create and Launch SKU
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}