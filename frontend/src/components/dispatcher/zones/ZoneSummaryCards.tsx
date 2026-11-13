'use client';

import React from 'react';
import { MapPin, Layers, CheckCircle2, Clock } from 'lucide-react';
import StatsCard from '@/components/dispatcher/overview/StatsCard';
import type { ZoneSummaryMetrics } from './types';

interface ZoneSummaryCardsProps {
  metrics: ZoneSummaryMetrics;
  isLoading?: boolean;
}

export default function ZoneSummaryCards({
  metrics,
  isLoading = false,
}: ZoneSummaryCardsProps) {
  return (
    <section className="dispatcher-stats-grid" aria-label="Zones and Pricing Metrics">
      {/* 1. Active Zones */}
      <StatsCard
        title="Active Zones"
        value={isLoading ? '...' : `${metrics.activeZones} / ${metrics.totalZones}`}
        description="Covered service territories"
        icon={MapPin}
        iconColor="#0284c7"
        iconBg="#f0f9ff"
        trend={{
          value: `${Math.round((metrics.activeZones / Math.max(1, metrics.totalZones)) * 100)}%`,
          isPositive: true,
          label: 'operational rate',
        }}
      />

      {/* 2. Total Pricing Rules */}
      <StatsCard
        title="Total Pricing Rules"
        value={isLoading ? '...' : metrics.totalPricingRules.toString()}
        description="Configured tariff schedules"
        icon={Layers}
        iconColor="#2563eb"
        iconBg="#eff6ff"
        trend={{
          value: 'All Tiers',
          isPositive: true,
          label: 'metro & regional',
        }}
      />

      {/* 3. Published Rules */}
      <StatsCard
        title="Published Rules"
        value={isLoading ? '...' : metrics.publishedRules.toString()}
        description="Live customer tariffs"
        icon={CheckCircle2}
        iconColor="#0d9488"
        iconBg="#f0fdfa"
        trend={{
          value: 'Active',
          isPositive: true,
          label: 'in production',
        }}
      />

      {/* 4. Pending Changes */}
      <StatsCard
        title="Pending Changes"
        value={isLoading ? '...' : metrics.pendingChanges.toString()}
        description="Draft rules awaiting review"
        icon={Clock}
        iconColor="#d97706"
        iconBg="#fffbeb"
        trend={{
          value: metrics.pendingChanges > 0 ? `${metrics.pendingChanges} drafts` : 'Up to date',
          isPositive: metrics.pendingChanges === 0,
          label: metrics.pendingChanges > 0 ? 'review needed' : 'clean state',
        }}
      />
    </section>
  );
}

