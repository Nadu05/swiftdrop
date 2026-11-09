'use client';

import { useState } from 'react';
import OverviewHeader from '@/components/dispatcher/overview/OverviewHeader';
import StatsCard from '@/components/dispatcher/overview/StatsCard';
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
      <OverviewHeader onRefresh={handleRefresh} isRefreshing={isRefreshing} />

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
    </div>
  );
}
