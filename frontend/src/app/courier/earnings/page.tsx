'use client';

import { CalendarDays, CheckCircle2, TrendingUp, Wallet } from 'lucide-react';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionHeader,
  StatCard,
  formatDateTime,
  formatLkr,
} from '@/components/courier/CourierUI';
import { isToday, useCourierData } from '@/hooks/api/use-courier';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Earnings (/courier/earnings): payouts from delivered jobs; failed jobs earn nothing.
 * Calculated from the courier's job list until dispatch-service exposes a payouts endpoint.
 */
export default function EarningsPage() {
  const { profile, jobs, loading, error, reload } = useCourierData();

  if (loading && !profile) return <LoadingState text="Loading your earnings…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const delivered = jobs
    .filter((j) => j.status === 'DELIVERED')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  const weekStart = Date.now() - WEEK_MS;
  const today = delivered.filter((j) => isToday(j.completedAt));
  const week = delivered.filter((j) => j.completedAt && new Date(j.completedAt).getTime() >= weekStart);
  const sum = (list: typeof delivered) => list.reduce((total, j) => total + j.payoutLkr, 0);
  const average = delivered.length ? Math.round(sum(delivered) / delivered.length) : 0;

  return (
    <div className="cp-page">
      <PageHeader title="Earnings" subtitle="Payouts for delivered jobs. Failed or cancelled jobs are not paid." />

      <section className="cp-stats" aria-label="Earnings summary">
        <StatCard label="Today" value={formatLkr(sum(today))} hint={`${today.length} delivered`} icon={<Wallet size={16} />} tone="info" />
        <StatCard label="Last 7 days" value={formatLkr(sum(week))} hint={`${week.length} delivered`} icon={<CalendarDays size={16} />} tone="success" />
        <StatCard label="Paid jobs" value={delivered.length} hint="All time" icon={<CheckCircle2 size={16} />} tone="brand" />
        <StatCard label="Average per job" value={formatLkr(average)} hint="Delivered jobs" icon={<TrendingUp size={16} />} tone="neutral" />
      </section>

      <section className="cp-section" aria-labelledby="cp-payouts">
        <SectionHeader id="cp-payouts" title="Payout breakdown" subtitle="Most recent first" />
        {delivered.length === 0 ? (
          <EmptyState text="No paid jobs yet." />
        ) : (
          <div className="cp-card cp-card--flush">
            {delivered.map((job) => (
              <div key={job.assignmentId} className="cp-list__row">
                <span className="cp-list__id">{job.trackingNumber}</span>
                <span className="cp-list__meta">
                  {job.merchantName} → {job.recipient.city}
                  {job.distanceKm > 0 ? ` · ${job.distanceKm} km` : ''}
                </span>
                <span className="cp-muted cp-small">{formatDateTime(job.completedAt)}</span>
                <span className="cp-list__amount cp-list__amount--paid">{formatLkr(job.payoutLkr)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
