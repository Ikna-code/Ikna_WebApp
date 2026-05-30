
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Header from './Analytics/Header';
import MetricCardsGroup from './Analytics/MetricCardsGroup';
import SalesOverviewChart from './Analytics/SalesOverviewChart';
import SalesByChannelChart from './Analytics/SalesByChannelChart';
import TopSellingProducts from './Analytics/TopSellingProducts';
import SalesTrendChart from './Analytics/SalesTrendChart';
import RecentOrders from './Analytics/RecentOrders';
import { useStore } from '@/store/useStore';

type BaseTimePeriod = '7d' | '30d' | '90d' | '1y';
type TimePeriod = BaseTimePeriod | 'custom';

type MetricItem = {
  title: string;
  value: string;
  percentage: string;
  iconBg: string;
  iconColor: string;
};

type ChannelItem = {
  name: string;
  value: number;
  percentage: string;
  color: string;
};

type OverviewPoint = {
  label: string;
  tickLabel: string;
  current: number;
};

const metricsByPeriod: Record<BaseTimePeriod, MetricItem[]> = {
  '7d': [
    { title: 'Total Sales', value: '₹53,00,000', percentage: '21.4%', iconBg: 'bg-[#f8eaf2]', iconColor: 'text-[#840d5c]' },
    { title: "Today's Sales", value: '₹57,400', percentage: '11.8%', iconBg: 'bg-[#f3ddea]', iconColor: 'text-[#a33c82]' },
    { title: 'Orders', value: '268', percentage: '9.6%', iconBg: 'bg-[#edd4e3]', iconColor: 'text-[#6d0b4b]' },
    { title: 'Avg. Order Value', value: '₹2,142', percentage: '4.1%', iconBg: 'bg-[#f7e8f1]', iconColor: 'text-[#840d5c]' },
    { title: 'Units Sold', value: '612', percentage: '8.9%', iconBg: 'bg-[#f2dcea]', iconColor: 'text-[#6d0b4b]' },
  ],
  '30d': [
    { title: 'Total Sales', value: '₹1,28,450', percentage: '18.6%', iconBg: 'bg-[#f8eaf2]', iconColor: 'text-[#840d5c]' },
    { title: "Today's Sales", value: '₹28,600', percentage: '9.3%', iconBg: 'bg-[#f3ddea]', iconColor: 'text-[#a33c82]' },
    { title: 'Orders', value: '542', percentage: '12.4%', iconBg: 'bg-[#edd4e3]', iconColor: 'text-[#6d0b4b]' },
    { title: 'Avg. Order Value', value: '₹2,371', percentage: '8.2%', iconBg: 'bg-[#f7e8f1]', iconColor: 'text-[#840d5c]' },
    { title: 'Units Sold', value: '1,248', percentage: '15.3%', iconBg: 'bg-[#f2dcea]', iconColor: 'text-[#6d0b4b]' },
  ],
  '90d': [
    { title: 'Total Sales', value: '₹3,97,800', percentage: '14.2%', iconBg: 'bg-[#f8eaf2]', iconColor: 'text-[#840d5c]' },
    { title: "Today's Sales", value: '₹41,200', percentage: '6.3%', iconBg: 'bg-[#f3ddea]', iconColor: 'text-[#a33c82]' },
    { title: 'Orders', value: '1,864', percentage: '10.1%', iconBg: 'bg-[#edd4e3]', iconColor: 'text-[#6d0b4b]' },
    { title: 'Avg. Order Value', value: '₹2,134', percentage: '4.8%', iconBg: 'bg-[#f7e8f1]', iconColor: 'text-[#840d5c]' },
    { title: 'Units Sold', value: '4,286', percentage: '11.7%', iconBg: 'bg-[#f2dcea]', iconColor: 'text-[#6d0b4b]' },
  ],
  '1y': [
    { title: 'Total Sales', value: '₹53,00,000', percentage: '21.4%', iconBg: 'bg-[#f8eaf2]', iconColor: 'text-[#840d5c]' },
    { title: "Today's Sales", value: '₹57,400', percentage: '3.7%', iconBg: 'bg-[#f3ddea]', iconColor: 'text-[#a33c82]' },
    { title: 'Orders', value: '24,860', percentage: '17.3%', iconBg: 'bg-[#edd4e3]', iconColor: 'text-[#6d0b4b]' },
    { title: 'Avg. Order Value', value: '₹2,132', percentage: '3.9%', iconBg: 'bg-[#f7e8f1]', iconColor: 'text-[#840d5c]' },
    { title: 'Units Sold', value: '58,920', percentage: '19.1%', iconBg: 'bg-[#f2dcea]', iconColor: 'text-[#6d0b4b]' },
  ],
};

