
'use client';
import React from 'react';
import Header from './Analytics/Header';
import MetricCardsGroup from './Analytics/MetricCardsGroup';
import SalesOverviewChart from './Analytics/SalesOverviewChart';
import SalesByChannelChart from './Analytics/SalesByChannelChart';
import TopSellingProducts from './Analytics/TopSellingProducts';
import SalesTrendChart from './Analytics/SalesTrendChart';
import RecentOrders from './Analytics/RecentOrders';

export default function Dashboard() {
  return (
      <div className="space-y-6 lg:space-y-8">
        <Header />
        <MetricCardsGroup />
        
        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="lg:col-span-2">
            <SalesOverviewChart />
          </div>
          <div>
            <SalesByChannelChart />
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