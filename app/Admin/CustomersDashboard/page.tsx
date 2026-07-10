'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  IndianRupee,
  Loader2,
  Mail,
  MessageCircle,
  Search,
  ShoppingCart,
  Users,
  X,
} from 'lucide-react';

type CheckoutStep =
  | 'BROWSING'
  | 'CART'
  | 'CHECKOUT_STARTED'
  | 'ADDRESS_ADDED'
  | 'SHIPPING_SELECTED'
  | 'PAYMENT_STARTED'
  | 'ORDER_COMPLETED';

type CheckoutStatus =
  | 'ACTIVE'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_FAILED'
  | 'ABANDONED_CART'
  | 'CONVERTED'
  | 'INACTIVE';

interface CustomerRow {
  id: string;
  avatar: string;
  name: string;
  email: string;
  phone: string;
  ordersCount: number;
  lifetimeSpend: number;
  currentCartValue: number;
  checkoutStep: CheckoutStep;
  status: CheckoutStatus;
  isAbandoned: boolean;
  potentialRecovery: number;
  lastActivityAt: string | null;
  lastActivityLabel: string;
  joinDate: string | null;
  customerType: 'VIP' | 'Loyal' | 'Returning' | 'New' | 'Guest' | string;
}

interface CustomerSummary {
  totalCustomers: number;
  customersWithOrders: number;
  customersInCheckout: number;
  abandonedCarts: number;
  potentialRevenueLost: number;
}

