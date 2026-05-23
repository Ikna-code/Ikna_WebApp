'use client';

import React, { useState } from 'react';
import { Search, ChevronDown, Check, FileText } from 'lucide-react';

interface Order {
  id: string;
  date: string;
  customer: string;
  items: string;
  total: number;
  status: 'Processing' | 'In Transit' | 'Packed' | 'Delivered';
}

interface OrdersProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, newStatus: Order['status']) => void;
}

export default function Orders({ orders, onUpdateStatus }: OrdersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusOrder, setSelectedStatusOrder] = useState<string | null>(null);

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

      <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
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
                          onClick={() => onUpdateStatus(o.id, status as Order['status'])}
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