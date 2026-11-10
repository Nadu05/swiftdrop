'use client';

import { AlertTriangle, Clock, FileWarning, RotateCcw } from 'lucide-react';
import type { DeliveryHistoryRecord } from './types';

interface FailedDeliveryDetailsProps {
  failureDetails: NonNullable<DeliveryHistoryRecord['failureDetails']>;
  deliveryNotes?: string;
  deliveryAttempts: number;
}

export default function FailedDeliveryDetails({
  failureDetails,
  deliveryNotes,
  deliveryAttempts,
}: FailedDeliveryDetailsProps) {
  const formatTimestamp = (isoStr: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(isoStr));
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="dispatcher-modal-section">
      <div className="dispatcher-modal-section-title">
        <AlertTriangle size={15} style={{ color: '#dc2626' }} aria-hidden="true" />
        <span style={{ color: '#991b1b', fontWeight: 700 }}>Failed Delivery Investigation</span>
      </div>

      <div className="dispatcher-failure-box">
        {/* Documented Reason */}
        <div>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
            Documented Reason for Failure
          </span>
          <div className="dispatcher-failure-reason-callout">
            {failureDetails.reason}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="dispatcher-failure-grid">
          <div className="dispatcher-failure-stat">
            <Clock size={16} style={{ color: '#dc2626', flexShrink: 0 }} aria-hidden="true" />
            <div className="dispatcher-failure-stat-info">
              <span className="dispatcher-failure-stat-label">Final Attempt Timestamp</span>
              <span className="dispatcher-failure-stat-val">
                {formatTimestamp(failureDetails.attemptTimestamp)}
              </span>
            </div>
          </div>

          <div className="dispatcher-failure-stat">
            <RotateCcw size={16} style={{ color: '#dc2626', flexShrink: 0 }} aria-hidden="true" />
            <div className="dispatcher-failure-stat-info">
              <span className="dispatcher-failure-stat-label">Cumulative Attempts</span>
              <span className="dispatcher-failure-stat-val">
                {failureDetails.attemptsCount || deliveryAttempts} Attempts
              </span>
            </div>
          </div>
        </div>

        {/* Courier field notes */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            <FileWarning size={14} style={{ color: '#dc2626' }} aria-hidden="true" />
            <span>Courier Field Operational Notes</span>
          </div>
          <div className="dispatcher-failure-notes-box">
            "{failureDetails.courierNotes}"
          </div>
        </div>

        {/* Dispatcher Directives */}
        {deliveryNotes && (
          <div>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>
              System / Dispatcher Directives
            </span>
            <div style={{ padding: '0.65rem 0.85rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: '#475569' }}>
              {deliveryNotes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
