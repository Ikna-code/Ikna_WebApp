'use client';

import React, { useEffect, useMemo, useState } from 'react';

import Header from './Analytics/Header';
import MetricCardsGroup from './Analytics/MetricCardsGroup';
import SalesOverviewChart from './Analytics/SalesOverviewChart';
import SalesByChannelChart from './Analytics/SalesByChannelChart';
import TopSellingProducts from './Analytics/TopSellingProducts';
import SalesTrendChart from './Analytics/SalesTrendChart';
import RecentOrders from './Analytics/RecentOrders';

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

type TrendPoint = {
  date: string;
  orders: number;
  units: number;
};

type TopSellingProduct = {
  rank: number;
  productId: string;
  name: string;
  image?: string;
  revenue: string;
  units: string;
  bg?: string;
};

type RecentOrder = {
  id: string;
  status?: string;
  totalAmount?: number | string;
  createdAt?: string;
  updatedAt?: string;
  orderItems?: Array<{
    id: string;
    quantity?: number;
    product?: {
      name?: string;
    };
  }>;
};

type AnalyticsResponse = {
  source: string;
  metrics: MetricItem[];
  overview: OverviewPoint[];
  channels: ChannelItem[];
  topProducts: TopSellingProduct[];
  trend: {
    points: TrendPoint[];
    totals: {
      orders: number;
      units: number;
    };
  };
  recentOrders: RecentOrder[];
};

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

const FALLBACK_DATA: AnalyticsResponse = {
  source: 'fallback',
  metrics: [
    { title: 'Total Sales', value: '₹0', percentage: '0.0%', iconBg: 'bg-[#f8eaf2]', iconColor: 'text-[#840d5c]' },
    { title: "Today's Sales", value: '₹0', percentage: '0.0%', iconBg: 'bg-[#f3ddea]', iconColor: 'text-[#a33c82]' },
    { title: 'Orders', value: '0', percentage: '0.0%', iconBg: 'bg-[#edd4e3]', iconColor: 'text-[#6d0b4b]' },
    { title: 'Avg. Order Value', value: '₹0', percentage: '0.0%', iconBg: 'bg-[#f7e8f1]', iconColor: 'text-[#840d5c]' },
    { title: 'Units Sold', value: '0', percentage: '0.0%', iconBg: 'bg-[#f2dcea]', iconColor: 'text-[#6d0b4b]' },
  ],
  overview: [],
  channels: [],
  topProducts: [],
  trend: {
    points: [],
    totals: {
      orders: 0,
      units: 0,
    },
  },
  recentOrders: [],
};

