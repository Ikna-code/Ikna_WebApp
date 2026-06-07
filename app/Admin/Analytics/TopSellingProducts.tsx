import React from 'react';
import Image from 'next/image';

type TopSellingProduct = {
  rank: number;
  name: string;
  revenue: string;
  units: string;
  bg?: string;
  image?: string;
};

export default function TopSellingProducts({
  products = [],
  isLoading = false,
}: {
  products?: TopSellingProduct[];
  isLoading?: boolean;
}) {
  const hasData = products.length > 0;

  return (
    <div className="bg-white p-6 rounded-3xl border border-[#e8bfd5] shadow-sm flex flex-col h-90">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-bold text-[#2f1126]">Top Selling Products</h2>
      </div>

      <div className="space-y-3.5 flex-1 overflow-y-auto pt-1">
        {isLoading ? (
          <div className="text-xs text-[#8a5f79]">Loading top products...</div>
        ) : !hasData ? (
          <div className="text-xs text-[#8a5f79]">No product sales found for this period.</div>
        ) : (
          products.map((prod) => (
            <div key={prod.rank} className="flex items-center justify-between pb-2 last:pb-0 border-b border-[#f1deea] last:border-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-bold text-[#a0708b] w-4">{prod.rank}</span>
                <div className={`relative w-10 h-10 rounded-xl ${prod.bg || 'bg-[#f8eaf2]'} flex items-center justify-center text-lg shadow-inner shrink-0 overflow-hidden`}>
                  {prod.image ? (
                    <Image src={prod.image} alt={prod.name} fill className="object-cover" sizes="40px" />
                  ) : (
                    <span>👙</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#2f1126] truncate">{prod.name}</p>
                  <p className="text-[10px] text-[#a0708b] mt-0.5">{prod.units}</p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-[#2f1126] shrink-0">{prod.revenue}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}