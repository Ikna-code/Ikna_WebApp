'use client';

import React from 'react';

interface Props {
  title: string;
  value: string;
  growth: string;
  icon: React.ReactNode;
}

export default function StatCard({
  title,
  value,
  growth,
  icon,
}: Props) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#e8bfd5]">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-400">{title}</p>

          <h2 className="text-3xl font-bold text-[#840d5c] mt-2">
            {value}
          </h2>

          <p className="text-[#840d5c] text-sm mt-3">
            ↑ {growth} vs last month
          </p>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-[#f7e8f1] flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}