'use client';

import { useState } from 'react';
import OverviewHeader from '@/components/dispatcher/overview/OverviewHeader';
import StatsCard from '@/components/dispatcher/overview/StatsCard';
import DeliveryActivityChart from '@/components/dispatcher/overview/DeliveryActivityChart';
import DeliveryStatusChart from '@/components/dispatcher/overview/DeliveryStatusChart';
import CourierWorkload from '@/components/dispatcher/overview/CourierWorkload';
import { initialStatsData } from '@/components/dispatcher/overview/mockData';

export default function DispatcherDashboardPage() {
  const [stats] = useState(initialStatsData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate data refresh
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <div className="dispatcher-overview">
      {/* 1. Header with Title & Date / Refresh Action */}
      <OverviewHeader onRefresh={handleRefresh} isRefreshing={isRefreshing} />

      {/* 2. Key Performance Statistics (4 KPI Cards) */}
      <section className="dispatcher-stats-grid" aria-label="Key delivery metrics">
        {stats.map((stat) => (
          <StatsCard
            key={stat.id}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            icon={stat.icon}
            iconColor={stat.iconColor}
            iconBg={stat.iconBg}
            trend={stat.trend}
          />
        ))}
      </section>

      {/* 3. Delivery Activity (Bar) & Status Breakdown (Donut) Charts */}
      <section className="dispatcher-charts-grid" aria-label="Delivery activity and status charts">
        <DeliveryActivityChart />
        <DeliveryStatusChart />
      </section>

      {/* 4. Courier Workload Monitoring */}
      <CourierWorkload />
    </div>
  );
}
