import React from 'react';

const products = [
  { rank: 1, name: 'Barely There Comfy Bra', revenue: '₹45,600', units: '186 units', bg: 'bg-[#f8eaf2]', icon: '👙' },
  { rank: 2, name: 'Light Padded Bra', revenue: '₹32,750', units: '132 units', bg: 'bg-[#f3ddea]', icon: '👚' },
  { rank: 3, name: 'Everyday Wear Comfy Bra', revenue: '₹18,990', units: '98 units', bg: 'bg-[#edd4e3]', icon: '👙' },
  { rank: 4, name: 'Wirefree T-shirt Bra', revenue: '₹15,320', units: '74 units', bg: 'bg-[#f2dcea]', icon: '👚' },
];

export default function TopSellingProducts() {
  return (
    <div className="bg-white p-6 rounded-3xl border border-[#e8bfd5] shadow-sm flex flex-col justify-between h-[360px]">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-bold text-[#2f1126]">Top Selling Products</h2>
      </div>

      <div className="space-y-3.5 flex-1 flex flex-col justify-center">
        {products.map((prod) => (
          <div key={prod.rank} className="flex items-center justify-between pb-2 last:pb-0 border-b border-[#f1deea] last:border-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-bold text-[#a0708b] w-4">{prod.rank}</span>
              <div className={`w-10 h-10 rounded-xl ${prod.bg} flex items-center justify-center text-lg shadow-inner shrink-0`}>
                {prod.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#2f1126] truncate">{prod.name}</p>
                <p className="text-[10px] text-[#a0708b] mt-0.5">{prod.units}</p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-[#2f1126] shrink-0">{prod.revenue}</span>
          </div>
        ))}
      </div>
    </div>
  );
}