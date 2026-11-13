import type { ReactNode } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { CourierJobPriority, CourierJobStatus } from '@/types/courier.types';

/* Small shared pieces for the courier pages, built on the platform's
   existing classes (glass-card, badge-*, btn-*) from globals.css. */

const STATUS_BADGE: Record<CourierJobStatus, { label: string; className: string }> = {
  ASSIGNED: { label: 'Assigned', className: 'badge badge-warning' },
  ACCEPTED: { label: 'Accepted', className: 'badge badge-primary' },
  IN_TRANSIT: { label: 'In Transit', className: 'badge badge-primary' },
  DELIVERED: { label: 'Delivered', className: 'badge badge-success' },
  FAILED: { label: 'Failed', className: 'badge badge-danger' },
};

export function JobStatusBadge({ status }: { status: CourierJobStatus }) {
  const { label, className } = STATUS_BADGE[status];
  return <span className={className}>{label}</span>;
}

const PRIORITY_COLOR: Record<CourierJobPriority, string> = {
  URGENT: '#f87171',
  HIGH: '#fbbf24',
  NORMAL: '#94a3b8',
};

export function PriorityTag({ priority }: { priority: CourierJobPriority }) {
  return (
    <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', color: PRIORITY_COLOR[priority] }}>
      {priority}
    </span>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>{title}</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '0.25rem' }}>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint, icon }: { label: string; value: ReactNode; hint: string; icon: ReactNode }) {
  return (
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>{label}</span>
        {icon}
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>{hint}</div>
    </div>
  );
}

export function LoadingState({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#94a3b8' }}>
      <Loader2 size={18} className="animate-spin" /> {text}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      className="glass-card"
      role="alert"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', borderColor: 'rgba(239, 68, 68, 0.4)' }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fca5a5' }}>
        <AlertCircle size={18} /> {message}
      </span>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="glass-card" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
      <p>{text}</p>
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

/** Muted label + white value pair used in detail panels. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0 }}>
      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>{children}</span>
    </div>
  );
}
