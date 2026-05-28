import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChevronDown } from 'lucide-react';

const trendData = [
  { name: 'Week 1', amt: 42000, display: '₹78.4K' },
  { name: 'Week 2', amt: 49000, display: '₹92.4K' },
  { name: 'Week 3', amt: 54000, display: '₹1,12.2K' },
  { name: 'Week 4', amt: 62000, display: '₹1,28.4K', current: true },
  { name: 'Week 5', amt: 0, display: '' },
];

export default function SalesTrendChart() {
  return (
    <div className="bg-white p-6 rounded-3xl border border-[#E9E4E0] shadow-sm flex flex-col justify-between h-[360px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-[#2B1B24] inline-block">Sales Trend</h2>
          <span className="text-[11px] text-[#7A6B73] ml-1">(Monthly View)</span>
        </div>
        <div className="bg-[#FAF6F4] border border-[#E9E4E0] px-2 py-1 rounded-lg text-[10px] font-semibold text-[#4A3C44] flex items-center gap-1 cursor-pointer">
          <span>This Month</span>
          <ChevronDown className="w-3 h-3 text-[#A1959C]" />
        </div>
      </div>

      <div className="flex-1 w-full text-[10px] font-medium">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trendData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3EDE9" vertical={false} />
            <XAxis dataKey="name" stroke="#7A6B73" tickLine={false} axisLine={false} />
            <YAxis stroke="#A1959C" tickLine={false} axisLine={false} domain={[0, 65000]} ticks={[0, 20000, 40000, 60000]} tickFormatter={(v) => v === 0 ? '₹0' : `₹${v/1000}K`} />
            <Bar dataKey="amt" radius={[6, 6, 0, 0]}>
              {trendData.map((entry, index) => (
                <cell 
                  key={`cell-${index}`} 
                  fill={entry.current ? '#5C0632' : '#E26189'} 
                  stroke={entry.amt === 0 ? '#E9E4E0' : 'none'}
                  strokeDasharray={entry.amt === 0 ? '3 3' : '0'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}