interface CustomersResponse {
  customers: CustomerRow[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  summary?: CustomerSummary;
}

type FilterState = {
  name: string;
  email: string;
  phone: string;
  dateJoinedFrom: string;
  dateJoinedTo: string;
  customerType: string;
  checkoutStep: string;
  status: string;
  hasOrders: 'all' | 'true' | 'false';
  hasAbandonedCart: boolean;
};

type CustomerDrawerResponse = {
  customer?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    joinedDate: string | null;
    lifetimeSpend: number;
    ordersCount: number;
    savedAddresses: number;
  };
  currentCart?: {
    items: Array<{
      id: string;
      image: string;
      name: string;
      size: string;
      color: string;
      quantity: number;
      price: number;
      subtotal: number;
    }>;
    coupon: string;
    shipping: number;
    total: number;
  };
  checkoutSession?: {
    step: CheckoutStep;
    status: CheckoutStatus;
    cartValue: number;
    potentialRecovery: number;
    timeline: Array<{
      event?: string;
      note?: string;
      at?: string;
      status?: string;
      step?: string;
    }>;
  };
  previousOrders?: Array<{
    id: string;
    date: string;
    amount: number;
    status: string;
    paymentStatus: string;
  }>;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const checkoutStepStyles: Record<string, string> = {
  BROWSING: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  CART: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  CHECKOUT_STARTED: 'bg-sky-50 text-sky-700 border-sky-200',
  ADDRESS_ADDED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  SHIPPING_SELECTED: 'bg-violet-50 text-violet-700 border-violet-200',
  PAYMENT_STARTED: 'bg-amber-50 text-amber-700 border-amber-200',
  ORDER_COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const statusStyles: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  PAYMENT_PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  PAYMENT_FAILED: 'bg-rose-100 text-rose-700 border-rose-200',
  ABANDONED_CART: 'bg-rose-100 text-rose-800 border-rose-200',
  CONVERTED: 'bg-sky-100 text-sky-800 border-sky-200',
  INACTIVE: 'bg-neutral-100 text-neutral-700 border-neutral-200',
};

const customerTypeStyles: Record<string, string> = {
  VIP: 'bg-[#840d5c] text-white border-[#840d5c]',
  Loyal: 'bg-[#f7e8f1] text-[#840d5c] border-[#e8bfd5]',
  Returning: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  New: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Guest: 'bg-neutral-100 text-neutral-600 border-neutral-200',
};

function formatCurrency(value: number) {
  return `₹${Math.max(0, Math.round(Number(value) || 0)).toLocaleString('en-IN')}`;
}

function labelize(value: string) {
  return String(value || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getTimeAgo(iso: string | null) {
  if (!iso) return 'No activity';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'No activity';
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} mins ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hrs ago`;
  if (diffHours < 48) return 'Yesterday';
  return `${Math.floor(diffHours / 24)} days ago`;
}

function KpiCard({
  title,
  value,
  tone,
  icon,
}: {
  title: string;
  value: string;
  tone: 'pink' | 'violet' | 'sky' | 'rose' | 'amber';
  icon: React.ReactNode;
}) {
  const toneClasses: Record<typeof tone, string> = {
    pink: 'border-[#e8bfd5] bg-white',
    violet: 'border-violet-200 bg-white',
    sky: 'border-sky-200 bg-white',
    rose: 'border-rose-200 bg-white',
    amber: 'border-amber-200 bg-white',
  };

  const iconTone: Record<typeof tone, string> = {
    pink: 'bg-[#f7e8f1] text-[#840d5c]',
    violet: 'bg-violet-100 text-violet-700',
    sky: 'bg-sky-100 text-sky-700',
    rose: 'bg-rose-100 text-rose-700',
    amber: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className={`rounded-3xl p-5 shadow-sm border ${toneClasses[tone]} dark:bg-neutral-900 dark:border-neutral-700`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">{title}</p>
          <h3 className="mt-2 text-2xl font-black text-[#840d5c] dark:text-white">{value}</h3>
        </div>
        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${iconTone[tone]}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function Customers() {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    name: '',
    email: '',
    phone: '',
    dateJoinedFrom: '',
    dateJoinedTo: '',
    customerType: '',
    checkoutStep: '',
    status: '',
    hasOrders: 'all',
    hasAbandonedCart: false,
  });

  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [summary, setSummary] = useState<CustomerSummary>({
    totalCustomers: 0,
    customersWithOrders: 0,
    customersInCheckout: 0,
    abandonedCarts: 0,
    potentialRevenueLost: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<CustomerDrawerResponse | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();

    const loadCustomers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });

        if (searchQuery) params.set('search', searchQuery);
        if (filters.name.trim()) params.set('name', filters.name.trim());
        if (filters.email.trim()) params.set('email', filters.email.trim());
        if (filters.phone.trim()) params.set('phone', filters.phone.trim());
        if (filters.dateJoinedFrom.trim()) params.set('dateJoinedFrom', filters.dateJoinedFrom.trim());
        if (filters.dateJoinedTo.trim()) params.set('dateJoinedTo', filters.dateJoinedTo.trim());
        if (filters.customerType.trim()) params.set('customerType', filters.customerType.trim());
        if (filters.checkoutStep.trim()) params.set('checkoutStep', filters.checkoutStep.trim());
        if (filters.status.trim()) params.set('status', filters.status.trim());
        if (filters.hasOrders !== 'all') params.set('hasOrders', filters.hasOrders);
        if (filters.hasAbandonedCart) params.set('hasAbandonedCart', 'true');

        const response = await fetch(`/api/admin/customers?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || 'Failed to load customers');
        }

        const payload = (await response.json()) as CustomersResponse;
        setRows(Array.isArray(payload?.customers) ? payload.customers : []);
        setSummary(payload?.summary || {
          totalCustomers: 0,
          customersWithOrders: 0,
          customersInCheckout: 0,
          abandonedCarts: 0,
          potentialRevenueLost: 0,
        });

