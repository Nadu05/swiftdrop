'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Loader2, MapPin, Package, Phone, RotateCcw } from 'lucide-react';
import { mapDeliveryJobDtoToCourierJob } from '@/api/services/courier.api';
import { useAcceptCourierTaskMutation } from '@/hooks/api/use-courier';
import type { CourierJob } from '@/types/courier.types';
import {
  JobStatusBadge,
  PriorityTag,
  TaskTypeBadge,
  formatLkr,
  formatTime,
} from './CourierUI';

interface AssignedJobCardProps {
  job: CourierJob;
  canAccept: boolean;
  onUpdated: (updated: CourierJob) => void;
}

export default function AssignedJobCard({ job, canAccept, onUpdated }: AssignedJobCardProps) {
  const [error, setError] = useState<string | null>(null);
  const acceptMutation = useAcceptCourierTaskMutation();

  const isPickup = job.taskType === 'PICKUP';
  const showAccept = job.status === 'ASSIGNED';
  const attemptCount = job.attemptCount ?? 0;
  const maxAttempts = job.maxAttempts ?? 3;

  const handleAccept = async () => {
    setError(null);
    try {
      const dto = await acceptMutation.mutateAsync(job.assignmentId);
      onUpdated(mapDeliveryJobDtoToCourierJob(dto));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept task');
    }
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <strong style={{ color: '#ffffff', fontSize: '1rem' }}>{job.trackingNumber}</strong>
          <JobStatusBadge status={job.status} />
          <TaskTypeBadge taskType={job.taskType} />
          <PriorityTag priority={job.priority} />
          {!isPickup && attemptCount > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '0.15rem 0.45rem',
                borderRadius: '999px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#fcd34d',
              }}
            >
              <RotateCcw size={11} /> Attempt {attemptCount}/{maxAttempts}
            </span>
          )}
        </div>
        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8' }}>
          {formatLkr(job.payoutLkr)}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.75rem',
          fontSize: '0.85rem',
          color: '#cbd5e1',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <Package size={15} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>
              {isPickup ? 'Collect From Sender' : 'Pickup From Branch / Sender'}
            </div>
            <div style={{ color: '#f1f5f9', fontWeight: 600 }}>{job.merchantName}</div>
            <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{job.pickupAddress}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <MapPin size={15} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>
              {isPickup ? 'Final Destination' : 'Deliver To Recipient'}
            </div>
            <div style={{ color: '#f1f5f9', fontWeight: 600 }}>
              {job.recipient.name}
              {job.recipient.city && job.recipient.city !== '—' ? ` · ${job.recipient.city}` : ''}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{job.recipient.address}</div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
          paddingTop: '0.6rem',
          borderTop: '1px solid rgba(148, 163, 184, 0.12)',
          fontSize: '0.78rem',
          color: '#94a3b8',
        }}
      >
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span>
            {job.parcel.category} · {job.parcel.weightKg} kg
          </span>
          <span>{job.distanceKm} km</span>
          <span>Assigned {formatTime(job.assignedAt)}</span>
          {job.paymentMethod === 'COD' && job.codAmount ? (
            <span style={{ color: '#fbbf24', fontWeight: 600 }}>
              COD Collect: {formatLkr(job.codAmount)}
            </span>
          ) : null}
          {job.recipient.phone && job.recipient.phone !== '—' && (
            <a
              href={`tel:${job.recipient.phone}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#60a5fa', textDecoration: 'none' }}
            >
              <Phone size={12} /> {job.recipient.phone}
            </a>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {showAccept && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canAccept || acceptMutation.isPending}
              title={!canAccept ? 'Go online to accept tasks' : undefined}
              onClick={handleAccept}
            >
              {acceptMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              {acceptMutation.isPending ? 'Accepting...' : isPickup ? 'Accept Pickup' : 'Accept Task'}
            </button>
          )}
          <Link href={`/courier/active?job=${job.assignmentId}`} className="btn btn-secondary">
            Open active view <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" style={{ fontSize: '0.8rem', color: '#fca5a5' }}>
          {error}
        </div>
      )}
    </div>
  );
}
