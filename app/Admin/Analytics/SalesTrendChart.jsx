'use client';
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Users } from 'lucide-react';

export default function UserVisitsChart() {
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState({ newUsers: 0, activeUsers: 0 });
  const [source, setSource] = useState('loading');

  useEffect(() => {
    fetch('/api/analytics/ga4-visits')
      .then((r) => r.json())
      .then((json) => {
        setData(json.days);
        setTotals(json.totals);
        setSource(json.source);
      })
      .catch(() => setSource('error'));
  }, []);

  return (
    <div className="bg-white p-6 rounded-3xl border border-[#e8bfd5] shadow-sm flex flex-col justify-between h-90">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#840d5c]" />
            <h2 className="text-base font-bold text-[#2f1126]">User Visits</h2>
            {source === 'sample' && (
              <span className="text-[9px] bg-[#f8eaf2] text-[#6d0b4b] px-1.5 py-0.5 rounded font-medium">Sample Data</span>
            )}
            {source === 'ga4' && (
              <span className="text-[9px] bg-[#edd4e3] text-[#5a073f] px-1.5 py-0.5 rounded font-medium">Live GA4</span>
            )}
          </div>
          <p className="text-[10px] text-[#8a5f79] mt-0.5">Last 7 days</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-[#2f1126]">{totals.activeUsers.toLocaleString()}</p>
          <p className="text-[10px] text-[#8a5f79]">Total Active Users</p>
        </div>
      </div>

      {source === 'loading' ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#e8bfd5] border-t-[#840d5c] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 w-full text-[10px] font-medium">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }} barSize={14} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1deea" vertical={false} />
              <XAxis dataKey="date" stroke="#8a5f79" tickLine={false} axisLine={false} />
              <YAxis stroke="#a0708b" tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '10px', border: '1px solid #e8bfd5', fontSize: '11px' }}
                formatter={(value, name) => [
                  value,
                  name === 'newUsers' ? 'New Users' : 'Active Users',
                ]}
              />
              <Legend
                formatter={(value) => (value === 'newUsers' ? 'New Users' : 'Active Users')}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '10px' }}
              />
              <Bar dataKey="activeUsers" fill="#d58cb5" radius={[4, 4, 0, 0]} />
              <Bar dataKey="newUsers" fill="#840d5c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}