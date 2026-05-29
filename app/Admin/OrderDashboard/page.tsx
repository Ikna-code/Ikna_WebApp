'use client';

import React, { useState } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

interface Order {
  id: string;
  date: string;
  customer: string;
  items: string;
  total: number;
  status: 'Processing' | 'In Transit' | 'Packed' | 'Delivered';
}

const initialOrders: Order[] = [
  {
    id: 'IKNA-1042',
    date: '29 May 2026',
    customer: 'Aarthi Nair',
    items: '3 Items',
    total: 4290,
    status: 'Processing',
  },
  {
    id: 'IKNA-1038',
    date: '28 May 2026',
    customer: 'Ritika Shah',
    items: '1 Item',
    total: 1640,
    status: 'Packed',
  },
  {
    id: 'IKNA-1033',
    date: '27 May 2026',
    customer: 'Megha Verma',
    items: '2 Items',
    total: 2980,
    status: 'In Transit',
  },
  {
    id: 'IKNA-1027',
    date: '26 May 2026',
    customer: 'Nisha Rao',
    items: '4 Items',
    total: 5120,
    status: 'Delivered',
  },
];

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusOrder, setSelectedStatusOrder] = useState<string | null>(null);

  const handleUpdateStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
    setSelectedStatusOrder(null);
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
            Operations
          </span>
          <h1 className="text-2xl font-black text-[#5b153b]">Order Management</h1>
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

      <div className="grid gap-4 md:hidden">
        {filteredOrders.map((o) => (
          <div key={o.id} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">Order</p>
                <p className="mt-1 font-mono text-sm font-bold text-neutral-800">{o.id}</p>
              </div>
              <span className="rounded-full bg-[#5b153b]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5b153b]">
                {o.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-neutral-600">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Customer</p>
                <p className="mt-1 font-semibold text-neutral-800">{o.customer}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Date</p>
                <p className="mt-1">{o.date}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Items</p>
                <p className="mt-1">{o.items}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total</p>
                <p className="mt-1 font-semibold text-neutral-900">₹{o.total}</p>
              </div>
            </div>

            <div className="relative mt-4">
              <button
                onClick={() => setSelectedStatusOrder(selectedStatusOrder === o.id ? null : o.id)}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-700"
              >
                Update Status
                <ChevronDown className="h-3 w-3 text-neutral-400" />
              </button>

              {selectedStatusOrder === o.id && (
                <div className="absolute left-0 top-12 z-10 w-full rounded-xl border border-neutral-200 bg-white py-2 shadow-lg">
                  {['Processing', 'Packed', 'In Transit', 'Delivered'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(o.id, status as Order['status'])}
                      className="flex w-full items-center justify-between px-4 py-2 text-left text-xs font-medium transition hover:bg-neutral-50"
                    >
                      {status}
                      {o.status === status && <Check className="h-3.5 w-3.5 text-[#5b153b]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredOrders.length === 0 && (
          <div className="rounded-3xl border border-neutral-200 bg-white py-10 text-center font-semibold text-neutral-400 shadow-sm">
            No orders found matching your search.
          </div>
        )}
      </div>

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
                    className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-300 font-semibold text-neutral-700 hover:bg-neutral-100 cursor-pointer text-[10px]"
                  >
                    {o.status}
                    <ChevronDown className="w-3 h-3 text-neutral-400" />
                  </button>

                  {selectedStatusOrder === o.id && (
                    <div className="absolute z-10 top-12 left-0 bg-white border border-neutral-200 rounded-xl shadow-lg w-36 py-2">
                      {['Processing', 'Packed', 'In Transit', 'Delivered'].map((status) => (
                        <button
                          key={status}
                          onClick={() => handleUpdateStatus(o.id, status as Order['status'])}
                          className="w-full text-left px-4 py-2 hover:bg-neutral-50 text-xs transition flex items-center justify-between font-medium"
                        >
                          {status}
                          {o.status === status && (
                            <Check className="w-3.5 h-3.5 text-[#5b153b]" />
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