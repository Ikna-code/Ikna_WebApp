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
    <div className="bg-white p-6 rounded-3xl border border-[#E9E4E0] shadow-sm flex flex-col justify-between h-90">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#D84B77]" />
            <h2 className="text-base font-bold text-[#2B1B24]">User Visits</h2>
            {source === 'sample' && (
              <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Sample Data</span>
            )}
            {source === 'ga4' && (
              <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">Live GA4</span>
            )}
          </div>
          <p className="text-[10px] text-[#7A6B73] mt-0.5">Last 7 days</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-[#2B1B24]">{totals.activeUsers.toLocaleString()}</p>
          <p className="text-[10px] text-[#7A6B73]">Total Active Users</p>
        </div>
      </div>

      {source === 'loading' ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#E9E4E0] border-t-[#3D0A21] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 w-full text-[10px] font-medium">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }} barSize={14} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3EDE9" vertical={false} />
              <XAxis dataKey="date" stroke="#7A6B73" tickLine={false} axisLine={false} />
              <YAxis stroke="#A1959C" tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '10px', border: '1px solid #E9E4E0', fontSize: '11px' }}
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
              <Bar dataKey="activeUsers" fill="#F3B7CD" radius={[4, 4, 0, 0]} />
              <Bar dataKey="newUsers" fill="#3D0A21" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}