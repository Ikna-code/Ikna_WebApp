import React from 'react';
import { ShoppingBag, Users, Box } from 'lucide-react';

function MetricCard({ title, value, percentage, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-[#E9E4E0] shadow-sm flex items-center gap-4 w-full">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${iconBg} ${iconColor}`}>
        {Icon ? <Icon className="w-5 h-5" /> : '₹'}
      </div>
      <div>
        <p className="text-[11px] font-medium text-[#7A6B73]">{title}</p>
        <p className="text-xl font-bold text-[#2B1B24] tracking-tight mt-0.5">{value}</p>
        <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
          <span>▲ {percentage}</span> <span className="text-[#A1959C] font-normal">vs last week</span>
        </p>
      </div>
    </div>
  );
}

export default function MetricCardsGroup({ timePeriod = 'week', onTimePeriodChange }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-start">
      {/* Time-range Filters */}
      <div className="xl:col-span-1 flex xl:flex-col gap-1.5 p-1.5 bg-white rounded-2xl border border-[#E9E4E0] shadow-sm self-stretch justify-between">
        {['week', 'month', 'year'].map((period) => (
          <button
            key={period}
            onClick={() => onTimePeriodChange(period)}
            className={`flex-1 py-2 text-center text-xs font-semibold rounded-xl transition-all ${
              timePeriod === period
                ? 'bg-[#3D0A21] text-white shadow-sm'
                : 'text-[#7A6B73] hover:bg-[#FAF6F4]'
            }`}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid Indicators */}
      <div className="xl:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <MetricCard title="Total Sales" value="₹1,28,450" percentage="18.6%" iconBg="bg-[#FDF0F4]" iconColor="text-[#D84B77]" />
        <MetricCard title="Orders" value="542" percentage="12.4%" icon={ShoppingBag} iconBg="bg-[#FFF0F4]" iconColor="text-[#E0537A]" />
        <MetricCard title="Avg. Order Value" value="₹2,371" percentage="8.2%" icon={Users} iconBg="bg-[#F6EFF4]" iconColor="text-[#A1477A]" />
        <MetricCard title="Units Sold" value="1,248" percentage="15.3%" icon={Box} iconBg="bg-[#FFF1F3]" iconColor="text-[#E5536D]" />
      </div>
    </div>
  );
}