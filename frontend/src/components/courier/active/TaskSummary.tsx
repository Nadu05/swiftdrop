import { Phone } from 'lucide-react';
import type { CourierJob } from '@/types/courier.types';
import {
  AttemptIndicator,
  Field,
  JobStatusBadge,
  PriorityTag,
  TaskTypeBadge,
  formatLkr,
  formatTime,
  hasValue,
} from '../CourierUI';

/** Header card of the active task: who, where, what, and when. */
export default function TaskSummary({ job }: { job: CourierJob }) {
  const isPickup = job.taskType === 'PICKUP';
  return (
    <section className="cp-card cp-card--stack" aria-label={`Task ${job.trackingNumber}`}>
      <div className="cp-job__head">
        <div className="cp-job__badges">
          <span className="cp-job__id">{job.trackingNumber}</span>
          <TaskTypeBadge taskType={job.taskType} />
          <JobStatusBadge status={job.status} />
          <PriorityTag priority={job.priority} />
          <AttemptIndicator job={job} />
        </div>
        {job.payoutLkr > 0 && <span className="cp-job__payout">{formatLkr(job.payoutLkr)}</span>}
      </div>

      <div className="cp-grid-auto">
        <Field label={isPickup ? 'Collect from sender' : 'Pick up from'}>
          <span className="cp-strong">{job.merchantName}</span>
          <br />
          <span className="cp-muted cp-small">{job.pickupAddress}</span>
        </Field>
        <Field label="Recipient & drop-off">
          <span className="cp-strong">
            {job.recipient.name}
            {hasValue(job.recipient.city) ? ` (${job.recipient.city})` : ''}
          </span>
          <br />
          <span className="cp-muted cp-small">{job.recipient.address}</span>
          {hasValue(job.recipient.phone) && (
            <>
              <br />
              <a href={`tel:${job.recipient.phone}`} className="cp-phone cp-small">
                <Phone size={13} aria-hidden="true" /> {job.recipient.phone}
              </a>
            </>
          )}
        </Field>
        <Field label="Parcel">
          {job.parcel.category} · {job.parcel.weightKg} kg
          {job.distanceKm > 0 ? ` · ${job.distanceKm} km` : ''}
          {job.paymentMethod === 'COD' && job.codAmount ? (
            <>
              <br />
              <span className="cp-meta__cod">Collect COD {formatLkr(job.codAmount)}</span>
            </>
          ) : null}
          {job.parcel.handlingNotes && (
            <>
              <br />
              <span className="cp-text-warning cp-small">Note: {job.parcel.handlingNotes}</span>
            </>
          )}
        </Field>
        <Field label="Timeline">
          Assigned {formatTime(job.assignedAt)}
          {job.pickedUpAt && (
            <>
              <br />
              <span className="cp-muted cp-small">Collected {formatTime(job.pickedUpAt)}</span>
            </>
          )}
          {job.completedAt && (
            <>
              <br />
              <span className="cp-muted cp-small">Finished {formatTime(job.completedAt)}</span>
            </>
          )}
        </Field>
      </div>
    </section>
  );
}
