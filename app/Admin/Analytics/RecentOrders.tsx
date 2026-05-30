'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

const orders = [
  { id: '#cmonec123', desc: 'Bridgerton Ltd Ed x2', price: '₹960', time: 'Today, 10:24 AM', status: 'Processing', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { id: '#cmonec456', desc: 'Bridgerton Ltd Ed x2', price: '₹960', time: 'Today, 09:15 AM', status: 'In Transit', color: 'bg-orange-50 text-orange-600 border-orange-100' },
  { id: '#cmonec789', desc: 'Barely There Comfy Bra x1', price: '₹480', time: 'Today, 08:02 AM', status: 'Packed', color: 'bg-purple-50 text-purple-600 border-purple-100' },
  { id: '#cmonec101', desc: 'Everyday Wear Comfy Bra x1', price: '₹240', time: 'Yesterday, 07:45 PM', status: 'Delivered', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
];

export default function RecentOrders() {
  const router = useRouter();
  return (
    <div className="bg-white p-6 rounded-3xl border border-[#E9E4E0] shadow-sm flex flex-col justify-between h-[360px] md:col-span-2 xl:col-span-1">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-bold text-[#2B1B24]">Recent Orders</h2>
        <button className="text-xs font-bold text-[#A8436D] hover:underline" onClick={() => router.push('/Admin/OrderDashboard')}>View all</button>
      </div>

      <div className="space-y-3 flex-1 flex flex-col justify-center">
        {orders.map((order, index) => (
          <div key={index} className="flex items-center justify-between pb-2.5 last:pb-0 border-b border-[#F4EFEA] last:border-0 text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#2B1B24] tracking-tight">{order.id}</span>
                <span className="font-extrabold text-[#3D0A21]">{order.price}</span>
              </div>
              <p className="text-[#7A6B73] font-medium text-[11px] truncate max-w-[170px]">{order.desc}</p>
              <p className="text-[10px] text-[#A1959C]">{order.time}</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${order.color} shadow-sm shrink-0`}>
              {order.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}