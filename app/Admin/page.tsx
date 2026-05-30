
'use client';
import React, { useState } from 'react';
import Header from './Analytics/Header';
import MetricCardsGroup from './Analytics/MetricCardsGroup';
import SalesOverviewChart from './Analytics/SalesOverviewChart';
import SalesByChannelChart from './Analytics/SalesByChannelChart';
import TopSellingProducts from './Analytics/TopSellingProducts';
import SalesTrendChart from './Analytics/SalesTrendChart';
// SalesTrendChart is now UserVisitsChart — re-exported from the same file
import RecentOrders from './Analytics/RecentOrders';

type TimePeriod = 'today' | 'week' | 'month' | 'year';

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

const metricsByPeriod: Record<TimePeriod, MetricItem[]> = {
  today: [
    { title: 'Total Sales', value: '₹53,00,000', percentage: '21.4%', iconBg: 'bg-[#FDF0F4]', iconColor: 'text-[#D84B77]' },
    { title: "Today's Sales", value: '₹57,400', percentage: '11.8%', iconBg: 'bg-[#FFF0F4]', iconColor: 'text-[#E0537A]' },
    { title: 'Orders', value: '268', percentage: '9.6%', iconBg: 'bg-[#F6EFF4]', iconColor: 'text-[#A1477A]' },
    { title: 'Avg. Order Value', value: '₹2,142', percentage: '4.1%', iconBg: 'bg-[#FFF1F3]', iconColor: 'text-[#E5536D]' },
    { title: 'Units Sold', value: '612', percentage: '8.9%', iconBg: 'bg-[#FFF6EE]', iconColor: 'text-[#D66C2D]' },
  ],
  week: [
    { title: 'Total Sales', value: '₹1,28,450', percentage: '18.6%', iconBg: 'bg-[#FDF0F4]', iconColor: 'text-[#D84B77]' },
    { title: "Today's Sales", value: '₹28,600', percentage: '9.3%', iconBg: 'bg-[#FFF0F4]', iconColor: 'text-[#E0537A]' },
    { title: 'Orders', value: '542', percentage: '12.4%', iconBg: 'bg-[#F6EFF4]', iconColor: 'text-[#A1477A]' },
    { title: 'Avg. Order Value', value: '₹2,371', percentage: '8.2%', iconBg: 'bg-[#FFF1F3]', iconColor: 'text-[#E5536D]' },
    { title: 'Units Sold', value: '1,248', percentage: '15.3%', iconBg: 'bg-[#FFF6EE]', iconColor: 'text-[#D66C2D]' },
  ],
  month: [
    { title: 'Total Sales', value: '₹3,97,800', percentage: '14.2%', iconBg: 'bg-[#FDF0F4]', iconColor: 'text-[#D84B77]' },
    { title: "Today's Sales", value: '₹41,200', percentage: '6.3%', iconBg: 'bg-[#FFF0F4]', iconColor: 'text-[#E0537A]' },
    { title: 'Orders', value: '1,864', percentage: '10.1%', iconBg: 'bg-[#F6EFF4]', iconColor: 'text-[#A1477A]' },
    { title: 'Avg. Order Value', value: '₹2,134', percentage: '4.8%', iconBg: 'bg-[#FFF1F3]', iconColor: 'text-[#E5536D]' },
    { title: 'Units Sold', value: '4,286', percentage: '11.7%', iconBg: 'bg-[#FFF6EE]', iconColor: 'text-[#D66C2D]' },
  ],
  year: [
    { title: 'Total Sales', value: '₹53,00,000', percentage: '21.4%', iconBg: 'bg-[#FDF0F4]', iconColor: 'text-[#D84B77]' },
    { title: "Today's Sales", value: '₹57,400', percentage: '3.7%', iconBg: 'bg-[#FFF0F4]', iconColor: 'text-[#E0537A]' },
    { title: 'Orders', value: '24,860', percentage: '17.3%', iconBg: 'bg-[#F6EFF4]', iconColor: 'text-[#A1477A]' },
    { title: 'Avg. Order Value', value: '₹2,132', percentage: '3.9%', iconBg: 'bg-[#FFF1F3]', iconColor: 'text-[#E5536D]' },
    { title: 'Units Sold', value: '58,920', percentage: '19.1%', iconBg: 'bg-[#FFF6EE]', iconColor: 'text-[#D66C2D]' },
  ],
};

