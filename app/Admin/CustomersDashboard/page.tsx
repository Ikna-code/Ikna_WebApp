'use client';

import React, { useState } from 'react';
import { Search, Mail, Phone, ShoppingBag } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  ordersCount: number;
  totalSpent: number;
  joinDate: string;
}

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [customers] = useState<Customer[]>([
    { id: '1', name: 'Devid Raj', email: 'devid@example.com', phone: '+91 98765 43210', ordersCount: 8, totalSpent: 7840, joinDate: 'Jan 2026' },
    { id: '2', name: 'Priya Sharma', email: 'priya@example.com', phone: '+91 98765 43211', ordersCount: 14, totalSpent: 12500, joinDate: 'Feb 2025' },
    { id: '3', name: 'Aarav Patel', email: 'aarav@example.com', phone: '+91 98765 43212', ordersCount: 3, totalSpent: 2980, joinDate: 'Nov 2025' },
  ]);

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
            Audience
          </span>
          <h1 className="text-2xl font-black text-[#5b153b]">Customer Profiles</h1>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-2xl border border-neutral-200 shadow-sm w-full max-w-xs">
          <Search className="w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs w-full outline-none text-neutral-700"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredCustomers.map((c) => (
          <div key={c.id} className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-neutral-800">{c.name}</h3>
                <p className="text-[10px] text-neutral-400 font-medium">Joined {c.joinDate}</p>
              </div>
              <span className="bg-[#5b153b]/10 text-[#5b153b] text-[10px] font-extrabold px-3 py-1 rounded-xl">
                VIP
              </span>
            </div>

            <div className="space-y-2 border-t border-neutral-100 pt-4 text-xs text-neutral-600 font-medium">
              <div className="flex items-center gap-3">
                <Mail className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                <span className="truncate">{c.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                <span>{c.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                <span>Orders: <strong className="text-neutral-800">{c.ordersCount}</strong></span>
              </div>
            </div>

            <div className="bg-neutral-50 p-3 rounded-2xl flex justify-between items-center">
              <span className="text-[10px] text-neutral-400 font-bold uppercase">Total Lifetime Spend</span>
              <span className="text-sm font-black text-[#3d0d26]">₹{c.totalSpent}</span>
            </div>
          </div>
        ))}
        {filteredCustomers.length === 0 && (
          <div className="col-span-3 text-center py-12 text-neutral-400 font-semibold bg-white rounded-3xl border border-neutral-200">
            No customers found.
          </div>
        )}
      </div>
    </div>
  );
}