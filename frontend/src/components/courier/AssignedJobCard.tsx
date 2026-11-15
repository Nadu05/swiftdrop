'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Loader2, MapPin, Phone, Store } from 'lucide-react';
import { mapDeliveryJobDtoToCourierJob } from '@/api/services/courier.api';
import { useAcceptCourierTaskMutation } from '@/hooks/api/use-courier';
import type { CourierJob } from '@/types/courier.types';
import {
  AttemptIndicator,
  JobStatusBadge,
  PriorityTag,
  TaskTypeBadge,
  formatLkr,
  formatTime,
  hasValue,
} from './CourierUI';

interface AssignedJobCardProps {
  job: CourierJob;
  canAccept: boolean;
  onUpdated: (updated: CourierJob) => void;
}

/** One pickup task or delivery job. Accept while ASSIGNED; otherwise open it in the Active Task view. */
export default function AssignedJobCard({ job, canAccept, onUpdated }: AssignedJobCardProps) {
  const [error, setError] = useState<string | null>(null);
  const acceptMutation = useAcceptCourierTaskMutation();
  const isPickup = job.taskType === 'PICKUP';

  const handleAccept = async () => {
    setError(null);
    try {
      const dto = await acceptMutation.mutateAsync(job.assignmentId);
      onUpdated(mapDeliveryJobDtoToCourierJob(dto));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept this task.');
    }
  };

  return (
    <article className="cp-card cp-job" aria-label={`${isPickup ? 'Pickup' : 'Delivery'} ${job.trackingNumber}`}>
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
        <div className="cp-stop">
          <span className="cp-stop__icon cp-tone--info" aria-hidden="true">
            <Store size={16} />
          </span>
          <div>
            <div className="cp-field__label">{isPickup ? 'Collect from sender' : 'Pick up from'}</div>
            <div className="cp-stop__name">{job.merchantName}</div>
            <div className="cp-stop__addr">{job.pickupAddress}</div>
          </div>
        </div>
        <div className="cp-stop">
          <span className="cp-stop__icon cp-tone--success" aria-hidden="true">
            <MapPin size={16} />
          </span>
          <div>
            <div className="cp-field__label">{isPickup ? 'Final destination' : 'Deliver to'}</div>
            <div className="cp-stop__name">
              {job.recipient.name}
              {hasValue(job.recipient.city) ? ` · ${job.recipient.city}` : ''}
            </div>
            <div className="cp-stop__addr">{job.recipient.address}</div>
          </div>
        </div>
      </div>

      <div className="cp-job__foot">
        <div className="cp-meta">
          <span>
            {job.parcel.category} · {job.parcel.weightKg} kg
          </span>
          {job.distanceKm > 0 && <span>{job.distanceKm} km</span>}
          <span>Assigned {formatTime(job.assignedAt)}</span>
          {job.paymentMethod === 'COD' && job.codAmount ? (
            <span className="cp-meta__cod">Collect COD {formatLkr(job.codAmount)}</span>
          ) : null}
          {hasValue(job.recipient.phone) && (
            <a href={`tel:${job.recipient.phone}`} className="cp-phone">
              <Phone size={13} aria-hidden="true" /> {job.recipient.phone}
            </a>
          )}
        </div>

        <div className="cp-actions cp-actions--stack-mobile">
          <Link href={`/courier/active?job=${job.assignmentId}`} className="cp-btn cp-btn--secondary">
            Open task <ArrowRight size={15} aria-hidden="true" />
          </Link>
          {job.status === 'ASSIGNED' && (
            <button
              type="button"
              className="cp-btn cp-btn--primary"
              disabled={!canAccept || acceptMutation.isPending}
              title={canAccept ? undefined : 'Go online to accept tasks'}
              onClick={handleAccept}
            >
              {acceptMutation.isPending ? (
                <Loader2 size={15} className="cp-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 size={15} aria-hidden="true" />
              )}
              {acceptMutation.isPending ? 'Accepting…' : isPickup ? 'Accept pickup' : 'Accept delivery'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="cp-error">
          {error}
        </p>
      )}
    </article>
  );
}