export default function Dashboard() {
  const [startDate, setStartDate] = useState(new Date(2026, 4, 1));
  const [endDate, setEndDate] = useState(new Date(2026, 4, 30));
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');
  const [analytics, setAnalytics] = useState<AnalyticsResponse>(FALLBACK_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isCustomRange = timePeriod === 'custom';
  const today = useMemo(() => startOfDay(new Date()), []);

  const activeRange = useMemo(() => {
    if (isCustomRange) return { start: startOfDay(startDate), end: startOfDay(endDate) };
    return getPresetRange(timePeriod as BaseTimePeriod, today);
  }, [endDate, isCustomRange, startDate, timePeriod, today]);

  const formattedDateRange = `${formatDate(activeRange.start)} - ${formatDate(activeRange.end)}`;

  useEffect(() => {
    const controller = new AbortController();

    const loadAnalytics = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const params = new URLSearchParams({
          start: activeRange.start.toISOString(),
          end: activeRange.end.toISOString(),
        });

        const response = await fetch(`/api/admin/analytics/sales?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || 'Failed to load sales analytics');
        }

        const payload = (await response.json()) as AnalyticsResponse;
        setAnalytics(payload);
      } catch (error: unknown) {
        const isAbort = error instanceof Error && error.name === 'AbortError';
        if (isAbort) return;
        setAnalytics(FALLBACK_DATA);
        setLoadError(error instanceof Error ? error.message : 'Failed to load analytics data');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadAnalytics();

    return () => controller.abort();
  }, [activeRange.end, activeRange.start]);

  const activeMetrics = analytics.metrics;
  const overviewData = analytics.overview;
  const activeChannels = analytics.channels;
  const channelTotal = activeChannels.reduce((sum, item) => sum + item.value, 0);

  const revenueMetric = activeMetrics.find((metric) => metric.title.toLowerCase().includes('total sales'));
  const ordersMetric = activeMetrics.find((metric) => metric.title.toLowerCase().includes('orders'));
  const aovMetric = activeMetrics.find((metric) => metric.title.toLowerCase().includes('avg. order value'));

  const totalRevenueValue = revenueMetric ? parseMetricNumber(revenueMetric.value) : 0;
  const totalOrdersValue = ordersMetric ? parseMetricNumber(ordersMetric.value) : 0;
  const avgOrderValue = aovMetric ? parseMetricNumber(aovMetric.value) : 0;
  const dateRangeDays = daysBetweenInclusive(activeRange.start, activeRange.end);
  const dailyRunRate = dateRangeDays > 0 ? totalRevenueValue / dateRangeDays : 0;
  const projectedMonthlyRevenue = Math.round(dailyRunRate * 30);

  const topChannel = activeChannels[0] || null;
  const topThreeShare = (() => {
    if (!channelTotal) return 0;
    const topThreeValue = activeChannels.slice(0, 3).reduce((sum, item) => sum + item.value, 0);
    return Math.round((topThreeValue / channelTotal) * 100);
  })();

  const fastestGrowingMetric = activeMetrics.reduce(
    (best: { title: string; pct: number } | null, metric) => {
      const pct = Number(String(metric.percentage).replace('%', '').trim()) || 0;
      if (!best || pct > best.pct) return { title: metric.title, pct };
      return best;
    },
    null
  );

  const businessInsights = [
    'Revenue run-rate: ₹' + new Intl.NumberFormat('en-IN').format(Math.round(dailyRunRate)) + '/day, projecting ₹' + new Intl.NumberFormat('en-IN').format(projectedMonthlyRevenue) + ' for a 30-day cycle.',
    topChannel
      ? topChannel.name + ' contributes ' + topChannel.percentage + ' of sales value (₹' + new Intl.NumberFormat('en-IN').format(topChannel.value) + ').'
      : 'Category contribution data is unavailable for this period.',
    String(topThreeShare) + '% of revenue is concentrated in top 3 categories, signaling ' + (topThreeShare >= 75 ? 'high dependency risk' : 'healthy category diversification') + '.',
    fastestGrowingMetric
      ? fastestGrowingMetric.title + ' is growing fastest at ' + fastestGrowingMetric.pct.toFixed(1) + '% in the selected period.'
      : 'Growth signal unavailable due to insufficient metric history.',
  ];

  const exportSummaryRows = [
    ['Total Revenue', '₹' + new Intl.NumberFormat('en-IN').format(Math.round(totalRevenueValue)), ''],
    ['Total Orders', new Intl.NumberFormat('en-IN').format(Math.round(totalOrdersValue)), ''],
    ['Average Order Value', '₹' + new Intl.NumberFormat('en-IN').format(Math.round(avgOrderValue)), ''],
    ['Date Range (Days)', String(dateRangeDays), ''],
    ['Daily Revenue Run-Rate', '₹' + new Intl.NumberFormat('en-IN').format(Math.round(dailyRunRate)), ''],
    ['Projected 30-Day Revenue', '₹' + new Intl.NumberFormat('en-IN').format(projectedMonthlyRevenue), ''],
    ['Top Category', topChannel ? topChannel.name : 'N/A', ''],
    ['Top Category Share', topChannel ? topChannel.percentage : 'N/A', ''],
    ['Top 3 Category Share', String(topThreeShare) + '%', ''],
    ['Data Source', analytics.source, ''],
  ];

  const reportPreview = {
    period: formatTimePeriodLabel(timePeriod) + ' - ' + formattedDateRange,
    metrics: activeMetrics,
    channels: activeChannels,
    insights: businessInsights,
    summaryRows: exportSummaryRows.map(([label, val]) => [label, val]),
  };

  const handleExportReport = () => {
    // Generate styled HTML Table with inline CSS styles
    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          td { border: 1px solid #e2e8f0; padding: 6px 12px; font-size: 11pt; color: #334155; }
          
          /* Title styling */
          .report-title { font-size: 16pt; font-weight: bold; color: #1e293b; padding: 12px 0; }
          .metadata-label { font-weight: bold; color: #64748b; background-color: #f8fafc; }
          
          /* Colored background table headings */
          .heading-row th { 
            background-color: #4f46e5; 
            color: #ffffff; 
            font-weight: bold; 
            text-align: left; 
            padding: 10px 12px; 
            font-size: 12pt;
            border: 1px solid #4338ca;
          }
          
          /* Sub-heading / Column metric labels styling */
          .column-header td {
            background-color: #e0e7ff;
            color: #312e81;
            font-weight: bold;
            border: 1px solid #c7d2fe;
          }
          
          .insight-label { font-weight: bold; color: #b45309; background-color: #fffbeb; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="3" class="report-title">Sales Analytics Report</td></tr>
          <tr><td class="metadata-label">Period</td><td colspan="2">${formattedDateRange}</td></tr>
          <tr><td class="metadata-label">Time Frame</td><td colspan="2">${formatTimePeriodLabel(timePeriod)}</td></tr>
          <tr><td class="metadata-label">Data Source</td><td colspan="2">${analytics.source}</td></tr>
          <tr><td colspan="3"></td></tr>
          
          <tr class="heading-row"><th colspan="3">Business Summary</th></tr>
          <tr class="column-header"><td>Business Summary Metric</td><td>Value</td><td>Details / Context</td></tr>
          ${exportSummaryRows.map(row => `
            <tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td></tr>
          `).join('')}
          <tr><td colspan="3"></td></tr>
          
          <tr class="heading-row"><th colspan="3">Performance Metrics</th></tr>
          <tr class="column-header"><td>Performance Metrics</td><td>Value</td><td>Growth / Contribution Share</td></tr>
          ${activeMetrics.map(metric => `
            <tr><td>${metric.title}</td><td>${metric.value}</td><td>${metric.percentage}</td></tr>
          `).join('')}
          <tr><td colspan="3"></td></tr>
          
          <tr class="heading-row"><th colspan="3">Sales by Category</th></tr>
          <tr class="column-header"><td>Category Name</td><td>Revenue Value</td><td>Category Share Percentage</td></tr>
          ${activeChannels.map(channel => `
            <tr><td>${channel.name}</td><td>₹${channel.value.toLocaleString('en-IN')}</td><td>${channel.percentage}</td></tr>
          `).join('')}
          <tr><td colspan="3"></td></tr>
          
          <tr class="heading-row"><th colspan="3">Actionable Business Insights</th></tr>
          ${businessInsights.map((insight, index) => `
            <tr><td class="insight-label">Insight ${index + 1}</td><td colspan="2">${insight}</td></tr>
          `).join('')}
          <tr><td colspan="3"></td></tr>
          
          <tr><td class="metadata-label">Generated on</td><td colspan="2">${new Date().toLocaleString()}</td></tr>
        </table>
      </body>
      </html>
    `;

    // Create file blob out of HTML layout and prompt spreadsheet application download
    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const element = document.createElement('a');
    element.setAttribute('href', url);
    element.setAttribute('download', `sales_report_${new Date().getTime()}.xls`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
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

      {loadError && (
        <div className="rounded-xl border border-[#f1deea] bg-[#fff6fb] px-4 py-3 text-xs font-medium text-[#840d5c]">
          {loadError}
        </div>
      )}

      <MetricCardsGroup timePeriod={timePeriod} onTimePeriodChange={handleTimePeriodChange} metrics={activeMetrics} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
        <section className="xl:col-span-8">
          <SalesOverviewChart
            timePeriod={timePeriod}
            data={overviewData}
            legendLabel={isCustomRange ? formattedDateRange : formatTimePeriodLabel(timePeriod)}
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
        <TopSellingProducts products={analytics.topProducts} isLoading={isLoading} />
        <SalesTrendChart
          data={analytics.trend.points as Array<{ date: string; orders: number; units: number }>}
          totals={analytics.trend.totals}
          periodLabel={formatTimePeriodLabel(timePeriod)}
          isLoading={isLoading}
        />
        <RecentOrders orders={analytics.recentOrders} isLoading={isLoading} />
      </div>
    </div>
  );
}