'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Phone,
  RotateCcw,
} from 'lucide-react';
import { mapDeliveryJobDtoToCourierJob } from '@/api/services/courier.api';
import { describeActionError, useAcceptCourierTaskMutation } from '@/hooks/api/use-courier';
import { canDo } from './courierActions';
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
  const showAccept = canDo(job, 'ACCEPT');
  // A failed attempt that can still be retried also needs the active view.
  const isEnRoute =
    job.status === 'ACCEPTED' ||
    job.status === 'IN_TRANSIT' ||
    (job.status === 'FAILED' && canDo(job, 'DELIVER'));
  const attemptCount = job.attemptCount ?? 0;
  const maxAttempts = job.maxAttempts ?? 3;

  const handleAccept = async () => {
    setError(null);
    try {
      const dto = await acceptMutation.mutateAsync(job.assignmentId);
      onUpdated(mapDeliveryJobDtoToCourierJob(dto));
    } catch (err) {
      setError(describeActionError(err, 'Failed to accept task'));
    }
  };

  return (
    <article
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        background: 'var(--ds-surface, #ffffff)',
        border: '1px solid var(--ds-border, #e2e8f0)',
        borderRadius: '14px',
        padding: '1.25rem 1.4rem',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03), 0 1px 2px rgba(15, 23, 42, 0.02)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Top Header Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Package size={17} color="#2563eb" />
            <strong style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700 }}>
              {job.trackingNumber}
            </strong>
          </div>
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
                borderRadius: '9999px',
                background: '#fffbeb',
                color: '#b45309',
                border: '1px solid #fde68a',
              }}
            >
              <RotateCcw size={11} /> Attempt {attemptCount}/{maxAttempts}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.25rem 0.65rem',
              borderRadius: '8px',
              background: '#ecfdf5',
              color: '#047857',
              border: '1px solid #a7f3d0',
              fontSize: '0.875rem',
              fontWeight: 700,
            }}
          >
            {formatLkr(job.payoutLkr)}
          </span>
        </div>
      </div>

      {/* Origin & Destination Information Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '0.85rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '0.65rem',
            alignItems: 'flex-start',
            padding: '0.75rem 0.9rem',
            background: '#f8fafc',
            border: '1px solid #f1f5f9',
            borderRadius: '10px',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: '#e0f2fe',
              color: '#0369a1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Package size={15} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              {isPickup ? 'Collect From Sender' : 'Pickup Point / Branch'}
            </div>
            <div style={{ color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>
              {job.merchantName}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.8125rem', marginTop: '0.15rem' }}>
              {job.pickupAddress}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.65rem',
            alignItems: 'flex-start',
            padding: '0.75rem 0.9rem',
            background: '#f8fafc',
            border: '1px solid #f1f5f9',
            borderRadius: '10px',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MapPin size={15} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              {isPickup ? 'Destination Hub' : 'Deliver To Recipient'}
            </div>
            <div style={{ color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>
              {job.recipient.name}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.8125rem', marginTop: '0.15rem' }}>
              {job.recipient.address}, {job.recipient.city}
            </div>
            {job.recipient.phone && (
              <a
                href={`tel:${job.recipient.phone}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  color: '#2563eb',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  marginTop: '0.25rem',
                  textDecoration: 'none',
                }}
              >
                <Phone size={12} /> {job.recipient.phone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Footer / Action Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
          paddingTop: '0.25rem',
        }}
      >
        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Clock size={13} /> Assigned {formatTime(job.assignedAt)}
          {job.distanceKm ? <span>· {job.distanceKm} km route</span> : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {showAccept && (
            <button
              type="button"
              disabled={!canAccept || acceptMutation.isPending}
              onClick={handleAccept}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 1rem',
                borderRadius: '9px',
                background: canAccept
                  ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                  : '#cbd5e1',
                color: '#ffffff',
                fontSize: '0.8125rem',
                fontWeight: 600,
                border: 'none',
                cursor: canAccept ? 'pointer' : 'not-allowed',
                boxShadow: canAccept ? '0 1px 3px rgba(37, 99, 235, 0.3)' : 'none',
              }}
            >
              {acceptMutation.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Accepting…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Accept Job</span>
                </>
              )}
            </button>
          )}

          {isEnRoute && (
            <Link
              href={`/courier/active?assignmentId=${job.assignmentId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.9rem',
                borderRadius: '9px',
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                fontSize: '0.8125rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <Navigation size={13} />
              <span>Open Active Route</span>
              <ArrowRight size={13} />
            </Link>
          )}

          <Link
            href={`/courier/deliveries/${encodeURIComponent(job.assignmentId)}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.9rem',
              borderRadius: '9px',
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #e2e8f0',
              fontSize: '0.8125rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <span>Details</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {error && (
        <div style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 500 }}>
          {error}
        </div>
      )}
    </article>
  );
}
