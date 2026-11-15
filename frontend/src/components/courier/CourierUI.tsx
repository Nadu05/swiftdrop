import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Info, Inbox, Loader2, RotateCcw, TriangleAlert } from 'lucide-react';
import type { CourierJob } from '@/types/courier.types';
import {
  AVAILABILITY,
  DEFAULT_MAX_ATTEMPTS,
  JOB_STATUS,
  MANIFEST_STATUS,
  PRIORITY,
  TASK_TYPE,
  resolveStatus,
  type StatusTone,
} from './courierStatus';

/* Reusable building blocks for every courier page. Styling lives in
   app/courier/courier-portal.css (`cp-*` classes); colours come from the
   SwiftDrop tokens. Pages must use these instead of inline styles. */

/* ---------------- Status badges (all driven by courierStatus.ts) ---------------- */

export function StatusBadge({ label, tone, dot = false }: { label: string; tone: StatusTone; dot?: boolean }) {
  return (
    <span className={`cp-badge cp-tone--${tone}`}>
      {dot && <span className="cp-badge__dot" aria-hidden="true" />}
      {label}
    </span>
  );
}

export function JobStatusBadge({ status }: { status: string }) {
  const s = resolveStatus(JOB_STATUS, status);
  return <StatusBadge label={s.label} tone={s.tone} />;
}

export function TaskTypeBadge({ taskType }: { taskType?: 'PICKUP' | 'DELIVERY' }) {
  const s = TASK_TYPE[taskType ?? 'DELIVERY'];
  return <StatusBadge label={s.label} tone={s.tone} />;
}

export function PriorityTag({ priority }: { priority: string }) {
  if (!priority || priority.toUpperCase() === 'NORMAL') return null;
  const s = resolveStatus(PRIORITY, priority);
  return <StatusBadge label={s.label} tone={s.tone} />;
}

export function AvailabilityBadge({ status }: { status: string }) {
  const s = resolveStatus(AVAILABILITY, status);
  return <StatusBadge label={s.label} tone={s.tone} dot />;
}

export function ManifestStatusBadge({ status }: { status: string }) {
  const s = resolveStatus(MANIFEST_STATUS, status);
  return <StatusBadge label={s.label} tone={s.tone} />;
}

/** "Attempt 2 of 3" for delivery jobs; shown once at least one attempt exists or a job is out for delivery. */
export function AttemptIndicator({ job }: { job: CourierJob }) {
  if (job.taskType === 'PICKUP') return null;
  const max = job.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const done = job.attemptCount ?? 0;
  const current = Math.min(done + (job.status === 'IN_TRANSIT' ? 1 : 0), max);
  if (current === 0) return null;
  const tone: StatusTone = current >= max ? 'error' : current > 1 ? 'warning' : 'neutral';
  return (
    <span className={`cp-badge cp-tone--${tone}`}>
      <RotateCcw size={11} aria-hidden="true" /> Attempt {current} of {max}
    </span>
  );
}

/** Previous failed attempts with their reasons. */
export function AttemptHistory({ job }: { job: CourierJob }) {
  if (!job.attempts || job.attempts.length === 0) return null;
  return (
    <div className="cp-attempts">
      <span className="cp-attempts__title">Previous attempts</span>
      {job.attempts.map((a) => (
        <div key={a.attemptNumber}>
          #{a.attemptNumber} · {a.reason || a.failureReason || a.status}
          {a.attemptedAt ? ` · ${formatDateTime(a.attemptedAt)}` : ''}
          {a.notes ? ` · ${a.notes}` : ''}
        </div>
      ))}
    </div>
  );
}

export function PodSummary({ pod }: { pod: NonNullable<CourierJob['proofOfDelivery']> }) {
  const reference = pod.reference?.startsWith('data:image/') ? 'Photo attached' : pod.reference;
  return (
    <span>
      {pod.type} · received by <strong>{pod.receivedBy}</strong>
      {reference ? (
        <>
          {' '}
          · <span className="cp-mono">{reference}</span>
        </>
      ) : null}
    </span>
  );
}

/* ---------------- Page structure ---------------- */

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="cp-header">
      <div>
        <h1 className="cp-title">{title}</h1>
        {subtitle && <p className="cp-subtitle">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function SectionHeader({
  id,
  title,
  subtitle,
  link,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="cp-section__head">
      <div>
        <h2 id={id} className="cp-section__title">
          {title}
        </h2>
        {subtitle && <p className="cp-section__subtitle">{subtitle}</p>}
      </div>
      {link && (
        <Link href={link.href} className="cp-link">
          {link.label} <ArrowRight size={14} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'info',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ReactNode;
  tone?: StatusTone;
}) {
  return (
    <div className="cp-card cp-stat">
      <div className="cp-stat__top">
        <span className="cp-stat__label">{label}</span>
        <span className={`cp-stat__icon cp-tone--${tone}`} aria-hidden="true">
          {icon}
        </span>
      </div>
      <span className="cp-stat__value">{value}</span>
      {hint && <span className="cp-stat__hint">{hint}</span>}
    </div>
  );
}

/** Label + value pair used in detail panels. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="cp-field">
      <span className="cp-field__label">{label}</span>
      <span className="cp-field__value">{children}</span>
    </div>
  );
}

/* ---------------- Feedback states ---------------- */

export function LoadingState({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="cp-page" role="status" aria-live="polite">
      <span className="cp-row cp-muted">
        <Loader2 size={16} className="cp-spin" aria-hidden="true" /> {text}
      </span>
      <div className="cp-skeleton" />
      <div className="cp-skeleton" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="cp-notice cp-notice--error" role="alert">
      <AlertCircle size={18} aria-hidden="true" />
      <span className="cp-notice__body">{message}</span>
      {onRetry && (
        <button type="button" className="cp-btn cp-btn--secondary cp-btn--sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="cp-card cp-empty">
      <Inbox size={32} className="cp-empty__icon" aria-hidden="true" />
      <p>{text}</p>
      {action && <div className="cp-empty__action">{action}</div>}
    </div>
  );
}

const NOTICE_ICON = { success: CheckCircle2, error: AlertCircle, warning: TriangleAlert, info: Info } as const;

export function Notice({ tone, children }: { tone: keyof typeof NOTICE_ICON; children: ReactNode }) {
  const Icon = NOTICE_ICON[tone];
  return (
    <div className={`cp-notice cp-notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={18} aria-hidden="true" />
      <div className="cp-notice__body">{children}</div>
    </div>
  );
}

/* ---------------- Formatting ---------------- */

export const formatLkr = (amount: number | null | undefined) =>
  amount == null ? '—' : `LKR ${amount.toLocaleString('en-LK')}`;

export const formatTime = (iso?: string) =>
  iso ? new Intl.DateTimeFormat('en-LK', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso)) : '—';

export const formatDateTime = (iso?: string) =>
  iso
    ? new Intl.DateTimeFormat('en-LK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
    : '—';

/** Hides placeholder values ('—', empty) that the API mapper uses for missing data. */
export const hasValue = (v?: string | number | null) => v != null && v !== '' && v !== '—';