        const nextPagination = payload?.pagination;
        setTotalPages(Math.max(1, Number(nextPagination?.totalPages || 1)));
        setTotalItems(Math.max(0, Number(nextPagination?.total || 0)));
      } catch (err: unknown) {
        const isAbort = err instanceof Error && err.name === 'AbortError';
        if (isAbort) return;
        setRows([]);
        setError(err instanceof Error ? err.message : 'Failed to load customers');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadCustomers();

    return () => controller.abort();
  }, [page, pageSize, searchQuery, filters]);

  useEffect(() => {
    if (!selectedCustomerId) {
      setDrawerData(null);
      setDrawerError(null);
      return;
    }

    const controller = new AbortController();

    const loadDrawer = async () => {
      try {
        setDrawerLoading(true);
        setDrawerError(null);

        const response = await fetch(`/api/admin/customers/${selectedCustomerId}`, {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || 'Failed to load customer details');
        }

        const payload = (await response.json()) as CustomerDrawerResponse;
        setDrawerData(payload || null);
      } catch (err: unknown) {
        const isAbort = err instanceof Error && err.name === 'AbortError';
        if (isAbort) return;
        setDrawerData(null);
        setDrawerError(err instanceof Error ? err.message : 'Failed to load customer details');
      } finally {
        if (!controller.signal.aborted) {
          setDrawerLoading(false);
        }
      }
    };

    void loadDrawer();

    return () => controller.abort();
  }, [selectedCustomerId]);

  const isFiltered = useMemo(() => {
    return Boolean(
      searchQuery ||
        filters.name ||
        filters.email ||
        filters.phone ||
        filters.dateJoinedFrom ||
        filters.dateJoinedTo ||
        filters.customerType ||
        filters.checkoutStep ||
        filters.status ||
        filters.hasOrders !== 'all' ||
        filters.hasAbandonedCart
    );
  }, [searchQuery, filters]);

  const exportCsv = () => {
    if (!rows.length) return;

    const headers = [
      'Customer',
      'Email',
      'Phone',
      'Orders',
      'Lifetime Spend',
      'Current Cart',
      'Checkout Step',
      'Status',
      'Last Activity',
      'Potential Recovery',
    ];

    const lines = rows.map((row) => [
      row.name,
      row.email,
      row.phone,
      String(row.ordersCount),
      String(row.lifetimeSpend),
      String(row.currentCartValue),
      row.checkoutStep,
      row.status,
      row.lastActivityLabel,
      String(row.potentialRecovery || 0),
    ]);

    const csv = [headers, ...lines]
      .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `customers-page-${page}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const customerForDrawer = useMemo(() => rows.find((row) => row.id === selectedCustomerId) || null, [rows, selectedCustomerId]);

  const sendCartReminderEmail = (customer: { name?: string; email?: string; currentCartValue?: number }) => {
    const recipientEmail = String(customer?.email || '').trim();
    if (!recipientEmail) return;

    const customerName = String(customer?.name || 'there').trim() || 'there';
    const cartValue = Number(customer?.currentCartValue || 0);
    const subject = 'Reminder: Complete your IKNA checkout';
    const body = [
      `Hi ${customerName},`,
      '',
      'You left items in your IKNA cart before completing checkout.',
      cartValue > 0 ? `Current cart value: ${formatCurrency(cartValue)}` : '',
      '',
      'Complete your order here:',
      `${window.location.origin}/cart`,
      '',
      'Need help? Reply to this email and our team will assist you.',
      '',
      'Regards,',
      'Team IKNA',
    ]
      .filter(Boolean)
      .join('\n');

    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#840d5c] dark:text-white">Customers</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Manage customers, checkout activity, and abandoned carts.</p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-2xl border border-neutral-200 shadow-sm w-full md:w-72 dark:bg-neutral-900 dark:border-neutral-700">
            <Search className="w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search customer..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="bg-transparent text-xs w-full outline-none text-neutral-700 dark:text-neutral-200"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-neutral-200 bg-white text-xs font-bold text-neutral-700 shadow-sm hover:bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200"
          >
            <Filter className="h-4 w-4" />
            Filter
          </button>

          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-neutral-200 bg-white text-xs font-bold text-neutral-700 shadow-sm hover:bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="rounded-3xl border border-[#e8bfd5] bg-white p-4 md:p-5 shadow-sm dark:bg-neutral-900 dark:border-neutral-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              value={filters.name}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, name: e.target.value }));
              }}
              placeholder="Customer Name"
              className="rounded-xl border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-[#840d5c] dark:bg-neutral-900 dark:border-neutral-700"
            />
            <input
              value={filters.email}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, email: e.target.value }));
              }}
              placeholder="Email"
              className="rounded-xl border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-[#840d5c] dark:bg-neutral-900 dark:border-neutral-700"
            />
            <input
              value={filters.phone}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, phone: e.target.value }));
              }}
              placeholder="Phone"
              className="rounded-xl border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-[#840d5c] dark:bg-neutral-900 dark:border-neutral-700"
            />
            <input
              type="date"
              value={filters.dateJoinedFrom}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, dateJoinedFrom: e.target.value }));
              }}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-[#840d5c] dark:bg-neutral-900 dark:border-neutral-700"
            />
            <input
              type="date"
              value={filters.dateJoinedTo}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, dateJoinedTo: e.target.value }));
              }}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-[#840d5c] dark:bg-neutral-900 dark:border-neutral-700"
            />
            <select
              value={filters.customerType}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, customerType: e.target.value }));
              }}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-[#840d5c] dark:bg-neutral-900 dark:border-neutral-700"
            >
              <option value="">Customer Type</option>
              <option value="VIP">VIP</option>
              <option value="Loyal">Loyal</option>
              <option value="Returning">Returning</option>
              <option value="New">New</option>
              <option value="Guest">Guest</option>
            </select>

            <select
              value={filters.checkoutStep}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, checkoutStep: e.target.value }));
              }}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-[#840d5c] dark:bg-neutral-900 dark:border-neutral-700"
            >
              <option value="">Checkout Step</option>
              <option value="BROWSING">Browsing</option>
              <option value="CART">Cart</option>
              <option value="CHECKOUT_STARTED">Checkout Started</option>
              <option value="ADDRESS_ADDED">Address Added</option>
              <option value="SHIPPING_SELECTED">Shipping Selected</option>
              <option value="PAYMENT_STARTED">Payment Started</option>
              <option value="ORDER_COMPLETED">Order Completed</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, status: e.target.value }));
              }}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-[#840d5c] dark:bg-neutral-900 dark:border-neutral-700"
            >
              <option value="">Status</option>
              <option value="ACTIVE">Active</option>
              <option value="PAYMENT_PENDING">Payment Pending</option>
              <option value="PAYMENT_FAILED">Payment Failed</option>
              <option value="ABANDONED_CART">Abandoned Cart</option>
              <option value="CONVERTED">Converted</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            <select
              value={filters.hasOrders}
              onChange={(e) => {
                setPage(1);
                setFilters((prev) => ({ ...prev, hasOrders: e.target.value as FilterState['hasOrders'] }));
              }}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-xs outline-none focus:border-[#840d5c] dark:bg-neutral-900 dark:border-neutral-700"
            >
              <option value="all">Has Orders</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>

            <label className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 dark:border-neutral-700 dark:text-neutral-200">
              <input
                type="checkbox"
                checked={filters.hasAbandonedCart}
                onChange={(e) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, hasAbandonedCart: e.target.checked }));
                }}
                className="h-4 w-4 accent-[#840d5c]"
              />
              Has Abandoned Cart
            </label>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setFilters({
                  name: '',
                  email: '',
                  phone: '',
                  dateJoinedFrom: '',
                  dateJoinedTo: '',
                  customerType: '',
                  checkoutStep: '',
                  status: '',
                  hasOrders: 'all',
                  hasAbandonedCart: false,
                });
              }}
              className="text-xs font-bold text-[#840d5c] hover:text-[#6d0b4b]"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <KpiCard title="Total Customers" value={summary.totalCustomers.toLocaleString('en-IN')} tone="pink" icon={<Users className="h-5 w-5" />} />
        <KpiCard title="Customers with Orders" value={summary.customersWithOrders.toLocaleString('en-IN')} tone="violet" icon={<CheckCircle2 className="h-5 w-5" />} />
        <KpiCard title="Customers in Checkout" value={summary.customersInCheckout.toLocaleString('en-IN')} tone="sky" icon={<ShoppingCart className="h-5 w-5" />} />
        <KpiCard title="Abandoned Carts" value={summary.abandonedCarts.toLocaleString('en-IN')} tone="rose" icon={<AlertCircle className="h-5 w-5" />} />
        <KpiCard title="Potential Revenue Lost" value={formatCurrency(summary.potentialRevenueLost)} tone="amber" icon={<IndianRupee className="h-5 w-5" />} />
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm overflow-hidden dark:bg-neutral-900 dark:border-neutral-700">
        <div className="overflow-auto max-h-[70vh]">
          <table className="min-w-245 w-full text-left">
            <thead className="sticky top-0 z-20 bg-[#fff8fc] border-b border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700">
              <tr className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">
                <th className="px-4 py-3 font-extrabold">Customer</th>
                <th className="px-4 py-3 font-extrabold">Contact</th>
                <th className="px-4 py-3 font-extrabold">Orders</th>
                <th className="px-4 py-3 font-extrabold">Lifetime Spend</th>
                <th className="px-4 py-3 font-extrabold">Current Cart</th>
                <th className="px-4 py-3 font-extrabold">Checkout Step</th>
                <th className="px-4 py-3 font-extrabold">Status</th>
                <th className="px-4 py-3 font-extrabold">Last Activity</th>
                <th className="px-4 py-3 font-extrabold sticky right-0 bg-[#fff8fc] dark:bg-neutral-800">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="border-b border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-4" colSpan={9}>
                      <div className="h-10 rounded-xl bg-neutral-100 animate-pulse dark:bg-neutral-800" />
                    </td>
                  </tr>
                ))}

              {!isLoading &&
                rows.map((row) => {
                  const stepClass = checkoutStepStyles[row.checkoutStep] || checkoutStepStyles.BROWSING;
                  const statusClass = statusStyles[row.status] || statusStyles.INACTIVE;
                  const typeClass = customerTypeStyles[row.customerType] || customerTypeStyles.New;

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedCustomerId(row.id)}
                      className={`border-b border-neutral-100 transition-colors hover:bg-[#fcf4f8] cursor-pointer dark:border-neutral-800 dark:hover:bg-neutral-800 ${
                        row.isAbandoned ? 'bg-rose-50/70 dark:bg-rose-950/20' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-[#f7e8f1] text-[#840d5c] flex items-center justify-center text-xs font-black">
                            {row.avatar}
                          </div>
                          <div>
                            <p className="text-sm font-extrabold text-neutral-800 dark:text-neutral-100">{row.name}</p>
                            <span className={`inline-flex mt-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${typeClass}`}>
                              {row.customerType}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-300">
                        <p className="font-semibold">{row.email}</p>
                        <p className="mt-1">{row.phone}</p>
                      </td>

                      <td className="px-4 py-3 text-xs font-extrabold text-neutral-800 dark:text-neutral-100">{row.ordersCount} Orders</td>

                      <td className="px-4 py-3 text-xs font-extrabold text-[#840d5c] dark:text-fuchsia-300">{formatCurrency(row.lifetimeSpend)}</td>

                      <td className="px-4 py-3 text-xs font-bold text-neutral-700 dark:text-neutral-200">
                        {row.currentCartValue > 0 ? formatCurrency(row.currentCartValue) : '—'}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${stepClass}`}>
                          {labelize(row.checkoutStep)}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${statusClass}`}>
                            {labelize(row.status)}
                          </span>
                          {row.isAbandoned && row.potentialRecovery > 0 && (
                            <p className="text-[10px] font-bold text-rose-700">Potential Recovery {formatCurrency(row.potentialRecovery)}</p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-xs font-semibold text-neutral-600 dark:text-neutral-300">{row.lastActivityLabel || getTimeAgo(row.lastActivityAt)}</td>

                      <td className={`px-2 sm:px-4 py-3 sticky right-0 ${row.isAbandoned ? 'bg-rose-50/95 dark:bg-rose-950/30' : 'bg-white dark:bg-neutral-900'}`}>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled
                            className="p-2 rounded-lg opacity-40 cursor-not-allowed"
                            title="WhatsApp is currently disabled"
                          >
                            <MessageCircle className="h-4 w-4 text-neutral-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => sendCartReminderEmail({
                              name: row.name,
                              email: row.email,
                              currentCartValue: row.currentCartValue,
                            })}
                            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            title="Send cart checkout reminder"
                          >
                            <Mail className="h-4 w-4 text-neutral-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center">
                    <div className="mx-auto max-w-sm">
                      <Users className="mx-auto h-10 w-10 text-neutral-300" />
                      <p className="mt-3 text-sm font-bold text-neutral-700 dark:text-neutral-200">
                        {isFiltered ? 'No customers match your filters.' : 'No customers found yet.'}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Try adjusting your filters or search terms.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-neutral-200 bg-[#fff8fc] dark:bg-neutral-800 dark:border-neutral-700">
          <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
            Showing {rows.length} of {totalItems.toLocaleString('en-IN')} customers
          </div>

          <div className="flex items-center gap-2">
            <select
              value={String(pageSize)}
              onChange={(e) => {
                setPage(1);
                setPageSize(Number(e.target.value));
              }}
              className="rounded-xl border border-neutral-200 bg-white px-2 py-1.5 text-xs font-semibold dark:bg-neutral-900 dark:border-neutral-700"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={String(size)}>
                  {size} / page
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1 || isLoading}
              className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold disabled:opacity-50 dark:bg-neutral-900 dark:border-neutral-700"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>

            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200">Page {page} / {Math.max(totalPages, 1)}</span>

            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || isLoading}
              className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold disabled:opacity-50 dark:bg-neutral-900 dark:border-neutral-700"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {selectedCustomerId && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/30"
            aria-label="Close customer drawer"
            onClick={() => setSelectedCustomerId(null)}
          />

          <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl bg-white shadow-2xl border-l border-neutral-200 dark:bg-neutral-900 dark:border-neutral-700 overflow-y-auto text-[13px] leading-relaxed">
            <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between dark:bg-neutral-900/95 dark:border-neutral-700">
              <div>
                <h2 className="text-base font-black text-[#840d5c] dark:text-white">Customer Details</h2>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{customerForDrawer?.name || 'Loading customer...'}</p>
              </div>
              <button type="button" onClick={() => setSelectedCustomerId(null)} className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 sm:space-y-6">
              {drawerLoading && (
                <div className="rounded-2xl border border-neutral-200 p-6 flex items-center gap-3 text-sm font-semibold text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading customer details...
                </div>
              )}

              {drawerError && !drawerLoading && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                  {drawerError}
                </div>
              )}

              {!drawerLoading && !drawerError && drawerData?.customer && (
                <>
                  <section className="rounded-3xl border border-neutral-200 p-4 dark:border-neutral-700">
                    <h3 className="text-xs font-black text-neutral-800 dark:text-neutral-100 uppercase tracking-[0.12em]">Customer Information</h3>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <p className="text-neutral-400 font-bold uppercase tracking-[0.12em]">Name</p>
                        <p className="font-semibold text-neutral-700 dark:text-neutral-200 mt-1">{drawerData.customer.name}</p>
                      </div>
                      <div>
                        <p className="text-neutral-400 font-bold uppercase tracking-[0.12em]">Email</p>
                        <p className="font-semibold text-neutral-700 dark:text-neutral-200 mt-1">{drawerData.customer.email}</p>
                      </div>
                      <div>
                        <p className="text-neutral-400 font-bold uppercase tracking-[0.12em]">Phone</p>
                        <p className="font-semibold text-neutral-700 dark:text-neutral-200 mt-1">{drawerData.customer.phone}</p>
                      </div>
                      <div>
                        <p className="text-neutral-400 font-bold uppercase tracking-[0.12em]">Joined</p>
                        <p className="font-semibold text-neutral-700 dark:text-neutral-200 mt-1">
                          {drawerData.customer.joinedDate
                            ? new Date(drawerData.customer.joinedDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Unavailable'}
                        </p>
                      </div>
                      <div>
                        <p className="text-neutral-400 font-bold uppercase tracking-[0.12em]">Lifetime Spend</p>
                        <p className="font-semibold text-[#840d5c] mt-1">{formatCurrency(drawerData.customer.lifetimeSpend)}</p>
                      </div>
                      <div>
                        <p className="text-neutral-400 font-bold uppercase tracking-[0.12em]">Orders</p>
                        <p className="font-semibold text-neutral-700 dark:text-neutral-200 mt-1">{drawerData.customer.ordersCount}</p>
                      </div>
                      <div>
                        <p className="text-neutral-400 font-bold uppercase tracking-[0.12em]">Saved Addresses</p>
                        <p className="font-semibold text-neutral-700 dark:text-neutral-200 mt-1">{drawerData.customer.savedAddresses}</p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-3xl border border-neutral-200 p-4 dark:border-neutral-700">
                    <h3 className="text-xs font-black text-neutral-800 dark:text-neutral-100 uppercase tracking-[0.12em]">Current Cart</h3>
                    <div className="mt-3 space-y-3">
                      {(drawerData.currentCart?.items || []).map((item) => (
                        <div key={item.id} className="rounded-2xl border border-neutral-100 p-3 text-[11px] dark:border-neutral-800">
                          <p className="font-bold text-neutral-800 dark:text-neutral-100">{item.name}</p>
                          <p className="text-neutral-500 mt-1">Size {item.size} • {item.color} • Qty {item.quantity}</p>
                          <div className="mt-2 flex items-center justify-between font-semibold">
                            <span>{formatCurrency(item.price)} each</span>
                            <span>{formatCurrency(item.subtotal)}</span>
                          </div>
                        </div>
                      ))}

                      {(drawerData.currentCart?.items || []).length === 0 && (
                        <p className="text-[11px] text-neutral-500">No active cart items.</p>
                      )}

                      <div className="rounded-2xl bg-neutral-50 p-3 text-[11px] space-y-1 dark:bg-neutral-800">
                        <div className="flex justify-between"><span>Coupon</span><span>{drawerData.currentCart?.coupon || '-'}</span></div>
                        <div className="flex justify-between"><span>Shipping</span><span>{formatCurrency(drawerData.currentCart?.shipping || 0)}</span></div>
                        <div className="flex justify-between font-black text-neutral-800 dark:text-neutral-100"><span>Total</span><span>{formatCurrency(drawerData.currentCart?.total || 0)}</span></div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-3xl border border-neutral-200 p-4 dark:border-neutral-700">
                    <h3 className="text-xs font-black text-neutral-800 dark:text-neutral-100 uppercase tracking-[0.12em]">Checkout Timeline</h3>
                    <div className="mt-3 space-y-2">
                      {(drawerData.checkoutSession?.timeline || []).slice(0, 8).map((entry, index) => (
                        <div key={`${entry.at || 'time'}-${index}`} className="flex items-start gap-3 text-[11px]">
                          <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-[#840d5c]" />
                          <div>
                            <p className="font-semibold text-neutral-700 dark:text-neutral-200">{entry.note || entry.event || labelize(String(entry.step || 'Activity'))}</p>
                            <p className="text-neutral-500">{entry.at ? getTimeAgo(entry.at) : 'Unknown time'}</p>
                          </div>
                        </div>
                      ))}

                      {(drawerData.checkoutSession?.timeline || []).length === 0 && (
                        <p className="text-[11px] text-neutral-500">No timeline events available.</p>
                      )}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-neutral-200 p-4 dark:border-neutral-700">
                    <h3 className="text-xs font-black text-neutral-800 dark:text-neutral-100 uppercase tracking-[0.12em]">Previous Orders</h3>
                    <div className="mt-3 space-y-2">
                      {(drawerData.previousOrders || []).map((order) => (
                        <div key={order.id} className="rounded-2xl border border-neutral-100 p-3 text-[11px] dark:border-neutral-800">
                          <div className="flex justify-between items-center">
                            <p className="font-bold">#{order.id}</p>
                            <span className="font-semibold">{formatCurrency(order.amount)}</span>
                          </div>
                          <p className="text-neutral-500 mt-1">
                            {new Date(order.date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                            {' • '}
                            {labelize(order.status)}
                          </p>
                        </div>
                      ))}

                      {(drawerData.previousOrders || []).length === 0 && (
                        <p className="text-[11px] text-neutral-500">No previous orders found.</p>
                      )}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-neutral-200 p-4 dark:border-neutral-700">
                    <h3 className="text-xs font-black text-neutral-800 dark:text-neutral-100 uppercase tracking-[0.12em]">Recovery Actions</h3>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled
                        className="rounded-xl border border-neutral-200 px-3 py-2 text-[11px] font-bold text-neutral-400 cursor-not-allowed dark:border-neutral-700"
                      >
                        WhatsApp (Disabled)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          sendCartReminderEmail({
                            name: drawerData.customer?.name,
                            email: drawerData.customer?.email,
                            currentCartValue: drawerData.currentCart?.total || customerForDrawer?.currentCartValue || 0,
                          })
                        }
                        className="rounded-xl border border-neutral-200 px-3 py-2 text-[11px] font-bold hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                      >
                        Send Reminder Email
                      </button>
                    </div>
                  </section>
                </>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
