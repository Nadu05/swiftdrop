import Link from 'next/link';
import { AlertCircle, ArrowRight, Zap } from 'lucide-react';

interface DispatchActionBarProps {
  unassignedCount?: number;
}

export default function DispatchActionBar({ unassignedCount = 42 }: DispatchActionBarProps) {
  return (
    <div className="dispatcher-action-bar">
      <div className="dispatcher-action-bar__left">
        <div className="dispatcher-action-bar__icon-badge">
          <AlertCircle size={20} className="dispatcher-action-bar__alert-icon" aria-hidden="true" />
        </div>
        <div>
          <h2 className="dispatcher-action-bar__title">
            <span className="dispatcher-action-bar__count">{unassignedCount}</span> Unassigned Deliveries Require Attention
          </h2>
          <p className="dispatcher-action-bar__subtitle">
            Orders placed in the last hour are pending courier dispatch. Assign them now to avoid SLA breaches.
          </p>
        </div>
      </div>

      <div className="dispatcher-action-bar__actions">
        <Link href="/dispatcher/deliveries" className="dispatcher-btn-primary">
          <Zap size={16} aria-hidden="true" />
          <span>Open Dispatch Queue</span>
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

