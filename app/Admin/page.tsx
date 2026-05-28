
'use client';
import React from 'react';
import Sidebar from './Analytics/Sidebar';
import Header from './Analytics/Header';
import MetricCardsGroup from './Analytics/MetricCardsGroup';
import SalesOverviewChart from './Analytics/SalesOverviewChart';
import SalesByChannelChart from './Analytics/SalesByChannelChart';
import TopSellingProducts from './Analytics/TopSellingProducts';
import SalesTrendChart from './Analytics/SalesTrendChart';
import RecentOrders from './Analytics/RecentOrders';

export default function Dashboard() {
  return (
    <div className="flex min-h-screen bg-[#F7F4F0] text-[#2B1B24] font-sans antialiased">
      <Sidebar />
      
      <main className="flex-1 p-8 space-y-6 overflow-y-auto max-w-[1600px] mx-auto w-full">
        <Header />
        <MetricCardsGroup />
        
        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SalesOverviewChart />
          </div>
          <div>
            <SalesByChannelChart />
          </div>
        </div>

        {/* Bottom Data Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <TopSellingProducts />
          <SalesTrendChart />
          <RecentOrders />
        </div>
      </main>
    </div>
  );
}