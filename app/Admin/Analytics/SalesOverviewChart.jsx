'use client';
import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const chartDataByPeriod = {
  today: [
    { label: '00:00', current: 1800 },
    { label: '04:00', current: 4200 },
    { label: '08:00', current: 9600 },
    { label: '12:00', current: 15400 },
    { label: '16:00', current: 20100 },
    { label: '20:00', current: 28400 },
    { label: 'Now', current: 31200 },
  ],
  week: [
    { label: 'Mon', current: 14200 },
    { label: 'Tue', current: 18700 },
    { label: 'Wed', current: 21400 },
    { label: 'Thu', current: 28600 },
    { label: 'Fri', current: 19800 },
    { label: 'Sat', current: 15600 },
    { label: 'Sun', current: 10100 },
  ],
  month: [
    { label: 'W1', current: 85400 },
    { label: 'W2', current: 96400 },
    { label: 'W3', current: 103200 },
    { label: 'W4', current: 112800 },
  ],
  year: [
    { label: 'Jan', current: 322000 },
    { label: 'Feb', current: 348000 },
    { label: 'Mar', current: 371000 },
    { label: 'Apr', current: 402000 },
    { label: 'May', current: 438000 },
    { label: 'Jun', current: 421000 },
    { label: 'Jul', current: 447000 },
    { label: 'Aug', current: 462000 },
    { label: 'Sep', current: 478000 },
    { label: 'Oct', current: 501000 },
    { label: 'Nov', current: 536000 },
    { label: 'Dec', current: 574000 },
  ],
};

const periodLabels = {
  today: { current: 'Today' },
  week: { current: 'This Week' },
  month: { current: 'This Month' },
  year: { current: 'This Year' },
};

export default function SalesOverviewChart({ timePeriod = 'week' }) {
  const safePeriod = chartDataByPeriod[timePeriod] ? timePeriod : 'week';
  const data = chartDataByPeriod[safePeriod];
  const labels = periodLabels[safePeriod];

  return (
    <div className="bg-white p-6 rounded-3xl border border-[#E9E4E0] shadow-sm flex flex-col justify-between h-90">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-[#2B1B24]">Sales Overview ({safePeriod.charAt(0).toUpperCase() + safePeriod.slice(1)})</h2>
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3D0A21]" />
            <span className="text-[#4A3C44]">{labels.current}</span>
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
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE6" vertical={false} />
            <XAxis dataKey="label" stroke="#A1959C" tickLine={false} axisLine={false} />
            <YAxis stroke="#A1959C" tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}K`} />
            <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, '']} />
            <Area type="monotone" dataKey="current" stroke="#3D0A21" strokeWidth={3} fillOpacity={1} fill="url(#colorThisWeek)" activeDot={{ r: 6 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}