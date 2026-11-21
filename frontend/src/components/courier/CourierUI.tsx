import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock, Loader2, Navigation, Package } from 'lucide-react';
import type { CourierJobPriority, CourierJobStatus } from '@/types/courier.types';

/* Unified UI components for the Courier portal, built on SwiftDrop's shared design system */

const STATUS_CONFIG: Record<
  CourierJobStatus,
  { label: string; bg: string; text: string; border: string; icon?: ReactNode }
> = {
  ASSIGNED: {
    label: 'Assigned',
    bg: '#fffbeb',
    text: '#b45309',
    border: '#fde68a',
  },
  ACCEPTED: {
    label: 'Accepted',
    bg: '#eff6ff',
    text: '#1d4ed8',
    border: '#bfdbfe',
  },
  IN_TRANSIT: {
    label: 'In Transit',
    bg: '#e0e7ff',
    text: '#4338ca',
    border: '#c7d2fe',
  },
  DELIVERED: {
    label: 'Delivered',
    bg: '#ecfdf5',
    text: '#047857',
    border: '#a7f3d0',
  },
  FAILED: {
    label: 'Failed',
    bg: '#fef2f2',
    text: '#b91c1c',
    border: '#fecaca',
  },
};

export function JobStatusBadge({ status }: { status: CourierJobStatus | string }) {
  const cfg = STATUS_CONFIG[status as CourierJobStatus] ?? {
    label: String(status).replace(/_/g, ' '),
    bg: '#f8fafc',
    text: '#475569',
    border: '#e2e8f0',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.22rem 0.65rem',
        borderRadius: '9999px',
        backgroundColor: cfg.bg,
        color: cfg.text,
        border: `1px solid ${cfg.border}`,
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: cfg.text,
        }}
      />
      {cfg.label}
    </span>
  );
}

export function TaskTypeBadge({ taskType }: { taskType?: 'PICKUP' | 'DELIVERY' }) {
  const isPickup = taskType === 'PICKUP';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.03em',
        padding: '0.2rem 0.55rem',
        borderRadius: '6px',
        background: isPickup ? '#fef3c7' : '#e0f2fe',
        color: isPickup ? '#92400e' : '#0369a1',
        border: `1px solid ${isPickup ? '#fde68a' : '#bae6fd'}`,
      }}
    >
      {isPickup ? <ArrowDownLeft size={12} /> : <Navigation size={12} />}
      {isPickup ? 'PICKUP' : 'DELIVERY'}
    </span>
  );
}

export function PriorityTag({ priority }: { priority: CourierJobPriority | string }) {
  const isUrgent = priority === 'URGENT';
  const isHigh = priority === 'HIGH';

  const bg = isUrgent ? '#fee2e2' : isHigh ? '#fef3c7' : '#f1f5f9';
  const color = isUrgent ? '#b91c1c' : isHigh ? '#b45309' : '#475569';
  const border = isUrgent ? '#fca5a5' : isHigh ? '#fde68a' : '#e2e8f0';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        padding: '0.15rem 0.5rem',
        borderRadius: '6px',
        background: bg,
        color,
        border: `1px solid ${border}`,
      }}
    >
      {(isUrgent || isHigh) && <AlertTriangle size={11} />}
      {priority}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <header className="dispatcher-overview__header">
      <div className="dispatcher-overview__title-group">
        <h1 className="dispatcher-overview__title">{title}</h1>
        <p className="dispatcher-overview__subtitle">{subtitle}</p>
      </div>
      {action && <div className="dispatcher-overview__actions">{action}</div>}
    </header>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  iconBg = '#eff6ff',
  iconColor = '#2563eb',
}: {
  label: string;
  value: ReactNode;
  hint: string;
  icon: ReactNode;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <article className="dispatcher-stats-card">
      <div className="dispatcher-stats-card__top">
        <div className="dispatcher-stats-card__info">
          <span className="dispatcher-stats-card__title">{label}</span>
          <div className="dispatcher-stats-card__value">{value}</div>
        </div>
        <div
          className="dispatcher-stats-card__icon-wrapper"
          style={{ backgroundColor: iconBg, color: iconColor }}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>
      <div className="dispatcher-stats-card__bottom">
        <span className="dispatcher-stats-card__desc">{hint}</span>
      </div>
    </article>
  );
}

export function LoadingState({ text = 'Loading…' }: { text?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: '2.5rem',
        background: 'var(--ds-surface, #ffffff)',
        border: '1px solid var(--ds-border, #e2e8f0)',
        borderRadius: '14px',
        color: '#64748b',
        fontSize: '0.875rem',
        fontWeight: 500,
      }}
    >
      <Loader2 size={18} className="animate-spin text-blue-600" />
      <span>{text}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      className="dispatcher-reports-alert dispatcher-reports-alert--error"
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '1rem 1.25rem',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '12px',
        color: '#991b1b',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <AlertCircle size={18} color="#dc2626" />
        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="dispatcher-overview__refresh-btn"
          style={{ marginLeft: 'auto', padding: '0.35rem 0.75rem' }}
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '2.5rem 1.5rem',
        background: 'var(--ds-surface, #ffffff)',
        border: '1px solid var(--ds-border, #e2e8f0)',
        borderRadius: '14px',
        color: '#64748b',
      }}
    >
      <div
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: '#f1f5f9',
          color: '#94a3b8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 0.75rem',
        }}
      >
        <Package size={22} />
      </div>
      <p style={{ fontSize: '0.875rem', margin: 0, fontWeight: 500 }}>{text}</p>
      {action && <div style={{ marginTop: '1rem' }}>{action}</div>}
    </div>
  );
}

export const formatLkr = (amount: number) => `LKR ${amount.toLocaleString('en-LK')}`;

export const formatTime = (iso?: string) =>
  iso ? new Intl.DateTimeFormat('en-LK', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso)) : '—';

export const formatDateTime = (iso?: string) =>
  iso
    ? new Intl.DateTimeFormat('en-LK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
    : '—';

/** Muted label + strong value pair used in detail panels. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0 }}>
      <span
        style={{
          fontSize: '0.72rem',
          color: '#64748b',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: '0.875rem', color: '#0f172a', fontWeight: 500 }}>{children}</span>
    </div>
  );
}
