'use client';

import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  EmptyState,
  ErrorState,
  Field,
  JobStatusBadge,
  LoadingState,
  PageHeader,
  formatDateTime,
  formatLkr,
} from '@/components/courier/CourierUI';
import { useCourierData } from '@/hooks/api/use-courier';

type Filter = 'ALL' | 'DELIVERED' | 'FAILED';

/**
 * Member 08: Job History
 * Route: /courier/history
 *
 * Finished jobs with proof of delivery or the failure reason - the same
 * records the dispatcher sees on Delivery History.
 */
export default function JobHistoryPage() {
  const { profile, jobs, loading, error, reload } = useCourierData();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [openId, setOpenId] = useState<string | null>(null);

  if (loading && !profile) return <LoadingState text="Loading your job history…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const finished = jobs
    .filter((j) => j.status === 'DELIVERED' || j.status === 'FAILED')
    .filter((j) => filter === 'ALL' || j.status === filter)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title="Job History"
        subtitle="Your finished deliveries with proof of delivery or failure details"
        action={
          <select className="input-field" style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Filter by status">
            <option value="ALL">All finished</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
          </select>
        }
      />

      {finished.length === 0 ? (
        <EmptyState text="No finished jobs yet." />
      ) : (
        <div className="glass-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '720px', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={th} />
                <th style={th}>Tracking</th>
                <th style={th}>Recipient</th>
                <th style={th}>Finished</th>
                <th style={th}>Status</th>
                <th style={{ ...th, textAlign: 'right' }}>Payout</th>
              </tr>
            </thead>
            <tbody>
              {finished.map((job) => {
                const open = openId === job.assignmentId;
                return (
                  <Fragment key={job.assignmentId}>
                    <tr style={{ borderTop: '1px solid rgba(59, 130, 246, 0.1)', cursor: 'pointer' }} onClick={() => setOpenId(open ? null : job.assignmentId)}>
                      <td style={td}>
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-label={`${open ? 'Hide' : 'Show'} details for ${job.trackingNumber}`}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
                        >
                          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td style={{ ...td, color: '#ffffff', fontWeight: 600 }}>{job.trackingNumber}</td>
                      <td style={td}>
                        {job.recipient.name} · {job.recipient.city}
                      </td>
                      <td style={td}>{formatDateTime(job.completedAt)}</td>
                      <td style={td}>
                        <JobStatusBadge status={job.status} />
                      </td>
                      <td style={{ ...td, textAlign: 'right', color: '#e2e8f0' }}>{job.status === 'DELIVERED' ? formatLkr(job.payoutLkr) : 'No payout'}</td>
                    </tr>
                    {open && (
                      <tr>
                        <td />
                        <td colSpan={5} style={{ padding: '0 1rem 1.25rem' }}>
                          <div className="grid-cols-4" style={{ gap: '1rem' }}>
                            <Field label="Merchant">{job.merchantName}</Field>
                            <Field label="Address">{job.recipient.address}</Field>
                            <Field label="Parcel">
                              {job.parcel.category} · {job.parcel.weightKg} kg
                            </Field>
                            {job.proofOfDelivery && (
                              <Field label="Proof of delivery">
                                {job.proofOfDelivery.type} · {job.proofOfDelivery.reference} · received by {job.proofOfDelivery.receivedBy}
                              </Field>
                            )}
                            {job.failure && (
                              <Field label="Failure reason">
                                {job.failure.reason}
                                <br />
                                <span style={{ color: '#94a3b8' }}>{job.failure.notes}</span>
                              </Field>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: '0.85rem 1rem', fontWeight: 600 };
const td: React.CSSProperties = { padding: '0.85rem 1rem', color: '#94a3b8' };
