'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

const orders = [
  { id: '#cmonec123', desc: 'Bridgerton Ltd Ed x2', price: '₹960', time: 'Today, 10:24 AM', status: 'Processing', color: 'bg-[#f8eaf2] text-[#6d0b4b] border-[#e6bfd3]' },
  { id: '#cmonec456', desc: 'Bridgerton Ltd Ed x2', price: '₹960', time: 'Today, 09:15 AM', status: 'In Transit', color: 'bg-[#f3ddea] text-[#840d5c] border-[#e8bfd5]' },
  { id: '#cmonec789', desc: 'Barely There Comfy Bra x1', price: '₹480', time: 'Today, 08:02 AM', status: 'Packed', color: 'bg-[#edd4e3] text-[#6d0b4b] border-[#dca9c6]' },
  { id: '#cmonec101', desc: 'Everyday Wear Comfy Bra x1', price: '₹240', time: 'Yesterday, 07:45 PM', status: 'Delivered', color: 'bg-[#f2dcea] text-[#5a073f] border-[#dca9c6]' },
];

export default function RecentOrders() {
  const router = useRouter();
  return (
    <div className="bg-white p-6 rounded-3xl border border-[#e8bfd5] shadow-sm flex flex-col justify-between h-[360px] md:col-span-2 xl:col-span-1">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-bold text-[#2f1126]">Recent Orders</h2>
        <button className="text-xs font-bold text-[#840d5c] hover:underline" onClick={() => router.push('/Admin/OrderDashboard')}>View all</button>
      </div>

      <div className="space-y-3 flex-1 flex flex-col justify-center">
        {orders.map((order, index) => (
          <div key={index} className="flex items-center justify-between pb-2.5 last:pb-0 border-b border-[#f1deea] last:border-0 text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#2f1126] tracking-tight">{order.id}</span>
                <span className="font-extrabold text-[#840d5c]">{order.price}</span>
              </div>
              <p className="text-[#8a5f79] font-medium text-[11px] truncate max-w-[170px]">{order.desc}</p>
              <p className="text-[10px] text-[#a0708b]">{order.time}</p>
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