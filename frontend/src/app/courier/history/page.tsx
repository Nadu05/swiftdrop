'use client';

import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight, History } from 'lucide-react';
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
 * Finished jobs with proof of delivery or failure reasons.
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <PageHeader
        title="Delivery Job History"
        subtitle="Historical finished deliveries with proof of delivery and exception details"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>Filter:</span>
            <select
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid var(--ds-border, #e2e8f0)',
                background: 'var(--ds-surface, #ffffff)',
                color: '#0f172a',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
              aria-label="Filter by status"
            >
              <option value="ALL">All finished ({jobs.filter((j) => j.status === 'DELIVERED' || j.status === 'FAILED').length})</option>
              <option value="DELIVERED">Delivered only ({jobs.filter((j) => j.status === 'DELIVERED').length})</option>
              <option value="FAILED">Failed only ({jobs.filter((j) => j.status === 'FAILED').length})</option>
            </select>
          </div>
        }
      />

      <section className="dispatcher-table-card" aria-label="Job history table">
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
              Completed Shipments ({finished.length})
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.2rem 0 0' }}>
              Click any row to view expanded parcel details and proof of delivery.
            </p>
          </div>
        </div>

        {finished.length === 0 ? (
          <div style={{ padding: '2rem' }}>
            <EmptyState text="No finished jobs matching the selected filter." />
          </div>
        ) : (
          <div className="dispatcher-table-wrapper">
            <table className="dispatcher-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }} />
                  <th>Tracking Number</th>
                  <th>Recipient &amp; Destination</th>
                  <th>Finished Time</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Payout Earned</th>
                </tr>
              </thead>
              <tbody>
                {finished.map((job) => {
                  const open = openId === job.assignmentId;
                  return (
                    <Fragment key={job.assignmentId}>
                      <tr
                        style={{ cursor: 'pointer' }}
                        onClick={() => setOpenId(open ? null : job.assignmentId)}
                      >
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            aria-expanded={open}
                            aria-label={`${open ? 'Hide' : 'Show'} details for ${job.trackingNumber}`}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#64748b',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                            }}
                          >
                            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>
                            {job.trackingNumber}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#334155' }}>
                            {job.recipient.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {job.recipient.city}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8125rem', color: '#475569' }}>
                            {formatDateTime(job.completedAt)}
                          </span>
                        </td>
                        <td>
                          <JobStatusBadge status={job.status} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '0.875rem',
                              color: job.status === 'DELIVERED' ? '#059669' : '#94a3b8',
                            }}
                          >
                            {job.status === 'DELIVERED' ? formatLkr(job.payoutLkr) : 'No payout'}
                          </span>
                        </td>
                      </tr>
                      {open && (
                        <tr>
                          <td />
                          <td colSpan={5} style={{ padding: '0.75rem 1.25rem 1.25rem' }}>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '1rem',
                                padding: '1rem 1.25rem',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                              }}
                            >
                              <Field label="Merchant / Sender">{job.merchantName}</Field>
                              <Field label="Delivery Address">{job.recipient.address}</Field>
                              <Field label="Parcel Category">
                                {job.parcel.category} ({job.parcel.weightKg} kg)
                              </Field>
                              {job.proofOfDelivery && (
                                <Field label="Proof of delivery">
                                  {job.proofOfDelivery.type} · Ref: {job.proofOfDelivery.reference || 'Signed'} (Received by {job.proofOfDelivery.receivedBy || 'Recipient'})
                                </Field>
                              )}
                              {job.failure && (
                                <Field label="Failure reason">
                                  <span style={{ color: '#dc2626', fontWeight: 600 }}>
                                    {job.failure.reason}
                                  </span>
                                  {job.failure.notes && (
                                    <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                                      {job.failure.notes}
                                    </div>
                                  )}
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
      </section>
    </div>
  );
}
