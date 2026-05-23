'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart2,
  FileText,
  Users,
  Megaphone,
  Settings,
  ChevronDown,
  Box,
} from 'lucide-react';

// Import the subcomponents
import ProductManagementDashboard from './ProductDashboard/page';
import Orders from './OrderDashboard/page';
import Customers from './CustomersDashboard/page';
import Marketing from './MarketingDashboard/page';

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  image: string;
}

interface Order {
  id: string;
  date: string;
  customer: string;
  items: string;
  total: number;
  status: 'Processing' | 'In Transit' | 'Packed' | 'Delivered';
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('Products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStatusOrder, setSelectedStatusOrder] = useState<string | null>(null);

  useEffect(() => {
    const fetchGeneralData = async () => {
      const dbProducts: Product[] = [
        { id: '1', sku: '205000', name: 'Barely there comfy bra', price: 240, stock: 200, image: 'https://images.unsplash.com/photo-1567016549366-5f3194bab37b?w=100&auto=format&fit=crop' },
        { id: '2', sku: '203006', name: 'Barely there - Light padded...', price: 480, stock: 100, image: 'https://images.unsplash.com/photo-1583743814966-8936f5b741aa?w=100&auto=format&fit=crop' },
        { id: '3', sku: '303000', name: 'Everyday Wear comfy bra', price: 240, stock: 40, image: 'https://images.unsplash.com/photo-1618077360395-f3068be8e086?w=100&auto=format&fit=crop' }
      ];

      const dbOrders: Order[] = [
        { id: '#cmonec123', date: '5/2/2026', customer: 'Chennai', items: 'Bridgerton Ltd Ed x2', total: 960, status: 'Processing' },
        { id: '#cmonec456', date: '5/2/2026', customer: 'Customer', items: 'Bridgerton Ltd Ed x2', total: 960, status: 'In Transit' }
      ];

      setProducts(dbProducts);
      setOrders(dbOrders);
    };
    fetchGeneralData();
  }, []);

  const handleUpdateStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    setSelectedStatusOrder(null);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Products':
        return <ProductManagementDashboard />;
      case 'Orders':
        return <Orders orders={orders} onUpdateStatus={handleUpdateStatus} />;
      case 'Customers':
        return <Customers />;
      case 'Marketing':
        return <Marketing />;
      case 'Sales Analytics':
      default:
        return (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold text-[#5b153b] mb-6">Sales Tracker</h2>
                <div className="h-60 flex items-end justify-between px-4 py-2 border-b border-gray-50">
                  <div className="w-full h-full flex items-end justify-around gap-2">
                    {[
                      { label: '$12,450', h: '45%', color: 'bg-rose-100 text-rose-800' },
                      { label: '$15,200', h: '60%', color: 'bg-pink-100 text-pink-800' },
                      { label: '$15,200', h: '70%', color: 'bg-[#5b153b]/10 text-[#5b153b]' },
                    ].map((data, i) => (
                      <div key={i} style={{ height: data.h }} className={`flex flex-col items-center w-12 rounded-t-lg justify-end pb-2 font-bold text-xs shadow-sm ${data.color}`}>
                        <span>{data.label.split('$')[1]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-[#5b153b] mb-4">Order History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-600">
                    <thead className="border-b border-gray-50 text-gray-400">
                      <tr>
                        <th className="py-3 px-2">Order ID</th>
                        <th className="py-3 px-2">Date</th>
                        <th className="py-3 px-2">Customer</th>
                        <th className="py-3 px-2">Total</th>
                        <th className="py-3 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orders.map((o) => (
                        <tr key={o.id}>
                          <td className="py-4 px-2">{o.id}</td>
                          <td className="py-4 px-2">{o.date}</td>
                          <td className="py-4 px-2">{o.customer}</td>
                          <td className="py-4 px-2">₹{o.total}</td>
                          <td className="py-4 px-2">
                            <span className="bg-neutral-100 px-3 py-1 rounded">{o.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="xl:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-[#5b153b] mb-4">Quick Product Summary</h3>
                <div className="space-y-3 max-h-[320px] overflow-y-auto">
                  {products.map((product) => (
                    <div key={product.id} className="flex justify-between items-center p-2 hover:bg-neutral-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <img src={product.image} className="w-10 h-10 object-cover rounded-lg" alt={product.name} />
                        <div>
                          <div className="text-xs font-bold text-gray-800 w-[110px] truncate">{product.name}</div>
                          <div className="text-[10px] text-gray-400">SKU: {product.sku}</div>
                        </div>
                      </div>
                      <span className="text-xs font-bold">₹{product.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-row">
      <aside className="w-64 bg-[#3d0d26] text-white flex flex-col justify-between p-6 hidden md:flex">
        <div>
          <div className="flex items-center gap-3 mb-10">
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center font-bold text-[#3d0d26]">
              i
            </div>
            <span className="font-bold text-xl tracking-wider">ikna</span>
          </div>

          <nav className="space-y-1">
            {[
              { name: 'Sales Analytics', icon: BarChart2 },
              { name: 'Products', icon: Box },
              { name: 'Orders', icon: FileText },
              { name: 'Customers', icon: Users },
              { name: 'Marketing', icon: Megaphone },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(item.name)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm transition ${
                  activeTab === item.name
                    ? 'bg-[#5b153b] font-medium text-white'
                    : 'text-gray-400 hover:bg-[#5b153b]/40'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </button>
            ))}
          </nav>
        </div>
        <button className="flex items-center gap-4 px-4 py-3 rounded-xl text-sm text-gray-400 hover:bg-[#5b153b]/40 transition">
          <Settings className="w-5 h-5" />
          Settings
        </button>
      </aside>

      <main className="flex-1 p-6 md:p-8 max-w-[1500px] mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-neutral-200 pb-6">
          <nav className="flex gap-8 text-sm font-medium text-neutral-600">
            {['Dashboard', 'Shop', 'Orders', 'Support'].map((nav) => (
              <a
                key={nav}
                href="#"
                className={`pb-4 transition ${
                  nav === 'Shop' ? 'text-[#5b153b] border-b-2 border-[#5b153b]' : 'hover:text-[#5b153b]'
                }`}
              >
                {nav}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100"
              alt="Admin Profile"
              className="w-9 h-9 rounded-full object-cover shadow-sm border border-neutral-300"
            />
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-neutral-800">IKNA Admin</div>
              <div className="text-[10px] text-neutral-400">Chennai, India</div>
            </div>
            <ChevronDown className="w-4 h-4 text-neutral-400" />
          </div>
        </header>
        
        {renderContent()}
      </main>
    </div>
  );
}