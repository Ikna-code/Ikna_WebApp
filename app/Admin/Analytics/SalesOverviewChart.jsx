'use client';
import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const data = [
  { name: 'Mon', thisWeek: 14200, lastWeek: 10000 },
  { name: 'Tue', thisWeek: 18700, lastWeek: 14000 },
  { name: 'Wed', thisWeek: 21400, lastWeek: 16000 },
  { name: 'Thu', thisWeek: 28600, lastWeek: 20000 },
  { name: 'Fri', thisWeek: 19800, lastWeek: 15000 },
  { name: 'Sat', thisWeek: 15600, lastWeek: 13000 },
  { name: 'Sun', thisWeek: 10100, lastWeek: 9000 },
];

export default function SalesOverviewChart() {
  return (
    <div className="bg-white p-6 rounded-3xl border border-[#E9E4E0] shadow-sm flex flex-col justify-between h-[360px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-[#2B1B24]">Sales Overview</h2>
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3D0A21]" />
            <span className="text-[#4A3C44]">This Week</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F3B7CD]" />
            <span className="text-[#7A6B73]">Last Week</span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full text-[10px] font-medium">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorThisWeek" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3D0A21" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#3D0A21" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorLastWeek" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F3B7CD" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#F3B7CD" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE6" vertical={false} />
            <XAxis dataKey="name" stroke="#A1959C" tickLine={false} axisLine={false} />
            <YAxis stroke="#A1959C" tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}K`} />
            <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, '']} />
            <Area type="monotone" dataKey="lastWeek" stroke="#F3B7CD" strokeWidth={2} fillOpacity={1} fill="url(#colorLastWeek)" />
            <Area type="monotone" dataKey="thisWeek" stroke="#3D0A21" strokeWidth={3} fillOpacity={1} fill="url(#colorThisWeek)" activeDot={{ r: 6 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}