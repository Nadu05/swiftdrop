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
 * Payouts from delivered jobs. Failed jobs earn nothing.
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <PageHeader
        title="Payout Earnings"
        subtitle="Payouts for delivered jobs. Failed or cancelled jobs are not eligible for payout."
      />

      <section className="dispatcher-stats-grid" aria-label="Earnings metrics">
        <StatCard
          label="Today's Earnings"
          value={formatLkr(sum(today))}
          hint={`${today.length} job(s) delivered today`}
          icon={<Wallet size={18} />}
          iconBg="#eff6ff"
          iconColor="#2563eb"
        />
        <StatCard
          label="Last 7 Days"
          value={formatLkr(sum(week))}
          hint={`${week.length} deliveries in the last 7 days`}
          icon={<CalendarDays size={18} />}
          iconBg="#f0fdf4"
          iconColor="#16a34a"
        />
        <StatCard
          label="Total Paid Deliveries"
          value={delivered.length}
          hint="All completed jobs with verified delivery"
          icon={<CheckCircle2 size={18} />}
          iconBg="#fffbeb"
          iconColor="#d97706"
        />
        <StatCard
          label="Average Payout / Job"
          value={formatLkr(average)}
          hint="Per successful delivery completion"
          icon={<TrendingUp size={18} />}
          iconBg="#f5f3ff"
          iconColor="#7c3aed"
        />
      </section>

      <section className="dispatcher-table-card" aria-label="Payout breakdown table">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Payout Breakdown ({delivered.length})
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.2rem 0 0' }}>
              Itemized history of delivered orders and earnings credited.
            </p>
          </div>
        </div>

        {delivered.length === 0 ? (
          <div style={{ padding: '2rem' }}>
            <EmptyState text="No completed paid jobs yet." />
          </div>
        ) : (
          <div className="dispatcher-table-wrapper">
            <table className="dispatcher-table">
              <thead>
                <tr>
                  <th>Tracking Number</th>
                  <th>Route &amp; Distance</th>
                  <th>Completion Timestamp</th>
                  <th style={{ textAlign: 'right' }}>Payout Earned</th>
                </tr>
              </thead>
              <tbody>
                {delivered.map((job) => (
                  <tr key={job.assignmentId}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{job.trackingNumber}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#334155' }}>
                        {job.merchantName} → {job.recipient.city}
                      </div>
                      {job.distanceKm ? (
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Distance: {job.distanceKm} km
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', color: '#475569' }}>
                        {formatDateTime(job.completedAt)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#059669' }}>
                        {formatLkr(job.payoutLkr)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
