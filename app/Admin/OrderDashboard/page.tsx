'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Search, ChevronDown, Check, Clock3, Package, Truck, CheckCircle2, RotateCcw, LucideIcon, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getOptimizedSupabaseImageUrl } from '@/lib/supabaseImage';

interface Order {
  id: string;
  date: string;
  rawDate: string; // Kept to sort orders efficiently chronologically
  customer: string;
  items: string;
  total: number;
  status: 'Processing' | 'In Transit' | 'Packed' | 'Delivered' | 'Cancelled';
  orderItems: Array<{
    id: string;
    quantity: number;
    price: number;
    selectedSize?: string | null;
    productName: string;
    productImage: string;
  }>;
}

type BackendOrder = {
  id: string;
  status?: string;
  totalAmount?: number | string;
  createdAt?: string;
  user?: {
    email?: string;
    firstName?: string | null;
    lastName?: string | null;
  };
  orderItems?: Array<{
    id: string;
    quantity?: number;
    price?: number | string;
    selectedSize?: string | null;
    productName?: string | null;
    productImage?: string | null;
    productColorName?: string | null;
    productSize?: string | null;
    productSlug?: string | null;
  }>;
};

// FIX: Changed pagination limit to 10 items per page
const ITEMS_PER_PAGE = 10;
const ORDER_STATUSES: Array<Exclude<Order['status'], 'Cancelled'>> = ['Processing', 'Packed', 'In Transit', 'Delivered'];

const statusBadgeClassMap: Record<Order['status'], string> = {
  Processing: 'bg-amber-100 text-amber-800 border-amber-200',
  Packed: 'bg-violet-100 text-violet-800 border-violet-200',
  'In Transit': 'bg-sky-100 text-sky-800 border-sky-200',
  Delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-neutral-100 text-neutral-700 border-neutral-200',
};

function getStatusBadgeClass(status: Order['status']) {
  return statusBadgeClassMap[status];
}

const statusIconMap: Record<Order['status'], LucideIcon> = {
  Processing: Clock3,
  Packed: Package,
  'In Transit': Truck,
  Delivered: CheckCircle2,
  Cancelled: RotateCcw,
};

