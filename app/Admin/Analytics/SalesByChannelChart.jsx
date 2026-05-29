import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Website', value: 69283, percentage: '54%', color: '#5C0632' },
  { name: 'Mobile App', value: 30742, percentage: '24%', color: '#E0537A' },
  { name: 'Instagram Shop', value: 15385, percentage: '12%', color: '#FBB3CB' },
  { name: 'Marketplace', value: 10240, percentage: '8%', color: '#AC88CD' },
  { name: 'Others', value: 2800, percentage: '2%', color: '#F7C844' },
];

export default function SalesByChannelChart({ timePeriod = 'week' }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-[#E9E4E0] shadow-sm flex flex-col h-[360px]">
      <h2 className="text-base font-bold text-[#2B1B24] mb-4">Sales by Channel ({timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)})</h2>
      
      <div className="flex flex-row items-center justify-between h-full gap-2">
        <div className="relative w-1/2 h-full min-h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={42} outerRadius={60} paddingAngle={2} dataKey="value">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-[#A1959C] uppercase tracking-wider font-semibold">Total</span>
            <span className="text-xs font-extrabold text-[#2B1B24] tracking-tight">₹1,28,450</span>
          </div>
        </div>

        <div className="w-1/2 space-y-2.5 text-xs">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-start justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[#4A3C44] font-medium truncate text-[11px]">{item.name}</span>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-[#2B1B24] text-[11px] leading-none">{item.percentage}</p>
                <p className="text-[9px] text-[#A1959C] mt-0.5">₹{item.value.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}