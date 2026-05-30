import React from 'react';
import { ShoppingBag, Users, Box } from 'lucide-react';

function MetricCard({ title, value, percentage, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="flex w-44 shrink-0 items-center gap-2 rounded-xl border border-[#e8bfd5] bg-white p-2.5 shadow-sm sm:w-full sm:gap-4 sm:rounded-2xl sm:p-5">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold sm:h-12 sm:w-12 sm:rounded-xl sm:text-lg ${iconBg} ${iconColor}`}>
        {Icon ? <Icon className="h-3.5 w-3.5 sm:h-5 sm:w-5" /> : '₹'}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[9px] font-medium leading-tight text-[#8a5f79] sm:text-[11px]">{title}</p>
        <p className="mt-0.5 truncate text-base font-bold tracking-tight text-[#2f1126] sm:text-xl">{value}</p>
        <p className="mt-0.5 text-[9px] font-semibold text-[#840d5c] sm:flex sm:items-center sm:gap-1 sm:text-[10px]">
          <span>▲ {percentage}</span>
          <span className="hidden text-[#a0708b] font-normal sm:inline">vs last week</span>
        </p>
      </div>
    </div>
  );
}

export default function MetricCardsGroup({ timePeriod = 'week', onTimePeriodChange, metrics }) {
  const metricItems = metrics || [
    { title: 'Total Sales', value: '₹1,28,450', percentage: '18.6%', iconBg: 'bg-[#f8eaf2]', iconColor: 'text-[#840d5c]' },
    { title: "Today's Sales", value: '₹28,600', percentage: '9.3%', iconBg: 'bg-[#f3ddea]', iconColor: 'text-[#a33c82]' },
    { title: 'Orders', value: '542', percentage: '12.4%', icon: ShoppingBag, iconBg: 'bg-[#edd4e3]', iconColor: 'text-[#6d0b4b]' },
    { title: 'Avg. Order Value', value: '₹2,371', percentage: '8.2%', icon: Users, iconBg: 'bg-[#f7e8f1]', iconColor: 'text-[#840d5c]' },
    { title: 'Units Sold', value: '1,248', percentage: '15.3%', icon: Box, iconBg: 'bg-[#f2dcea]', iconColor: 'text-[#6d0b4b]' },
  ];
  const hasMetrics = metricItems.length > 0;
  const periodOptions = [
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' },
    { value: '1y', label: '1Y' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-start">
      {/* Time-range Filters */}
      <div className="xl:col-span-1 flex xl:flex-col gap-1.5 p-1.5 bg-white rounded-2xl border border-[#e8bfd5] shadow-sm self-stretch justify-between">
        {periodOptions.map((period) => (
          <button
            key={period.value}
            onClick={() => onTimePeriodChange(period.value)}
            className={`flex-1 py-2 text-center text-xs font-semibold rounded-xl transition-all ${
              timePeriod === period.value
                ? 'bg-[#840d5c] text-white shadow-sm'
                : 'text-[#8a5f79] hover:bg-[#f8eef4]'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Grid Indicators */}
      {hasMetrics ? (
        <div className="xl:col-span-4 flex w-full flex-nowrap gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-5">
          {metricItems.map((item) => (
            <MetricCard key={item.title} {...item} />
          ))}
        </div>
      ) : (
        <div className="xl:col-span-4 flex h-full min-h-24 items-center justify-center rounded-2xl border border-dashed border-[#e8bfd5] bg-white px-4 py-6 text-sm font-medium text-[#8a5f79] shadow-sm">
          No results found
        </div>
      )}
    </div>
  );
}