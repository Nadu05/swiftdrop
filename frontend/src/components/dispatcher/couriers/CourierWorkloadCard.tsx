'use client';

import { CheckCircle2, AlertTriangle, XCircle, Gauge } from 'lucide-react';
import type { CourierProfile } from './types';

interface CourierWorkloadCardProps {
  courier: CourierProfile;
}

export default function CourierWorkloadCard({ courier }: CourierWorkloadCardProps) {
  const percent = Math.min(
    100,
    Math.round((courier.activeDeliveries / courier.maxCapacity) * 100)
  );

  // Eligibility logic: Courier must be AVAILABLE and not at max capacity
  const isAvailable = courier.status === 'AVAILABLE';
  const isAtCapacity = courier.activeDeliveries >= courier.maxCapacity;
  const isEligible = isAvailable && !isAtCapacity;

  const getWorkloadLevel = (p: number) => {
    if (p >= 80) return { label: 'High Workload', color: '#dc2626', bg: '#fef2f2' };
    if (p >= 40) return { label: 'Moderate Load', color: '#d97706', bg: '#fffbeb' };
    return { label: 'Optimal / Low Load', color: '#16a34a', bg: '#f0fdf4' };
  };

  const workloadLevel = getWorkloadLevel(percent);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        padding: '1rem',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>
          <Gauge size={16} className="text-blue-600" aria-hidden="true" />
          <span>Workload &amp; Assignment Eligibility</span>
        </div>

        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            padding: '0.2rem 0.55rem',
            borderRadius: '9999px',
            backgroundColor: workloadLevel.bg,
            color: workloadLevel.color,
            border: `1px solid ${workloadLevel.color}40`,
          }}
        >
          {workloadLevel.label} ({percent}%)
        </span>
      </div>

      {/* Active delivery count & progress bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
          <span style={{ color: '#475569', fontWeight: 500 }}>
            Active Deliveries: <strong style={{ color: '#0f172a' }}>{courier.activeDeliveries}</strong> of {courier.maxCapacity} Max Capacity
          </span>
          <span className="font-mono font-bold" style={{ color: '#64748b' }}>{percent}%</span>
        </div>

        <div
          className="dispatcher-workload-bar-track"
          role="progressbar"
          aria-valuenow={courier.activeDeliveries}
          aria-valuemin={0}
          aria-valuemax={courier.maxCapacity}
          style={{ height: '8px', borderRadius: '9999px' }}
        >
          <div
            className={`dispatcher-workload-bar-fill ${
              percent >= 75
                ? 'dispatcher-workload-bar__fill--high'
                : percent >= 40
                ? 'dispatcher-workload-bar__fill--moderate'
                : 'dispatcher-workload-bar__fill--low'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Assignment Eligibility Indicator */}
      <div style={{ paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
        {isEligible ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.75rem',
              color: '#166534',
              backgroundColor: '#f0fdf4',
              padding: '0.6rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #bbf7d0',
            }}
          >
            <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
            <span>
              <strong>Eligible for New Assignments:</strong> Courier is active on shift with available capacity.
            </span>
          </div>
        ) : isAtCapacity ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.75rem',
              color: '#991b1b',
              backgroundColor: '#fef2f2',
              padding: '0.6rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #fecaca',
            }}
          >
            <AlertTriangle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
            <span>
              <strong>Ineligible for Assignments:</strong> Courier has reached full delivery capacity ({courier.maxCapacity} orders).
            </span>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.75rem',
              color: '#92400e',
              backgroundColor: '#fffbeb',
              padding: '0.6rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #fde68a',
            }}
          >
            <XCircle size={16} style={{ color: '#d97706', flexShrink: 0 }} />
            <span>
              <strong>Unavailable for Dispatch:</strong> Courier status is currently marked as {courier.status.replace('_', ' ')}.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
