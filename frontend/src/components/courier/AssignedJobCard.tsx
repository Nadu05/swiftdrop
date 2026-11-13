'use client';

import Link from 'next/link';
import { ArrowRight, MapPin, Store } from 'lucide-react';
import { useAcceptJob } from '@/hooks/api/use-courier';
import type { CourierJob } from '@/types/courier.types';
import { Field, JobStatusBadge, PriorityTag, errorMessage } from './CourierUI';
import { formatLkr, formatTime } from './courierUtils';

/**
 * One job assigned by the branch. Shows Accept while ASSIGNED and a link to the
 * Active Delivery screen once accepted / in transit.
 */
export default function AssignedJobCard({ job, canAccept }: { job: CourierJob; canAccept: boolean }) {
  const accept = useAcceptJob();

  return (
    <article className="glass-card courier-stack" aria-label={`Job ${job.trackingNumber}`}>
      <div className="courier-row courier-row--between">
        <div className="courier-row">
          <span className="courier-job__id">{job.trackingNumber}</span>
          <PriorityTag priority={job.priority} />
        </div>
        <JobStatusBadge status={job.status} />
      </div>

      <div className="grid-cols-2">
        <div className="courier-job__stop">
          <Store size={18} className="courier-icon--primary" aria-hidden="true" />
          <Field label="Pickup">
            {job.merchantName}
            <small>{job.pickupAddress}</small>
          </Field>
        </div>
        <div className="courier-job__stop">
          <MapPin size={18} className="courier-icon--success" aria-hidden="true" />
          <Field label="Drop-off">
            {job.recipient.name}
            <small>
              {job.recipient.address}, {job.recipient.city}
            </small>
          </Field>
        </div>
      </div>

      <div className="courier-job__footer">
        <span className="courier-job__meta">
          {job.parcel.category} · {job.parcel.weightKg} kg · {job.distanceKm} km ·{' '}
          <span className="courier-payout">{formatLkr(job.payoutLkr)} payout</span> · assigned {formatTime(job.assignedAt)}
        </span>

        {job.status === 'ASSIGNED' ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => accept.mutate(job.assignmentId)}
            disabled={!canAccept || accept.isPending}
            title={canAccept ? undefined : 'Go online to accept jobs'}
          >
            {accept.isPending ? 'Accepting…' : 'Accept job'}
          </button>
        ) : (
          <Link href={`/courier/active?job=${job.assignmentId}`} className="btn btn-secondary">
            Open delivery <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
      </div>

      {accept.isError && (
        <p className="courier-alert" role="alert">
          {errorMessage(accept.error, 'Could not accept this job.')}
        </p>
      )}
    </article>
  );
}
