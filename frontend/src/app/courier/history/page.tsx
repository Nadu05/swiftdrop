'use client';

import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  AttemptHistory,
  EmptyState,
  ErrorState,
  Field,
  JobStatusBadge,
  LoadingState,
  PageHeader,
  PodSummary,
  TaskTypeBadge,
  formatDateTime,
  formatLkr,
} from '@/components/courier/CourierUI';
import { useCourierData } from '@/hooks/api/use-courier';

type Filter = 'ALL' | 'DELIVERED' | 'FAILED';

/**
 * Job History (/courier/history): finished tasks with proof of delivery, failure reasons and
 * attempt history: the same records the dispatcher sees.
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
    <div className="cp-page">
      <PageHeader
        title="Job History"
        subtitle="Finished tasks with proof of delivery or failure details"
        action={
          <label>
            <span className="cp-sr-only">Filter by status</span>
            <select className="cp-input" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
              <option value="ALL">All finished</option>
              <option value="DELIVERED">Delivered</option>
              <option value="FAILED">Failed</option>
            </select>
          </label>
        }
      />

      {finished.length === 0 ? (
        <EmptyState text="No finished tasks yet." />
      ) : (
        <div className="cp-card cp-card--flush cp-table-wrap">
          <table className="cp-table">
            <thead>
              <tr>
                <th aria-label="Details" />
                <th>Tracking</th>
                <th>Type</th>
                <th>Recipient</th>
                <th>Finished</th>
                <th>Status</th>
                <th className="cp-table__right">Payout</th>
              </tr>
            </thead>
            <tbody>
              {finished.map((job) => {
                const open = openId === job.assignmentId;
                const toggle = () => setOpenId(open ? null : job.assignmentId);
                return (
                  <Fragment key={job.assignmentId}>
                    <tr className="is-clickable" onClick={toggle}>
                      <td>
                        <button
                          type="button"
                          className="cp-icon-btn"
                          aria-expanded={open}
                          aria-label={`${open ? 'Hide' : 'Show'} details for ${job.trackingNumber}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle();
                          }}
                        >
                          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td className="cp-table__strong">{job.trackingNumber}</td>
                      <td>
                        <TaskTypeBadge taskType={job.taskType} />
                      </td>
                      <td>
                        {job.recipient.name} · {job.recipient.city}
                      </td>
                      <td>{formatDateTime(job.completedAt)}</td>
                      <td>
                        <JobStatusBadge status={job.status} />
                      </td>
                      <td className="cp-table__right">{job.status === 'DELIVERED' ? formatLkr(job.payoutLkr) : 'No payout'}</td>
                    </tr>
                    {open && (
                      <tr className="cp-table__detail">
                        <td />
                        <td colSpan={6}>
                          <div className="cp-stack">
                            <div className="cp-grid-auto">
                              <Field label="Pickup">{job.merchantName}</Field>
                              <Field label="Delivery address">{job.recipient.address}</Field>
                              <Field label="Parcel">
                                {job.parcel.category} · {job.parcel.weightKg} kg
                              </Field>
                              {job.proofOfDelivery && (
                                <Field label="Proof of delivery">
                                  <PodSummary pod={job.proofOfDelivery} />
                                </Field>
                              )}
                              {job.failure && (
                                <Field label="Failure reason">
                                  {job.failure.reason}
                                  {job.failure.notes ? <span className="cp-muted"> · {job.failure.notes}</span> : null}
                                </Field>
                              )}
                            </div>
                            <AttemptHistory job={job} />
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
