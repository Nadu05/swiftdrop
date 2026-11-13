import type { ReactNode } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Loader2, type LucideIcon } from 'lucide-react';
import type { CourierJobPriority, CourierJobStatus } from '@/types/courier.types';

/* Shared presentational pieces for the courier pages.
   Styling comes from globals.css (base theme + "Courier Portal" section). */

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

export function PriorityTag({ priority }: { priority: CourierJobPriority }) {
  return <span className={`courier-priority courier-priority--${priority.toLowerCase()}`}>{priority}</span>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <header className="courier-page-header">
      <div>
        <h1 className="courier-page-header__title">{title}</h1>
        <p className="courier-page-header__subtitle">{subtitle}</p>
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
  id: string;
  title: string;
  subtitle: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="courier-section__head">
      <div>
        <h2 id={id} className="courier-section__title">
          {title}
        </h2>
        <p className="courier-section__subtitle">{subtitle}</p>
      </div>
      {link && (
        <Link href={link.href} className="courier-link">
          {link.label} <ArrowRight size={14} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

type IconTone = 'primary' | 'success' | 'warning' | 'purple' | 'danger';

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  icon: LucideIcon;
  tone: IconTone;
}) {
  return (
    <div className="glass-card">
      <div className="courier-stat__head">
        <span>{label}</span>
        <Icon size={18} className={`courier-icon--${tone}`} aria-hidden={true} />
      </div>
      <div className="courier-stat__value">{value}</div>
      <div className="courier-stat__hint">{hint}</div>
    </div>
  );
}

export function LoadingState({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="glass-card courier-state" role="status" aria-live="polite">
      <Loader2 size={18} className="courier-spin" aria-hidden="true" /> {text}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="glass-card courier-state courier-state--error" role="alert">
      <span className="courier-row">
        <AlertCircle size={18} aria-hidden="true" /> {message}
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
    <div className="glass-card courier-state courier-state--empty">
      <p>{text}</p>
      {action}
    </div>
  );
}

/** Muted label + value pair used in detail panels. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="courier-field">
      <span className="courier-field__label">{label}</span>
      <span className="courier-field__value">{children}</span>
    </div>
  );
}

/** Readable message from any thrown value (CourierApiError, Error, unknown). */
export const errorMessage = (error: unknown, fallback = 'Something went wrong. Please try again.') =>
  error instanceof Error && error.message ? error.message : fallback;
