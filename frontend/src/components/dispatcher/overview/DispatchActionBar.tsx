import Link from 'next/link';
import { AlertCircle, ArrowRight, ShieldAlert, Zap } from 'lucide-react';

interface DispatchActionBarProps {
  unassignedCount?: number;
  pendingPickupsCount?: number;
  pendingExceptionsCount?: number;
}

export default function DispatchActionBar({
  unassignedCount = 0,
  pendingPickupsCount = 0,
  pendingExceptionsCount = 0,
}: DispatchActionBarProps) {
  const totalAttention = unassignedCount + pendingPickupsCount + pendingExceptionsCount;
  if (totalAttention === 0) {
    return null;
  }

  return (
    <div className="dispatcher-action-bar">
      <div className="dispatcher-action-bar__left">
        <div className="dispatcher-action-bar__icon-badge">
          <AlertCircle size={20} className="dispatcher-action-bar__alert-icon" aria-hidden="true" />
        </div>
        <div>
          <h2 className="dispatcher-action-bar__title">
            <span className="dispatcher-action-bar__count">{unassignedCount + pendingPickupsCount}</span>{' '}
            Dispatch Queue Tasks Require Attention
            {pendingExceptionsCount > 0 && (
              <> · {pendingExceptionsCount} Escalated Exception{pendingExceptionsCount > 1 ? 's' : ''}</>
            )}
          </h2>
          <p className="dispatcher-action-bar__subtitle">
            {unassignedCount} unassigned {unassignedCount === 1 ? 'delivery' : 'deliveries'} and{' '}
            {pendingPickupsCount} pending pickup {pendingPickupsCount === 1 ? 'task' : 'tasks'} waiting for courier assignment or branch drop-off.
          </p>
        </div>
      </div>

      <div className="dispatcher-action-bar__actions">
        {pendingExceptionsCount > 0 && (
          <Link
            href="/dispatcher/delivery-history"
            className="dispatcher-overview__refresh-btn"
            style={{ textDecoration: 'none' }}
          >
            <ShieldAlert size={15} aria-hidden="true" />
            <span>Review Exceptions ({pendingExceptionsCount})</span>
          </Link>
        )}
        <Link href="/dispatcher/deliveries" className="dispatcher-btn-primary">
          <Zap size={16} aria-hidden="true" />
          <span>Open Dispatch Queue</span>
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
