'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, ChevronDown, Check, Clock3, Package, Truck, CheckCircle2, RotateCcw, LucideIcon } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface Order {
  id: string;
  date: string;
  customer: string;
  items: string;
  total: number;
  status: 'Processing' | 'In Transit' | 'Packed' | 'Delivered' | 'Cancelled';
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
  orderItems?: Array<{ id: string }>;
};

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

  return {
    id: order.id,
    date: order.createdAt
      ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Date unavailable',
    customer: formatCustomerName(order),
    items: `${count} Item${count === 1 ? '' : 's'}`,
    total: Number.isFinite(total) ? total : 0,
    status: uiStatus,
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
  const [statusFilter, setStatusFilter] = useState<'All' | Order['status']>('All');

  useEffect(() => {
    const hasAdminShape = (storeOrders || []).some((order) => !!order?.user);
    if (!isOrdersInitialized || !hasAdminShape) {
      void fetchAdminOrders(true);
    }
  }, [fetchAdminOrders, isOrdersInitialized, storeOrders]);

  const orders = useMemo(() => (storeOrders || []).map(mapOrderToUi), [storeOrders]);

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

  const filteredOrders = orders.filter(
    (o) =>
      (o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (statusFilter === 'All' || o.status === statusFilter)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
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

      <div className="grid grid-cols-5 gap-2 md:grid-cols-4 md:gap-3">
        {/* Mobile-Only 'All Orders' Card Button - Colored relevant to palette */}
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
      <div className="hidden flex-wrap items-center gap-2 md:flex">
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

      {/* Mobile Card Grid View */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        {filteredOrders.map((o) => (
          <div key={o.id} className="rounded-3xl border border-neutral-200 bg-white p-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-neutral-400">Order</p>
                <p className="mt-1 font-mono text-[11px] font-bold text-neutral-800">{o.id}</p>
              </div>
            </div>

            <div className="mt-2 text-[11px] text-neutral-600">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Customer</p>
                <p className="mt-1 truncate text-[11px] font-semibold text-neutral-800">{o.customer}</p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[9px] font-medium text-neutral-600">
                <span className="rounded-full bg-neutral-100 px-2 py-0.5">{o.items}</span>
                <span className="ml-auto text-[11px] font-bold text-neutral-900">₹{o.total}</span>
              </div>
            </div>

            <div className="relative mt-2">
              <button
                onClick={() => setSelectedStatusOrder(selectedStatusOrder === o.id ? null : o.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider ${getStatusBadgeClass(o.status)}`}
              >
                {o.status}
                <ChevronDown className="h-3 w-3 text-neutral-400" />
              </button>

              {selectedStatusOrder === o.id && (
                <div className="absolute left-0 top-12 z-10 w-full rounded-xl border border-neutral-200 bg-white py-2 shadow-lg">
                  {ORDER_STATUSES.map((status) => (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(o.id, status)}
                      disabled={isUpdating === o.id}
                      className="flex w-full items-center justify-between px-4 py-2 text-left text-xs font-medium transition hover:bg-neutral-50"
                    >
                      {status}
                      {o.status === status && <Check className="h-3.5 w-3.5 text-[#840d5c]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredOrders.length === 0 && (
          <div className="col-span-2 rounded-3xl border border-neutral-200 bg-white py-10 text-center font-semibold text-neutral-400 shadow-sm">
            No orders found matching your search.
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden overflow-x-auto rounded-3xl border border-neutral-200 bg-white shadow-sm md:block">
        <table className="w-full min-w-180 border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-neutral-200 text-neutral-400 tracking-wider">
              <th className="py-4 px-6 font-bold">Order ID</th>
              <th className="py-4 px-4 font-bold">Date</th>
              <th className="py-4 px-4 font-bold">Customer</th>
              <th className="py-4 px-4 font-bold">Items</th>
              <th className="py-4 px-4 font-bold">Total</th>
              <th className="py-4 px-4 font-bold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-neutral-600 font-medium">
            {filteredOrders.map((o) => (
              <tr key={o.id} className="hover:bg-neutral-50 transition">
                <td className="py-5 px-6 font-mono font-bold text-neutral-800">{o.id}</td>
                <td className="py-4 px-4">{o.date}</td>
                <td className="py-4 px-4 text-neutral-800 font-semibold">{o.customer}</td>
                <td className="py-4 px-4">{o.items}</td>
                <td className="py-4 px-4 font-semibold text-neutral-900">₹{o.total}</td>
                <td className="py-4 px-4 relative">
                  <button
                    onClick={() =>
                      setSelectedStatusOrder(selectedStatusOrder === o.id ? null : o.id)
                    }
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-semibold hover:bg-neutral-100 cursor-pointer text-[10px] ${getStatusBadgeClass(o.status)}`}
                  >
                    {o.status}
                    <ChevronDown className="w-3 h-3 text-neutral-400" />
                  </button>

                  {selectedStatusOrder === o.id && (
                    <div className="absolute z-10 top-12 left-0 bg-white border border-neutral-200 rounded-xl shadow-lg w-36 py-2">
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
                <td colSpan={6} className="py-8 text-center text-neutral-400 font-semibold">
                  No orders found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
