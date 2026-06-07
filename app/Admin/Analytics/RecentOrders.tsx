'use client';
import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';

type OrderItem = {
  id: string;
  quantity?: number;
  product?: {
    name?: string;
  };
};

type StoreOrder = {
  id: string;
  status?: string;
  totalAmount?: number | string;
  createdAt?: string;
  updatedAt?: string;
  orderItems?: OrderItem[];
};

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Processing', color: 'bg-[#f8eaf2] text-[#6d0b4b] border-[#e6bfd3]' },
  PAID: { label: 'Packed', color: 'bg-[#edd4e3] text-[#6d0b4b] border-[#dca9c6]' },
  SHIPPED: { label: 'In Transit', color: 'bg-[#f3ddea] text-[#840d5c] border-[#e8bfd5]' },
  DELIVERED: { label: 'Delivered', color: 'bg-[#f2dcea] text-[#5a073f] border-[#dca9c6]' },
  CANCELLED: { label: 'Cancelled', color: 'bg-neutral-100 text-neutral-700 border-neutral-200' },
};

function getOrderTimestamp(order: StoreOrder) {
  const dateString = order.updatedAt || order.createdAt;
  const parsed = dateString ? new Date(dateString).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number | string | undefined) {
  const amount = Number(value ?? 0);
  return `₹${Number.isFinite(amount) ? amount.toLocaleString('en-IN') : '0'}`;
}

function formatTimeLabel(dateString?: string) {
  if (!dateString) return 'Date unavailable';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getOrderDescription(order: StoreOrder) {
  const items = order.orderItems ?? [];
  if (!items.length) return 'Order items unavailable';

  const first = items[0];
  const firstName = first.product?.name || 'Product';
  const firstQty = first.quantity ?? 1;
  if (items.length === 1) return `${firstName} x${firstQty}`;
  return `${firstName} x${firstQty} +${items.length - 1} more`;
}

type RecentOrdersProps = {
  orders?: StoreOrder[];
  isLoading?: boolean;
};

export default function RecentOrders({ orders = [], isLoading = false }: RecentOrdersProps) {
  const router = useRouter();

  const latestOrders = useMemo(
    () => [...(orders || [])].sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a)).slice(0, 4),
    [orders]
  );

  return (
    <div className="bg-white p-6 rounded-3xl border border-[#e8bfd5] shadow-sm flex flex-col justify-between h-90 md:col-span-2 xl:col-span-1">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-bold text-[#2f1126]">Recent Orders</h2>
        <button className="text-xs font-bold text-[#840d5c] hover:underline" onClick={() => router.push('/Admin/OrderDashboard')}>View all</button>
      </div>

      <div className="space-y-3 flex-1 flex flex-col justify-center">
        {isLoading ? (
          <div className="text-xs text-[#8a5f79]">Loading recent orders...</div>
        ) : latestOrders.length === 0 ? (
          <div className="text-xs text-[#8a5f79]">No recent orders found.</div>
        ) : (
          latestOrders.map((order) => {
            const statusKey = String(order.status || 'PENDING').toUpperCase();
            const status = STATUS_STYLES[statusKey] || {
              label: statusKey,
              color: 'bg-neutral-100 text-neutral-700 border-neutral-200',
            };

            return (
              <div key={order.id} className="flex items-center justify-between pb-2.5 last:pb-0 border-b border-[#f1deea] last:border-0 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#2f1126] tracking-tight">#{order.id.slice(0, 8)}</span>
                    <span className="font-extrabold text-[#840d5c]">{formatCurrency(order.totalAmount)}</span>
                  </div>
                  <p className="text-[#8a5f79] font-medium text-[11px] truncate max-w-42.5">{getOrderDescription(order)}</p>
                  <p className="text-[10px] text-[#a0708b]">{formatTimeLabel(order.updatedAt || order.createdAt)}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${status.color} shadow-sm shrink-0`}>
                  {status.label}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}