const channelDataByPeriod: Record<BaseTimePeriod, ChannelItem[]> = {
  '7d': [
    { name: 'T-Shirt Bras', value: 31240, percentage: '54%', color: '#840d5c' },
    { name: 'Push-Up Bras', value: 14350, percentage: '25%', color: '#a33c82' },
    { name: 'Non-Padded Bras', value: 6400, percentage: '11%', color: '#c66aa0' },
    { name: 'Panty', value: 3900, percentage: '7%', color: '#d58cb5' },
    { name: 'Shapewear', value: 1510, percentage: '3%', color: '#e8bfd5' },
  ],
  '30d': [
    { name: 'T-Shirt Bras', value: 69283, percentage: '54%', color: '#840d5c' },
    { name: 'Push-Up Bras', value: 30742, percentage: '24%', color: '#a33c82' },
    { name: 'Non-Padded Bras', value: 15385, percentage: '12%', color: '#c66aa0' },
    { name: 'Panty', value: 10240, percentage: '8%', color: '#d58cb5' },
    { name: 'Shapewear', value: 2800, percentage: '2%', color: '#e8bfd5' },
  ],
  '90d': [
    { name: 'T-Shirt Bras', value: 212000, percentage: '53%', color: '#840d5c' },
    { name: 'Push-Up Bras', value: 97300, percentage: '24%', color: '#a33c82' },
    { name: 'Non-Padded Bras', value: 47600, percentage: '12%', color: '#c66aa0' },
    { name: 'Panty', value: 29200, percentage: '7%', color: '#d58cb5' },
    { name: 'Shapewear', value: 11700, percentage: '4%', color: '#e8bfd5' },
  ],
  '1y': [
    { name: 'T-Shirt Bras', value: 2860000, percentage: '54%', color: '#840d5c' },
    { name: 'Push-Up Bras', value: 1325000, percentage: '25%', color: '#a33c82' },
    { name: 'Non-Padded Bras', value: 582000, percentage: '11%', color: '#c66aa0' },
    { name: 'Panty', value: 371000, percentage: '7%', color: '#d58cb5' },
    { name: 'Shapewear', value: 162000, percentage: '3%', color: '#e8bfd5' },
  ],
};

const overviewByPeriod: Record<BaseTimePeriod, OverviewPoint[]> = {
  '7d': [
    { label: 'May 24', tickLabel: 'May 24', current: 1800 },
    { label: 'May 25', tickLabel: 'May 25', current: 4200 },
    { label: 'May 26', tickLabel: 'May 26', current: 9600 },
    { label: 'May 27', tickLabel: 'May 27', current: 15400 },
    { label: 'May 28', tickLabel: 'May 28', current: 20100 },
    { label: 'May 29', tickLabel: 'May 29', current: 28400 },
    { label: 'May 30', tickLabel: 'May 30', current: 31200 },
  ],
  '30d': Array.from({ length: 30 }, (_, index) => ({
    label: `May ${index + 1}`,
    tickLabel: index === 0 || index === 29 || (index + 1) % 5 === 0 ? `May ${index + 1}` : '',
    current: 9800 + (index % 7) * 1650 + index * 190,
  })),
  '90d': Array.from({ length: 90 }, (_, index) => {
    const pointDate = new Date(2026, 2, 1 + index);
    const label = pointDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      label,
      tickLabel: index === 0 || index === 89 || index % 10 === 0 ? label : '',
      current: 15200 + (index % 9) * 2100 + Math.floor(index / 10) * 900,
    };
  }),
  '1y': [
    { label: 'Jan', tickLabel: 'Jan', current: 322000 },
    { label: 'Feb', tickLabel: 'Feb', current: 348000 },
    { label: 'Mar', tickLabel: 'Mar', current: 371000 },
    { label: 'Apr', tickLabel: 'Apr', current: 402000 },
    { label: 'May', tickLabel: 'May', current: 438000 },
    { label: 'Jun', tickLabel: 'Jun', current: 421000 },
    { label: 'Jul', tickLabel: 'Jul', current: 447000 },
    { label: 'Aug', tickLabel: 'Aug', current: 462000 },
    { label: 'Sep', tickLabel: 'Sep', current: 478000 },
    { label: 'Oct', tickLabel: 'Oct', current: 501000 },
    { label: 'Nov', tickLabel: 'Nov', current: 536000 },
    { label: 'Dec', tickLabel: 'Dec', current: 574000 },
  ],
};

const DATA_MIN = new Date(2026, 0, 1);
const DATA_MAX = new Date(2026, 11, 31);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const daysBetweenInclusive = (start: Date, end: Date) => {
  const diffMs = startOfDay(end).getTime() - startOfDay(start).getTime();
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
};

