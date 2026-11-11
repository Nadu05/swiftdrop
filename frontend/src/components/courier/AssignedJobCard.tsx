'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, MapPin, Store } from 'lucide-react';
import { acceptJob } from '@/api/services/courier.api';
import type { CourierJob } from '@/types/courier.types';
import { Field, JobStatusBadge, PriorityTag, formatLkr, formatTime } from './CourierUI';

/**
 * One job assigned by the branch. Shows Accept while ASSIGNED and a link to the
 * Active Delivery screen once accepted / in transit.
 */
export default function AssignedJobCard({
  job,
  canAccept,
  onUpdated,
}: {
  job: CourierJob;
  canAccept: boolean;
  onUpdated: (job: CourierJob) => void;
}) {
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setAccepting(true);
    setError(null);
    try {
      onUpdated(await acceptJob(job.assignmentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept this job.');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <article className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>{job.trackingNumber}</span>
          <PriorityTag priority={job.priority} />
        </div>
        <JobStatusBadge status={job.status} />
      </div>

      <div className="grid-cols-2" style={{ gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <Store size={18} color="#60a5fa" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
          <Field label="Pickup">
            {job.merchantName}
            <br />
            <span style={{ color: '#94a3b8' }}>{job.pickupAddress}</span>
          </Field>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <MapPin size={18} color="#34d399" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
          <Field label="Drop-off">
            {job.recipient.name}
            <br />
            <span style={{ color: '#94a3b8' }}>
              {job.recipient.address}, {job.recipient.city}
            </span>
          </Field>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
          paddingTop: '0.9rem',
          borderTop: '1px solid rgba(59, 130, 246, 0.12)',
        }}
      >
        <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
          {job.parcel.category} · {job.parcel.weightKg} kg · {job.distanceKm} km ·{' '}
          <span style={{ color: '#34d399', fontWeight: 600 }}>{formatLkr(job.payoutLkr)} payout</span> · assigned{' '}
          {formatTime(job.assignedAt)}
        </span>

        {job.status === 'ASSIGNED' ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={accept}
            disabled={!canAccept || accepting}
            title={canAccept ? undefined : 'Go online to accept jobs'}
          >
            {accepting ? 'Accepting…' : 'Accept job'}
          </button>
        ) : (
          <Link href={`/courier/active?job=${job.assignmentId}`} className="btn btn-secondary">
            Open delivery <ArrowRight size={16} />
          </Link>
        )}
      </div>

      {error && (
        <p role="alert" style={{ fontSize: '0.85rem', color: '#fca5a5' }}>
          {error}
        </p>
      )}
    </article>
  );
}
