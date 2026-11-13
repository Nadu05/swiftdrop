'use client';

import React from 'react';
import { Package, Clock, Users, CheckCircle2 } from 'lucide-react';
import StatsCard from '@/components/dispatcher/overview/StatsCard';
import type { ReportSummaryMetrics } from './types';

interface ReportSummaryCardsProps {
  metrics: ReportSummaryMetrics;
  isLoading?: boolean;
}

export default function ReportSummaryCards({
  metrics,
  isLoading = false,
}: ReportSummaryCardsProps) {
  return (
    <section className="dispatcher-stats-grid" aria-label="Reports Performance Metrics">
      {/* 1. Total Deliveries */}
      <StatsCard
        title="Total Deliveries"
        value={isLoading ? '...' : metrics.totalDeliveries.toLocaleString()}
        description="Scheduled & dispatched orders"
        icon={Package}
        iconColor="#2563eb"
        iconBg="#eff6ff"
        trend={metrics.totalDeliveriesTrend}
      />

      {/* 2. On-time Delivery Rate */}
      <StatsCard
        title="On-time Delivery Rate"
        value={isLoading ? '...' : `${metrics.onTimeRate}%`}
        description="SLA committed arrivals"
        icon={Clock}
        iconColor="#0284c7"
        iconBg="#f0f9ff"
        trend={metrics.onTimeRateTrend}
      />

      {/* 3. Active Merchants */}
      <StatsCard
        title="Active Merchants"
        value={isLoading ? '...' : metrics.activeMerchants.toLocaleString()}
        description="Trading business clients"
        icon={Users}
        iconColor="#d97706"
        iconBg="#fffbeb"
        trend={metrics.activeMerchantsTrend}
      />

      {/* 4. Courier Completion Rate */}
      <StatsCard
        title="Courier Completion Rate"
        value={isLoading ? '...' : `${metrics.courierCompletionRate}%`}
        description="Assigned runs completed"
        icon={CheckCircle2}
        iconColor="#0d9488"
        iconBg="#f0fdfa"
        trend={metrics.courierCompletionRateTrend}
      />
    </section>
  );
}

