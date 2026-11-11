'use client';

import { CalendarDays, CheckCircle2, TrendingUp, Wallet } from 'lucide-react';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatCard,
  formatDateTime,
  formatLkr,
} from '@/components/courier/CourierUI';
import { isToday, useCourierData } from '@/hooks/api/use-courier';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Member 08: Earnings
 * Route: /courier/earnings
 *
 * Payouts from delivered jobs. Failed jobs earn nothing. Calculated from the
 * courier's job list until dispatch-service exposes a payouts endpoint.
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <PageHeader title="Earnings" subtitle="Payouts for delivered jobs. Failed or cancelled jobs are not paid." />

      <div className="grid-cols-4">
        <StatCard label="Today" value={formatLkr(sum(today))} hint={`${today.length} delivered`} icon={<Wallet size={18} color="#3b82f6" />} />
        <StatCard label="Last 7 days" value={formatLkr(sum(week))} hint={`${week.length} delivered`} icon={<CalendarDays size={18} color="#10b981" />} />
        <StatCard label="Paid jobs" value={delivered.length} hint="All time" icon={<CheckCircle2 size={18} color="#f59e0b" />} />
        <StatCard label="Average per job" value={formatLkr(average)} hint="Delivered jobs" icon={<TrendingUp size={18} color="#8b5cf6" />} />
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>Payout breakdown</h2>
        {delivered.length === 0 ? (
          <EmptyState text="No paid jobs yet." />
        ) : (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {delivered.map((job, i) => (
              <div
                key={job.assignmentId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.9rem 1.5rem',
                  borderTop: i === 0 ? 'none' : '1px solid rgba(59, 130, 246, 0.1)',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ color: '#ffffff', fontWeight: 600, minWidth: '90px' }}>{job.trackingNumber}</span>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem', flex: 1 }}>
                  {job.merchantName} → {job.recipient.city} · {job.distanceKm} km
                </span>
                <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{formatDateTime(job.completedAt)}</span>
                <span style={{ color: '#34d399', fontWeight: 700, minWidth: '90px', textAlign: 'right' }}>{formatLkr(job.payoutLkr)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
