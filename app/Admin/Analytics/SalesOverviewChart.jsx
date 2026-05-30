'use client';
import React, { useEffect, useRef, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const formatTimePeriodLabel = (period) => {
  if (period === 'custom') return 'Custom';
  if (period === '7d') return '7D';
  if (period === '30d') return '30D';
  if (period === '90d') return '90D';
  return '1Y';
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const point = payload[0].payload;
  return (
    <div className="rounded-xl border border-[#e8bfd5] bg-white/95 p-3 shadow-xl backdrop-blur-md">
      <p className="mb-1 text-xs font-semibold text-[#8a5f79]">{point.label}</p>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#840d5c]" />
        <p className="text-sm font-bold text-[#2f1126]">₹{payload[0].value.toLocaleString('en-IN')}</p>
      </div>
    </div>
  );
};

function SalesOverviewChart({ timePeriod = 'week', data, legendLabel }) {
  const safeData = Array.isArray(data) ? data : [];
  const hasData = safeData.length > 0;
  const chartHeight = 320;

  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    const updateWidth = () => {
      const nextWidth = Math.round(element.getBoundingClientRect().width);
      setContainerWidth((current) => (current !== nextWidth ? nextWidth : current));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const maxValue = safeData.reduce((max, point) => Math.max(max, point.current || 0), 0);
  const xTickFontSize = containerWidth < 420 ? 9 : containerWidth < 768 ? 10 : 11;
  const xTickAngle = safeData.length > 14 ? -45 : 0;
  const xTickHeight = safeData.length > 14 ? 72 : 36;
  const yTickCount = containerWidth < 640 ? 4 : 6;

  const xTargetTicks = containerWidth < 420 ? 4 : containerWidth < 768 ? 6 : containerWidth < 1024 ? 8 : 12;
  const xTickInterval = Math.max(0, Math.ceil(safeData.length / Math.max(xTargetTicks, 1)) - 1);

  const yTickFormatter = (value) => {
    if (value === 0) return '₹0';
    if (maxValue >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (maxValue >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (maxValue >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value}`;
  };

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-[#e8bfd5] bg-white shadow-sm  h-[500px]">
      <div className="mb-6 flex items-center justify-between p-6 pb-0">
        <div>
          <h2 className="mt-0.5 text-lg font-bold text-[#2f1126]">Sales Overview ({formatTimePeriodLabel(timePeriod)})</h2>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[#edd4e3] bg-[#f8eef4] px-3 py-1.5 text-xs font-medium">
          <span className="h-2 w-2 rounded-full bg-[#840d5c]" />
          <span className="text-[#8a5f79]">{legendLabel}</span>
        </div>
      </div>

      {hasData ? (
        <div ref={containerRef} className="w-full">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={safeData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPremiumMagenta" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#840d5c" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#840d5c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1deea" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#b48da3"
                tickLine={false}
                axisLine={false}
                interval={xTickInterval}
                tick={{ fontSize: xTickFontSize, fill: '#8a5f79' }}
                angle={xTickAngle}
                textAnchor={xTickAngle ? 'end' : 'middle'}
                minTickGap={0}
                height={xTickHeight}
                dy={8}
              />
              <YAxis
                stroke="#b48da3"
                tickLine={false}
                axisLine={false}
                tickCount={yTickCount}
                tickFormatter={yTickFormatter}
                tick={{ fontSize: 11, fill: '#8a5f79' }}
                width={56}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e8bfd5', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area
                type="monotone"
                dataKey="current"
                stroke="#840d5c"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPremiumMagenta)"
                dot={{ r: 2, strokeWidth: 0, fill: '#840d5c' }}
                activeDot={{ r: 5, stroke: '#ffffff', strokeWidth: 2, fill: '#840d5c' }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-[#e8bfd5] bg-[#f8eef4]/60 text-sm font-medium text-[#8a5f79]">
          No statistical data available for this range
        </div>
      )}
    </div>
  );
}

export default React.memo(SalesOverviewChart);