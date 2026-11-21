'use client';

import { use, type CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, MapPin, Phone, Store } from 'lucide-react';
import { useCourierJob } from '@/hooks/api/use-courier';
import { canDo } from '@/components/courier/courierActions';
import {
  ErrorState,
  JobStatusBadge,
  LoadingState,
  PriorityTag,
  TaskTypeBadge,
  formatDateTime,
  formatLkr,
} from '@/components/courier/CourierUI';

const card: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.9rem',
  background: 'var(--ds-surface, #ffffff)',
  border: '1px solid var(--ds-border, #e2e8f0)',
  borderRadius: '14px',
  padding: '1.25rem 1.4rem',
  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
};

const muted: CSSProperties = { fontSize: '0.8125rem', color: '#64748b' };

/**
 * Delivery details (/courier/deliveries/[id]): one of the courier own deliveries with the recipient, address,
 * current status, every delivery attempt and the proof of delivery. The backend answers 403 for another
 * courier delivery, which is shown as an error and never as an empty page.
 */
export default function DeliveryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const assignmentId = decodeURIComponent(id);
  const { data: job, isLoading, isError, error, refetch } = useCourierJob(assignmentId);

  if (isLoading) return <LoadingState text="Loading delivery details…" />;
  if (isError || !job) {
    return (
      <div className="dispatcher-overview">
        <ErrorState
          message={error instanceof Error ? error.message : 'Could not load this delivery.'}
          onRetry={() => refetch()}
        />
        <div>
          <Link href="/courier/deliveries" className="btn btn-secondary">
            <ArrowLeft size={15} aria-hidden="true" /> Back to my deliveries
          </Link>
        </div>
      </div>
    );
  }

  const canWork = canDo(job, 'ACCEPT') || canDo(job, 'PICKUP') || canDo(job, 'DELIVER') || canDo(job, 'FAIL');
  const attempts = job.attempts ?? [];
  const isPickup = job.taskType === 'PICKUP';

  return (
    <div className="dispatcher-overview">
      <header className="dispatcher-overview__header">
        <div className="dispatcher-overview__title-group">
          <h1 className="dispatcher-overview__title">Delivery {job.trackingNumber}</h1>
          <p className="dispatcher-overview__subtitle">Order {job.orderId}</p>
        </div>
        <div className="dispatcher-overview__actions">
          {canWork ? (
            <Link href={`/courier/active?job=${encodeURIComponent(job.assignmentId)}`} className="btn btn-primary">
              Work on this task <ArrowRight size={15} aria-hidden="true" />
            </Link>
          ) : (
            <Link href="/courier/history" className="btn btn-secondary">
              Job history
            </Link>
          )}
        </div>
      </header>

      <section style={card} aria-label={`Delivery ${job.trackingNumber}`}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <TaskTypeBadge taskType={job.taskType} />
          <JobStatusBadge status={job.status} />
          <PriorityTag priority={job.priority} />
          {job.payoutLkr > 0 && (
            <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#059669' }}>{formatLkr(job.payoutLkr)}</span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <Store size={18} color="#2563eb" aria-hidden="true" />
            <div>
              <div style={muted}>{isPickup ? 'Collect from sender' : 'Pick up from'}</div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{job.merchantName}</div>
              <div style={muted}>{job.pickupAddress}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <MapPin size={18} color="#059669" aria-hidden="true" />
            <div>
              <div style={muted}>{isPickup ? 'Final destination' : 'Deliver to'}</div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{job.recipient.name}</div>
              <div style={muted}>
                {job.recipient.address}
                {job.recipient.city && job.recipient.city !== '—' ? `, ${job.recipient.city}` : ''}
              </div>
              {job.recipient.phone && job.recipient.phone !== '—' && (
                <a
                  href={`tel:${job.recipient.phone}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#2563eb', fontSize: '0.8125rem' }}
                >
                  <Phone size={13} aria-hidden="true" /> {job.recipient.phone}
                </a>
              )}
            </div>
          </div>
        </div>

        <div style={{ ...muted, display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
          <span>
            {job.parcel.category} · {job.parcel.weightKg} kg
          </span>
          <span>Assigned {formatDateTime(job.assignedAt)}</span>
          {job.pickedUpAt && <span>Picked up {formatDateTime(job.pickedUpAt)}</span>}
          {job.completedAt && <span>Finished {formatDateTime(job.completedAt)}</span>}
        </div>
      </section>

      <section style={card} aria-labelledby="courier-attempts">
        <h2 id="courier-attempts" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
          Delivery attempts
        </h2>
        {attempts.length === 0 ? (
          <p style={{ ...muted, margin: 0 }}>No delivery attempts yet.</p>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {attempts.map((a) => (
              <li key={a.attemptNumber} style={{ display: 'flex', gap: '0.65rem' }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 10,
                    height: 10,
                    marginTop: 6,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: a.outcome === 'SUCCESS' ? '#16a34a' : '#dc2626',
                  }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>
                    Attempt {a.attemptNumber} · {a.outcome === 'SUCCESS' ? 'Delivered' : 'Failed'}
                    {a.outcome !== 'SUCCESS' && (a.failureReason || a.reason) ? `: ${a.failureReason || a.reason}` : ''}
                  </div>
                  {a.notes && <div style={{ fontSize: '0.8125rem', color: '#475569' }}>{a.notes}</div>}
                  {a.attemptedAt && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{formatDateTime(a.attemptedAt)}</div>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {job.proofOfDelivery && (
        <section style={card} aria-labelledby="courier-pod">
          <h2 id="courier-pod" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
            Proof of delivery
          </h2>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155' }}>
            {job.proofOfDelivery.type} · received by <strong>{job.proofOfDelivery.receivedBy}</strong>
          </p>
          {job.completedAt && <p style={{ ...muted, margin: 0 }}>Delivered {formatDateTime(job.completedAt)}</p>}
        </section>
      )}

      <div>
        <Link href="/courier/deliveries" className="btn btn-secondary">
          <ArrowLeft size={15} aria-hidden="true" /> Back to my deliveries
        </Link>
      </div>
    </div>
  );
}
