'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, Mail, Phone, ShoppingBag } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  ordersCount: number;
  totalSpent: number;
  joinDate: string | null;
  tag: string;
}

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadCustomers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/admin/customers', {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || 'Failed to load customers');
        }

        const payload = await response.json();
        const rows = Array.isArray(payload?.customers) ? payload.customers : [];
        setCustomers(rows);
      } catch (err: unknown) {
        const isAbort = err instanceof Error && err.name === 'AbortError';
        if (isAbort) return;
        setCustomers([]);
        setError(err instanceof Error ? err.message : 'Failed to load customers');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadCustomers();

    return () => controller.abort();
  }, []);

  const filteredCustomers = useMemo(
    () =>
      customers.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.email.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [customers, searchQuery]
  );

  const formatJoinDate = (isoDate: string | null) => {
    if (!isoDate) return 'Join date unavailable';
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) return 'Join date unavailable';
    return `Joined ${parsed.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
            Audience
          </span>
          <h1 className="text-2xl font-black text-[#840d5c]">Customer Profiles</h1>
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

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-3 text-center py-12 text-neutral-400 font-semibold bg-white rounded-3xl border border-neutral-200">
            Loading customer profiles...
          </div>
        ) : (
          filteredCustomers.map((c) => (
            <div key={c.id} className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-neutral-800">{c.name}</h3>
                  <p className="text-[10px] text-neutral-400 font-medium">{formatJoinDate(c.joinDate)}</p>
                </div>
                <span className="bg-[#840d5c]/10 text-[#840d5c] text-[10px] font-extrabold px-3 py-1 rounded-xl">
                  {c.tag}
                </span>
              </div>

              <div className="space-y-2 border-t border-neutral-100 pt-4 text-xs text-neutral-600 font-medium">
                <div className="flex items-center gap-3">
                  <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span className="truncate">{c.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span>{c.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span>Orders: <strong className="text-neutral-800">{c.ordersCount}</strong></span>
                </div>
              </div>

              <div className="bg-neutral-50 p-3 rounded-2xl flex justify-between items-center">
                <span className="text-[10px] text-neutral-400 font-bold uppercase">Total Lifetime Spend</span>
                <span className="text-sm font-black text-[#840d5c]">₹{c.totalSpent.toLocaleString('en-IN')}</span>
              </div>
            </div>
          ))
        )}
        {!isLoading && filteredCustomers.length === 0 && (
          <div className="col-span-3 text-center py-12 text-neutral-400 font-semibold bg-white rounded-3xl border border-neutral-200">
            No customers found.
          </div>
        )}
      </div>
    </div>
  );
}