const parseMetricNumber = (value: string) => {
  const cleaned = value.replace(/[^\d.]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMetricValue = (title: string, value: number) => {
  const rounded = Math.round(value);
  const formatted = new Intl.NumberFormat('en-IN').format(rounded);
  if (title.includes('Sales') || title.includes('Value')) return `₹${formatted}`;
  return formatted;
};

const formatTimePeriodLabel = (period: TimePeriod) => {
  if (period === 'custom') return 'Custom';
  if (period === '7d') return '7D';
  if (period === '30d') return '30D';
  if (period === '90d') return '90D';
  return '1Y';
};

const getPresetRange = (period: BaseTimePeriod, now: Date) => {
  const today = startOfDay(now);
  if (period === '7d') {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return { start, end: today };
  }
  if (period === '30d') {
    const start = new Date(today);
    start.setDate(today.getDate() - 29);
    return { start, end: today };
  }
  if (period === '90d') {
    const start = new Date(today);
    start.setDate(today.getDate() - 89);
    return { start, end: today };
  }
  const start = new Date(today);
  start.setFullYear(today.getFullYear() - 1);
  start.setDate(today.getDate() + 1);
  return { start, end: today };
};

const getCustomRangeWithinData = (startDate: Date, endDate: Date) => {
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  const overlapStart = new Date(Math.max(start.getTime(), DATA_MIN.getTime()));
  const overlapEnd = new Date(Math.min(end.getTime(), DATA_MAX.getTime()));
  if (overlapStart.getTime() > overlapEnd.getTime()) return null;
  return { start: overlapStart, end: overlapEnd };
};

const getCustomOverviewData = (startDate: Date, endDate: Date) => {
  const range = getCustomRangeWithinData(startDate, endDate);
  if (!range) return [];

  const seedWeek = overviewByPeriod['7d'];
  const span = daysBetweenInclusive(range.start, range.end);
  const scale = clamp(span / 7, 0.35, 10);
  const labelStep = Math.max(1, Math.ceil(span / 8));

  return Array.from({ length: span }, (_, index) => {
    const d = new Date(range.start);
    d.setDate(range.start.getDate() + index);
    const fullLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      label: fullLabel,
      tickLabel: index === 0 || index === span - 1 || index % labelStep === 0 ? fullLabel : '',
      current: Math.round(seedWeek[index % seedWeek.length].current * scale),
    };
  });
};

const getCustomMetrics = (startDate: Date, endDate: Date) => {
  const range = getCustomRangeWithinData(startDate, endDate);
  if (!range) return [];

  const daySpan = daysBetweenInclusive(range.start, range.end);
  const scale = clamp(daySpan / 30, 0.25, 12);
  return metricsByPeriod['30d'].map((metric) => {
    const baseValue = parseMetricNumber(metric.value);
    const scaledValue = metric.title === 'Avg. Order Value' ? baseValue * (0.92 + scale * 0.08) : baseValue * scale;
    const basePct = Number(metric.percentage.replace('%', '')) || 0;
    const nextPct = clamp(basePct + (daySpan - 30) * 0.12, 1.0, 42);
    return {
      ...metric,
      value: formatMetricValue(metric.title, scaledValue),
      percentage: `${nextPct.toFixed(1)}%`,
    };
  });
};

const getCustomChannels = (startDate: Date, endDate: Date) => {
  const range = getCustomRangeWithinData(startDate, endDate);
  if (!range) return [];

  const daySpan = daysBetweenInclusive(range.start, range.end);
  const scale = clamp(daySpan / 30, 0.25, 12);
  const scaled = channelDataByPeriod['30d'].map((item) => ({
    ...item,
    value: Math.round(item.value * scale),
  }));
  const total = scaled.reduce((sum, item) => sum + item.value, 0);
  return scaled.map((item) => ({
    ...item,
    percentage: `${Math.round((item.value / total) * 100)}%`,
  }));
};

const parseNumericValue = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === 'object') {
    const maybeDecimal = value as { toNumber?: () => number; toString?: () => string };
    if (typeof maybeDecimal.toNumber === 'function') {
      const num = maybeDecimal.toNumber();
      return Number.isFinite(num) ? num : 0;
    }
    if (typeof maybeDecimal.toString === 'function') {
      const parsed = Number(maybeDecimal.toString());
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }
  return 0;
};