const channelDataByPeriod: Record<TimePeriod, ChannelItem[]> = {
  today: [
    { name: 'T-Shirt Bras', value: 31240, percentage: '54%', color: '#5C0632' },
    { name: 'Push-Up Bras', value: 14350, percentage: '25%', color: '#E0537A' },
    { name: 'Non-Padded Bras', value: 6400, percentage: '11%', color: '#FBB3CB' },
    { name: 'Panty', value: 3900, percentage: '7%', color: '#AC88CD' },
    { name: 'Shapewear', value: 1510, percentage: '3%', color: '#F7C844' },
  ],
  week: [
    { name: 'T-Shirt Bras', value: 69283, percentage: '54%', color: '#5C0632' },
    { name: 'Push-Up Bras', value: 30742, percentage: '24%', color: '#E0537A' },
    { name: 'Non-Padded Bras', value: 15385, percentage: '12%', color: '#FBB3CB' },
    { name: 'Panty', value: 10240, percentage: '8%', color: '#AC88CD' },
    { name: 'Shapewear', value: 2800, percentage: '2%', color: '#F7C844' },
  ],
  month: [
    { name: 'T-Shirt Bras', value: 212000, percentage: '53%', color: '#5C0632' },
    { name: 'Push-Up Bras', value: 97300, percentage: '24%', color: '#E0537A' },
    { name: 'Non-Padded Bras', value: 47600, percentage: '12%', color: '#FBB3CB' },
    { name: 'Panty', value: 29200, percentage: '7%', color: '#AC88CD' },
    { name: 'Shapewear', value: 11700, percentage: '4%', color: '#F7C844' },
  ],
  year: [
    { name: 'T-Shirt Bras', value: 2860000, percentage: '54%', color: '#5C0632' },
    { name: 'Push-Up Bras', value: 1325000, percentage: '25%', color: '#E0537A' },
    { name: 'Non-Padded Bras', value: 582000, percentage: '11%', color: '#FBB3CB' },
    { name: 'Panty', value: 371000, percentage: '7%', color: '#AC88CD' },
    { name: 'Shapewear', value: 162000, percentage: '3%', color: '#F7C844' },
  ],
};

export default function Dashboard() {
  const [startDate, setStartDate] = useState(new Date(2026, 4, 4));
  const [endDate, setEndDate] = useState(new Date(2026, 4, 10));
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');

  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${startDate.toLocaleDateString('en-US', options)} – ${endDate.toLocaleDateString('en-US', options)}`;
  };

  const activeMetrics = metricsByPeriod[timePeriod];
  const activeChannels = channelDataByPeriod[timePeriod];
  const channelTotal = activeChannels.reduce((sum, item) => sum + item.value, 0);
  const reportPreview = {
    period: `${timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)} • ${formatDateRange()}`,
    metrics: activeMetrics,
    channels: activeChannels,
  };

  const handleExportReport = () => {
    const csvContent = [
      ['Sales Analytics Report'],
      ['Period', formatDateRange()],
      ['Time Frame', timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)],
      [''],
      ['Metrics'],
      ...activeMetrics.map((metric) => [metric.title, metric.value, metric.percentage]),
      [''],
      ['Sales by Category'],
      ...activeChannels.map((channel) => [channel.name, `₹${channel.value.toLocaleString()}`, channel.percentage]),
      [''],
      ['Generated on', new Date().toLocaleString()]
    ].map(row => row.join(',')).join('\n');
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    element.setAttribute('download', `sales_report_${new Date().getTime()}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
          onExport={handleExportReport}
          reportPreview={reportPreview}
        />
        <MetricCardsGroup timePeriod={timePeriod} onTimePeriodChange={setTimePeriod} metrics={activeMetrics} />
        
        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="lg:col-span-2">
            <SalesOverviewChart timePeriod={timePeriod} />
          </div>
          <div>
            <SalesByChannelChart timePeriod={timePeriod} data={activeChannels} totalLabel={`₹${channelTotal.toLocaleString()}`} />
          </div>
        </div>

        {/* Bottom Data Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <TopSellingProducts />
          <SalesTrendChart />
          <RecentOrders />
        </div>


      </div>
  );
}