const backendToUiStatusMap: Record<string, Order['status']> = {
  PENDING: 'Processing',
  PAID: 'Packed',
  SHIPPED: 'In Transit',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const uiToBackendStatusMap: Record<Exclude<Order['status'], 'Cancelled'>, string> = {
  Processing: 'PENDING',
  Packed: 'PAID',
  'In Transit': 'SHIPPED',
  Delivered: 'DELIVERED',
};

function formatCustomerName(order: BackendOrder) {
  const first = order.user?.firstName?.trim();
  const last = order.user?.lastName?.trim();
  const fullName = [first, last].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  return order.user?.email || 'Unknown customer';
}

function mapOrderToUi(order: BackendOrder): Order {
  const backendStatus = String(order.status || 'PENDING').toUpperCase();
  const uiStatus = backendToUiStatusMap[backendStatus] || 'Processing';
  const total = Number(order.totalAmount ?? 0);
  const count = order.orderItems?.length ?? 0;
  const mappedItems = (order.orderItems || []).map((item) => ({
    id: item.id,
    quantity: Number(item.quantity ?? 1),
    price: Number(item.price ?? 0),
    selectedSize: item.productSize || item.selectedSize || null,
    productName: item.productName || 'Product',
    productImage: item.productImage || '',
  }));

  return {
    id: order.id,
    rawDate: order.createdAt || '',
    date: order.createdAt
      ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Date unavailable',
    customer: formatCustomerName(order),
    items: `${count} Item${count === 1 ? '' : 's'}`,
    total: Number.isFinite(total) ? total : 0,
    status: uiStatus,
    orderItems: mappedItems,
  };
}

export default function Orders() {
  const storeOrders = useStore((s) => s.orders) as BackendOrder[];
  const isOrdersInitialized = useStore((s) => s.isOrdersInitialized);
  const fetchAdminOrders = useStore((s) => s.fetchAdminOrders);
  const updateOrderStatus = useStore((s) => s.updateOrderStatus);

  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusOrder, setSelectedStatusOrder] = useState<string | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | Order['status']>('All');
  
  // Pagination State Setup
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const hasAdminShape = (storeOrders || []).some((order) => !!order?.user);
    if (!isOrdersInitialized || !hasAdminShape) {
      void fetchAdminOrders(true);
    }
  }, [fetchAdminOrders, isOrdersInitialized, storeOrders]);

  // Reset pagination automatically when filters or search queries change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Map and sort items: latest orders (newest timestamps) at the very top
  const orders = useMemo(() => {
    return (storeOrders || [])
      .map(mapOrderToUi)
      .sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
  }, [storeOrders]);

  const statusCounts = ORDER_STATUSES.reduce(
    (acc, status) => {
      acc[status] = orders.filter((order) => order.status === status).length;
      return acc;
    },
    {
      Processing: 0,
      Packed: 0,
      'In Transit': 0,
      Delivered: 0,
    } as Record<Order['status'], number>
  );

  const handleUpdateStatus = async (orderId: string, newStatus: Exclude<Order['status'], 'Cancelled'>) => {
    const backendStatus = uiToBackendStatusMap[newStatus];
    if (!backendStatus) return;

    try {
      setIsUpdating(orderId);
      await updateOrderStatus(orderId, backendStatus);
    } catch (error) {
      console.error('Failed to update order status:', error);
    } finally {
      setIsUpdating(null);
    }
    setSelectedStatusOrder(null);
  };

  // Base list containing all filtered records
  const filteredOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        (o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.customer.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (statusFilter === 'All' || o.status === statusFilter)
    );
  }, [orders, searchQuery, statusFilter]);

  // Determine pagination bounds based on currently filtered records
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  
  // Slice out only the 10 records scoped for the dynamic currentPage index
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const activeOrderDetails = useMemo(
    () => orders.find((order) => order.id === selectedOrderDetails) || null,
    [orders, selectedOrderDetails]
  );

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="shrink-0 flex justify-between items-center flex-wrap gap-4">
        <div>
          <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
            Operations
          </span>
          <h1 className="text-2xl font-black text-[#840d5c]">Order Management</h1>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-2xl border border-neutral-200 shadow-sm w-full max-w-xs">
          <Search className="w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search Order ID or Customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs w-full outline-none text-neutral-700"
          />
        </div>
      </div>

      <div className="shrink-0 grid grid-cols-5 gap-2 md:grid-cols-4 md:gap-3">
        {/* Mobile-Only 'All Orders' Card Button */}
        <button
          onClick={() => setStatusFilter('All')}
          className={`rounded-2xl border p-2 text-center shadow-sm transition md:hidden ${
            statusFilter === 'All'
              ? 'border-[#840d5c] bg-[#840d5c]/5'
              : 'border-neutral-200 bg-white hover:border-neutral-300'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="relative rounded-lg border p-1 bg-[#f7e8f1] text-[#6d0b4b] border-[#e8bfd5]">
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#840d5c] px-1 text-[9px] font-bold leading-none text-white">
                {orders.length}
              </span>
            </span>
          </div>
        </button>

        {ORDER_STATUSES.map((status) => {
          const StatusIcon = statusIconMap[status];
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-2xl border p-2 text-center shadow-sm transition md:p-4 md:text-left ${
                statusFilter === status
                  ? 'border-[#840d5c] bg-[#840d5c]/5'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2 md:justify-between">
                <p className="hidden text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500 md:block">{status}</p>
                <span className={`relative rounded-lg border p-1 md:p-1.5 ${getStatusBadgeClass(status)}`}>
                  <StatusIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#840d5c] px-1 text-[9px] font-bold leading-none text-white md:hidden">
                    {statusCounts[status]}
                  </span>
                </span>
              </div>
              <div className="mt-1.5 hidden items-center justify-center md:mt-2 md:flex md:justify-between">
                <p className="text-lg font-black text-[#2f1126] md:text-2xl">{statusCounts[status]}</p>
                <span className={`hidden rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider md:inline-flex ${getStatusBadgeClass(status)}`}>
                  {status}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Desktop Filter Pills Tab-row */}
      <div className="shrink-0 hidden flex-wrap items-center gap-2 md:flex">
        <button
          onClick={() => setStatusFilter('All')}
          className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
            statusFilter === 'All'
              ? 'border-[#840d5c] bg-[#840d5c] text-white'
              : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400'
          }`}
        >
          All Orders ({orders.length})
        </button>
        {ORDER_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
              statusFilter === status
                ? 'border-[#840d5c] bg-[#840d5c] text-white'
                : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400'
            }`}
          >
            {status} ({statusCounts[status]})
          </button>
        ))}
      </div>

      {/* Orders Table View */}
      <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* FIX: added vertical scrolling tracking if table overflows along with overflow-x safety */}
        <div className="overflow-x-auto overflow-y-auto grow custom-scrollbar">
          <table className="w-full min-w-180 border-collapse text-left text-xs table-fixed">
            <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(229,229,229,1)]">
              <tr className="text-neutral-400 tracking-wider">
                <th className="py-4 px-6 font-bold w-[17%]">Order ID</th>
                <th className="py-4 px-4 font-bold w-[13%]">Date</th>
                <th className="py-4 px-4 font-bold w-[22%]">Customer</th>
                <th className="py-4 px-4 font-bold w-[10%]">Items</th>
                <th className="py-4 px-4 font-bold w-[11%]">Total</th>
                <th className="py-4 px-4 font-bold w-[10%]">View Order</th>
                <th className="py-4 px-4 font-bold w-[17%]">Status</th>
              </tr>
            </thead>
            {/* FIX: Added safety margin room to the bottom wrapper to ensure the absolute dropdown is completely visible on the last row */}
            <tbody className={`divide-y divide-neutral-100 text-neutral-600 font-medium transition-all duration-200 ${selectedStatusOrder ? 'pb-32' : ''}`}>
              {paginatedOrders.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50 transition h-[49px]">
                  <td className="py-3 px-6 font-mono font-bold text-neutral-800 truncate">{o.id}</td>
                  <td className="py-3 px-4 truncate">{o.date}</td>
                  <td className="py-3 px-4 text-neutral-800 font-semibold truncate">{o.customer}</td>
                  <td className="py-3 px-4 truncate">{o.items}</td>
                  <td className="py-3 px-4 font-semibold text-neutral-900 truncate">₹{o.total}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => setSelectedOrderDetails(o.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-200 bg-white text-[#840d5c] transition hover:bg-[#840d5c]/5"
                      aria-label="View order details"
                      title="View order details"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </td>
                  <td className="py-3 px-4 relative overflow-visible">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setSelectedStatusOrder(selectedStatusOrder === o.id ? null : o.id)
                        }
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-semibold hover:bg-neutral-100 cursor-pointer text-[10px] ${getStatusBadgeClass(o.status)}`}
                      >
                        {o.status}
                        <ChevronDown className="w-3 h-3 text-neutral-400" />
                      </button>
                    </div>

                    {selectedStatusOrder === o.id && (
                      <div className="absolute z-50 top-full mt-1 right-4 bg-white border border-neutral-200 rounded-xl shadow-xl w-36 py-2">
                        {ORDER_STATUSES.map((status) => (
                          <button
                            key={status}
                            onClick={() => handleUpdateStatus(o.id, status)}
                            disabled={isUpdating === o.id}
                            className="w-full text-left px-4 py-2 hover:bg-neutral-50 text-xs transition flex items-center justify-between font-medium"
                          >
                            {status}
                            {o.status === status && (
                              <Check className="w-3.5 h-3.5 text-[#840d5c]" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400 font-semibold">
                    No orders found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination pinned inside the table card */}
        {filteredOrders.length > 0 && (
          <div className="shrink-0 flex flex-col items-center justify-between gap-4 border-t border-neutral-200 px-6 py-4 sm:flex-row">
          <p className="text-xs font-semibold text-neutral-500">
            Showing <span className="font-bold text-neutral-800">{Math.min(filteredOrders.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}</span> to{' '}
            <span className="font-bold text-neutral-800">{Math.min(filteredOrders.length, currentPage * ITEMS_PER_PAGE)}</span> of{' '}
            <span className="font-bold text-neutral-800">{filteredOrders.length}</span> entries
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-50 hover:border-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`inline-flex h-8 min-w-8 items-center justify-center rounded-xl px-2 text-xs font-bold transition ${
                  currentPage === page
                    ? 'bg-[#840d5c] text-white shadow-sm'
                    : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-50 hover:border-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        )}
      </div>

      {activeOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-xl rounded-3xl border border-[#e8bfd5] bg-linear-to-br from-[#fff7fb] via-white to-[#f9f1f6] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#efd7e4] bg-white/70 px-5 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">Order Details</p>
                <h3 className="mt-1 text-sm font-bold text-neutral-800 sm:text-base">{activeOrderDetails.id}</h3>
              </div>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-200 text-neutral-500 transition hover:bg-neutral-100"
                aria-label="Close order details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              {activeOrderDetails.orderItems.length === 0 ? (
                <p className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">
                  No items found for this order.
                </p>
              ) : (
                <div className="space-y-3">
                  {activeOrderDetails.orderItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-[#efd7e4] bg-white/90 p-3 shadow-sm sm:gap-4 sm:p-4">
                      <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 sm:h-20 sm:w-16">
                        <Image
                          src={getOptimizedSupabaseImageUrl(item.productImage, { width: 240, quality: 70 })}
                          alt={item.productName}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>

                      <div className="min-w-0 grow">
                        <p className="truncate text-sm font-bold text-neutral-800 sm:text-base">{item.productName}</p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                          Qty: {item.quantity}{item.selectedSize ? ` | Size: ${item.selectedSize}` : ''}
                        </p>
                      </div>

                      <p className="shrink-0 text-sm font-bold text-neutral-900 sm:text-base">
                        ₹{item.price.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}