export default function Dashboard() {
  const [startDate, setStartDate] = useState(new Date(2026, 4, 1));
  const [endDate, setEndDate] = useState(new Date(2026, 4, 30));
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');
  const isCustomRange = timePeriod === 'custom';

  const products = useStore((state) => state.products);
  const isProductsInitialized = useStore((state) => state.isProductsInitialized);
  const loadProducts = useStore((state) => state.loadProducts);

  useEffect(() => {
    if (!isProductsInitialized) {
      void loadProducts();
    }
  }, [isProductsInitialized, loadProducts]);

  const today = useMemo(() => startOfDay(new Date()), []);

  const activeRange = useMemo(() => {
    if (isCustomRange) return { start: startOfDay(startDate), end: startOfDay(endDate) };
    return getPresetRange(timePeriod as BaseTimePeriod, today);
  }, [endDate, isCustomRange, startDate, timePeriod, today]);

  const formattedDateRange = `${formatDate(activeRange.start)} – ${formatDate(activeRange.end)}`;

  const overviewData = useMemo(() => {
    if (isCustomRange) return getCustomOverviewData(startDate, endDate);
    return overviewByPeriod[timePeriod as BaseTimePeriod];
  }, [endDate, isCustomRange, startDate, timePeriod]);

  const activeMetrics = useMemo(() => {
    if (isCustomRange) return getCustomMetrics(startDate, endDate);
    return metricsByPeriod[timePeriod as BaseTimePeriod];
  }, [endDate, isCustomRange, startDate, timePeriod]);

  const channelsFromProducts = useMemo(() => {
    if (!products.length) return [] as ChannelItem[];

    const categoryTotals = new Map<string, number>();

    products.forEach((product: any) => {
      const category = String(product?.category || 'Uncategorized').trim() || 'Uncategorized';
      const price = parseNumericValue(product?.price);
      const stock = Math.max(0, parseNumericValue(product?.stock));
      const totalValue = price * stock;

      categoryTotals.set(category, (categoryTotals.get(category) || 0) + totalValue);
    });

    const palette = ['#840d5c', '#a33c82', '#c66aa0', '#d58cb5', '#e8bfd5', '#6d0b4b', '#b55a93', '#edd4e3'];
    const sorted = Array.from(categoryTotals.entries())
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    const total = sorted.reduce((sum, item) => sum + item.value, 0);
    if (!total) return [] as ChannelItem[];

    return sorted.map((item, index) => ({
      ...item,
      percentage: `${Math.round((item.value / total) * 100)}%`,
      color: palette[index % palette.length],
    }));
  }, [products]);

  const activeChannels = useMemo(() => {
    if (channelsFromProducts.length > 0) return channelsFromProducts;
    if (isCustomRange) return getCustomChannels(startDate, endDate);
    return channelDataByPeriod[timePeriod as BaseTimePeriod];
  }, [channelsFromProducts, endDate, isCustomRange, startDate, timePeriod]);

  const channelTotal = activeChannels.reduce((sum, item) => sum + item.value, 0);

  const reportPreview = {
    period: `${formatTimePeriodLabel(timePeriod)} • ${formattedDateRange}`,
    metrics: activeMetrics,
    channels: activeChannels,
  };

  const handleExportReport = () => {
    const csvContent = [
      ['Sales Analytics Report'],
      ['Period', formattedDateRange],
      ['Time Frame', formatTimePeriodLabel(timePeriod)],
      [''],
      ['Metrics'],
      ...activeMetrics.map((metric) => [metric.title, metric.value, metric.percentage]),
      [''],
      ['Sales by Category'],
      ...activeChannels.map((channel) => [channel.name, `₹${channel.value.toLocaleString()}`, channel.percentage]),
      [''],
      ['Generated on', new Date().toLocaleString()],
    ].map((row) => row.join(',')).join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    element.setAttribute('download', `sales_report_${new Date().getTime()}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleTimePeriodChange = (period: TimePeriod) => {
    setTimePeriod(period);
    if (period !== 'custom') {
      const preset = getPresetRange(period as BaseTimePeriod, today);
      setStartDate(preset.start);
      setEndDate(preset.end);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <Header
        startDate={startDate}
        endDate={endDate}
        onDateChange={(start: Date, end: Date) => {
          setStartDate(start);
          setEndDate(end);
        }}
        showDateFilter={isCustomRange}
        onExport={handleExportReport}
        reportPreview={reportPreview}
      />
      <MetricCardsGroup timePeriod={timePeriod} onTimePeriodChange={handleTimePeriodChange} metrics={activeMetrics} />

<div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
  <section className="xl:col-span-8">
    <SalesOverviewChart
      timePeriod={timePeriod}
      data={overviewData}
      legendLabel={
        isCustomRange
          ? formattedDateRange
          : formatTimePeriodLabel(timePeriod)
      }
    />
  </section>

  <aside className="xl:col-span-4 self-start">
    <SalesByChannelChart
      timePeriod={timePeriod}
      data={activeChannels}
      totalLabel={`₹${channelTotal.toLocaleString()}`}
    />
  </aside>
</div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <TopSellingProducts />
        <SalesTrendChart />
        <RecentOrders />
      </div>
    </div>
  );
}
