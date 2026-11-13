'use client';

import { CalendarDays, CheckCircle2, TrendingUp, Wallet } from 'lucide-react';
import { useCourierJobs } from '@/hooks/api/use-courier';
import { EmptyState, ErrorState, LoadingState, PageHeader, SectionHeader, StatCard, errorMessage } from '../CourierUI';
import { byCompletedDesc, formatDateTime, formatLkr, isToday, sumPayout } from '../courierUtils';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Payouts from delivered jobs (failed jobs earn nothing). Calculated from the
 * courier's job list until dispatch-service exposes a payouts endpoint.
 */
export default function Earnings() {
  const jobsQuery = useCourierJobs();

  if (jobsQuery.isPending) return <LoadingState text="Loading your earnings…" />;
  if (jobsQuery.isError) return <ErrorState message={errorMessage(jobsQuery.error, 'Could not load your earnings.')} onRetry={() => jobsQuery.refetch()} />;

  const delivered = jobsQuery.data.filter((job) => job.status === 'DELIVERED').sort(byCompletedDesc);
  const weekStart = Date.now() - WEEK_MS;
  const today = delivered.filter((job) => isToday(job.completedAt));
  const week = delivered.filter((job) => job.completedAt && new Date(job.completedAt).getTime() >= weekStart);
  const average = delivered.length ? Math.round(sumPayout(delivered) / delivered.length) : 0;

  return (
    <div className="courier-page">
      <PageHeader title="Earnings" subtitle="Payouts for delivered jobs. Failed or cancelled jobs are not paid." />

      <section className="grid-cols-4" aria-label="Earnings summary">
        <StatCard label="Today" value={formatLkr(sumPayout(today))} hint={`${today.length} delivered`} icon={Wallet} tone="primary" />
        <StatCard label="Last 7 days" value={formatLkr(sumPayout(week))} hint={`${week.length} delivered`} icon={CalendarDays} tone="success" />
        <StatCard label="Paid jobs" value={delivered.length} hint="All time" icon={CheckCircle2} tone="warning" />
        <StatCard label="Average per job" value={formatLkr(average)} hint="Delivered jobs" icon={TrendingUp} tone="purple" />
      </section>

      <section className="courier-section" aria-labelledby="courier-payouts">
        <SectionHeader id="courier-payouts" title="Payout breakdown" subtitle="Most recent first" />
        {delivered.length === 0 ? (
          <EmptyState text="No paid jobs yet." />
        ) : (
          <ul className="glass-card courier-list">
            {delivered.map((job) => (
              <li key={job.assignmentId} className="courier-list__row">
                <span className="courier-list__id">{job.trackingNumber}</span>
                <span className="courier-list__meta">
                  {job.merchantName} → {job.recipient.city} · {job.distanceKm} km
                </span>
                <span className="courier-hint">{formatDateTime(job.completedAt)}</span>
                <span className="courier-list__amount courier-list__amount--paid">{formatLkr(job.payoutLkr)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
