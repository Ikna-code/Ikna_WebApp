import React from 'react';
import { ShoppingBag, Users, Box } from 'lucide-react';

function MetricCard({ title, value, percentage, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="flex w-44 shrink-0 items-center gap-2 rounded-xl border border-[#E9E4E0] bg-white p-2.5 shadow-sm sm:w-full sm:gap-4 sm:rounded-2xl sm:p-5">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold sm:h-12 sm:w-12 sm:rounded-xl sm:text-lg ${iconBg} ${iconColor}`}>
        {Icon ? <Icon className="h-3.5 w-3.5 sm:h-5 sm:w-5" /> : '₹'}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[9px] font-medium leading-tight text-[#7A6B73] sm:text-[11px]">{title}</p>
        <p className="mt-0.5 truncate text-base font-bold tracking-tight text-[#2B1B24] sm:text-xl">{value}</p>
        <p className="mt-0.5 text-[9px] font-semibold text-emerald-600 sm:flex sm:items-center sm:gap-1 sm:text-[10px]">
          <span>▲ {percentage}</span>
          <span className="hidden text-[#A1959C] font-normal sm:inline">vs last week</span>
        </p>
      </div>
    </div>
  );
}

export default function MetricCardsGroup({ timePeriod = 'week', onTimePeriodChange, metrics }) {
  const metricItems = metrics || [
    { title: 'Total Sales', value: '₹1,28,450', percentage: '18.6%', iconBg: 'bg-[#FDF0F4]', iconColor: 'text-[#D84B77]' },
    { title: "Today's Sales", value: '₹28,600', percentage: '9.3%', iconBg: 'bg-[#FFF0F4]', iconColor: 'text-[#E0537A]' },
    { title: 'Orders', value: '542', percentage: '12.4%', icon: ShoppingBag, iconBg: 'bg-[#F6EFF4]', iconColor: 'text-[#A1477A]' },
    { title: 'Avg. Order Value', value: '₹2,371', percentage: '8.2%', icon: Users, iconBg: 'bg-[#FFF1F3]', iconColor: 'text-[#E5536D]' },
    { title: 'Units Sold', value: '1,248', percentage: '15.3%', icon: Box, iconBg: 'bg-[#FFF6EE]', iconColor: 'text-[#D66C2D]' },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-start">
      {/* Time-range Filters */}
      <div className="xl:col-span-1 flex xl:flex-col gap-1.5 p-1.5 bg-white rounded-2xl border border-[#E9E4E0] shadow-sm self-stretch justify-between">
        {['today', 'week', 'month', 'year'].map((period) => (
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
      <div className="xl:col-span-4 flex w-full flex-nowrap gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-5">
        {metricItems.map((item) => (
          <MetricCard key={item.title} {...item} />
        ))}
      </div>
    </div>
  );
}