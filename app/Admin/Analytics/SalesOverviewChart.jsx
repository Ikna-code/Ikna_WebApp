'use client';
import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const chartDataByPeriod = {
  week: [
    { label: 'Mon', current: 14200, previous: 10000 },
    { label: 'Tue', current: 18700, previous: 14000 },
    { label: 'Wed', current: 21400, previous: 16000 },
    { label: 'Thu', current: 28600, previous: 20000 },
    { label: 'Fri', current: 19800, previous: 15000 },
    { label: 'Sat', current: 15600, previous: 13000 },
    { label: 'Sun', current: 10100, previous: 9000 },
  ],
  month: [
    { label: 'W1', current: 85400, previous: 70200 },
    { label: 'W2', current: 96400, previous: 76800 },
    { label: 'W3', current: 103200, previous: 84200 },
    { label: 'W4', current: 112800, previous: 90100 },
  ],
  year: [
    { label: 'Jan', current: 322000, previous: 281000 },
    { label: 'Feb', current: 348000, previous: 296000 },
    { label: 'Mar', current: 371000, previous: 314000 },
    { label: 'Apr', current: 402000, previous: 333000 },
    { label: 'May', current: 438000, previous: 359000 },
    { label: 'Jun', current: 421000, previous: 347000 },
    { label: 'Jul', current: 447000, previous: 366000 },
    { label: 'Aug', current: 462000, previous: 381000 },
    { label: 'Sep', current: 478000, previous: 392000 },
    { label: 'Oct', current: 501000, previous: 411000 },
    { label: 'Nov', current: 536000, previous: 428000 },
    { label: 'Dec', current: 574000, previous: 446000 },
  ],
};

const periodLabels = {
  week: { current: 'This Week', previous: 'Last Week' },
  month: { current: 'This Month', previous: 'Last Month' },
  year: { current: 'This Year', previous: 'Last Year' },
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
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F3B7CD]" />
            <span className="text-[#7A6B73]">{labels.previous}</span>
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
            <XAxis dataKey="label" stroke="#A1959C" tickLine={false} axisLine={false} />
            <YAxis stroke="#A1959C" tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}K`} />
            <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, '']} />
            <Area type="monotone" dataKey="previous" stroke="#F3B7CD" strokeWidth={2} fillOpacity={1} fill="url(#colorLastWeek)" />
            <Area type="monotone" dataKey="current" stroke="#3D0A21" strokeWidth={3} fillOpacity={1} fill="url(#colorThisWeek)" activeDot={{ r: 6 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}