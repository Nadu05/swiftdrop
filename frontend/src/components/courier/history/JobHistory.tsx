'use client';

import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useCourierJobs } from '@/hooks/api/use-courier';
import { EmptyState, ErrorState, Field, JobStatusBadge, LoadingState, PageHeader, errorMessage } from '../CourierUI';
import { byCompletedDesc, formatDateTime, formatLkr, isFinishedJob } from '../courierUtils';

type Filter = 'ALL' | 'DELIVERED' | 'FAILED';

/** Finished jobs with proof of delivery or the failure reason (same records as dispatcher Delivery History). */
export default function JobHistory() {
  const jobsQuery = useCourierJobs();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [openId, setOpenId] = useState<string | null>(null);

  if (jobsQuery.isPending) return <LoadingState text="Loading your job history…" />;
  if (jobsQuery.isError) return <ErrorState message={errorMessage(jobsQuery.error, 'Could not load your job history.')} onRetry={() => jobsQuery.refetch()} />;

  const finished = jobsQuery.data
    .filter(isFinishedJob)
    .filter((job) => filter === 'ALL' || job.status === filter)
    .sort(byCompletedDesc);

  return (
    <div className="courier-page courier-page--compact">
      <PageHeader
        title="Job History"
        subtitle="Your finished deliveries with proof of delivery or failure details"
        action={
          <select className="input-field" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Filter by status">
            <option value="ALL">All finished</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
          </select>
        }
      />

      {finished.length === 0 ? (
        <EmptyState text="No finished jobs yet." />
      ) : (
        <div className="glass-card courier-table-wrap">
          <table className="courier-table">
            <thead>
              <tr>
                <th scope="col">
                  <span className="courier-sr-only">Details</span>
                </th>
                <th scope="col">Tracking</th>
                <th scope="col">Recipient</th>
                <th scope="col">Finished</th>
                <th scope="col">Status</th>
                <th scope="col" className="courier-table__num">
                  Payout
                </th>
              </tr>
            </thead>
            <tbody>
              {finished.map((job) => {
                const open = openId === job.assignmentId;
                const toggle = () => setOpenId(open ? null : job.assignmentId);
                return (
                  <Fragment key={job.assignmentId}>
                    <tr>
                      <td>
                        <button
                          type="button"
                          className="courier-icon-btn"
                          onClick={toggle}
                          aria-expanded={open}
                          aria-controls={`job-details-${job.assignmentId}`}
                          aria-label={`${open ? 'Hide' : 'Show'} details for ${job.trackingNumber}`}
                        >
                          {open ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                        </button>
                      </td>
                      <td className="courier-table__strong">{job.trackingNumber}</td>
                      <td>
                        {job.recipient.name} · {job.recipient.city}
                      </td>
                      <td>{formatDateTime(job.completedAt)}</td>
                      <td>
                        <JobStatusBadge status={job.status} />
                      </td>
                      <td className="courier-table__num">{job.status === 'DELIVERED' ? formatLkr(job.payoutLkr) : 'No payout'}</td>
                    </tr>
                    {open && (
                      <tr id={`job-details-${job.assignmentId}`} className="courier-table__details">
                        <td />
                        <td colSpan={5}>
                          <div className="grid-cols-4">
                            <Field label="Merchant">{job.merchantName}</Field>
                            <Field label="Address">{job.recipient.address}</Field>
                            <Field label="Parcel">
                              {job.parcel.category} · {job.parcel.weightKg} kg
                            </Field>
                            {job.proofOfDelivery && (
                              <Field label="Proof of delivery">
                                {job.proofOfDelivery.type} · {job.proofOfDelivery.reference}
                                <small>Received by {job.proofOfDelivery.receivedBy}</small>
                              </Field>
                            )}
                            {job.failure && (
                              <Field label="Failure reason">
                                {job.failure.reason}
                                <small>{job.failure.notes}</small>
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
