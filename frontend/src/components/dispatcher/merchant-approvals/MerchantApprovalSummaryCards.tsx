'use client';

import React from 'react';
import { Clock, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import StatsCard from '@/components/dispatcher/overview/StatsCard';
import type { MerchantApprovalSummaryMetrics } from './types';

interface MerchantApprovalSummaryCardsProps {
  metrics: MerchantApprovalSummaryMetrics;
  isLoading?: boolean;
}

export default function MerchantApprovalSummaryCards({
  metrics,
  isLoading = false,
}: MerchantApprovalSummaryCardsProps) {
  return (
    <section className="dispatcher-stats-grid" aria-label="Merchant Approval Queue Metrics">
      {/* 1. Pending Review */}
      <StatsCard
        title="Pending Review"
        value={isLoading ? '...' : metrics.pendingReview.toString()}
        description="Awaiting initial verification"
        icon={Clock}
        iconColor="#2563eb"
        iconBg="#eff6ff"
        trend={{
          value: metrics.pendingReview > 0 ? `${metrics.pendingReview} queued` : 'Queue clear',
          isPositive: metrics.pendingReview === 0,
          label: 'requires action',
        }}
      />

      {/* 2. Awaiting Merchant */}
      <StatsCard
        title="Awaiting Merchant"
        value={isLoading ? '...' : metrics.awaitingMerchant.toString()}
        description="Corrections requested from applicant"
        icon={AlertCircle}
        iconColor="#d97706"
        iconBg="#fffbeb"
        trend={{
          value: `${metrics.awaitingMerchant} pending`,
          isPositive: false,
          label: 're-submission expected',
        }}
      />

      {/* 3. Approved This Month */}
      <StatsCard
        title="Approved This Month"
        value={isLoading ? '...' : metrics.approvedThisMonth.toString()}
        description="Onboarded partner businesses"
        icon={CheckCircle2}
        iconColor="#0d9488"
        iconBg="#f0fdfa"
        trend={{
          value: '+100% SLA',
          isPositive: true,
          label: 'onboarding healthy',
        }}
      />

      {/* 4. Rejected This Month */}
      <StatsCard
        title="Rejected This Month"
        value={isLoading ? '...' : metrics.rejectedThisMonth.toString()}
        description="Ineligible or fraudulent submissions"
        icon={XCircle}
        iconColor="#ef4444"
        iconBg="#fef2f2"
        trend={{
          value: `${metrics.rejectedThisMonth} flagged`,
          isPositive: false,
          label: 'compliance rejected',
        }}
      />
    </section>
  );
}

