'use client';

import React, { useState } from 'react';
import { History, RotateCcw, X, CheckCircle2, Archive, AlertCircle } from 'lucide-react';
import type { PricingVersionRecord } from './types';
import { formatLKR } from './zonesPricingApi';

interface PricingVersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  history: PricingVersionRecord[];
  onRollback: (ruleId: string, version: number) => Promise<void>;
  isLoading?: boolean;
}

export default function PricingVersionHistory({
  isOpen,
  onClose,
  history,
  onRollback,
  isLoading = false,
}: PricingVersionHistoryProps) {
  const [selectedRollback, setSelectedRollback] = useState<PricingVersionRecord | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRollbackConfirm = async () => {
    if (!selectedRollback) return;
    try {
      setIsRollingBack(true);
      await onRollback(selectedRollback.ruleId, selectedRollback.version);
      setFeedback(`Successfully restored tariff parameters from version v${selectedRollback.version} as a reviewable draft.`);
      setSelectedRollback(null);
    } catch (err: any) {
      setFeedback(err?.message || 'Rollback failed.');
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <div className="dispatcher-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="version-history-title">
      <div className="dispatcher-modal-content" style={{ maxWidth: 820 }}>
        {/* Header */}
        <div className="dispatcher-modal-header">
          <div className="dispatcher-modal-header__info">
            <h3 id="version-history-title" className="dispatcher-modal-title">
              Pricing Tariff Version Audit Log
            </h3>
            <p className="dispatcher-modal-subtitle">
              Audit trail of published pricing changes, historical effective dates, and rollback checkpoints
            </p>
          </div>
          <button
            type="button"
            className="dispatcher-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="dispatcher-modal-body">
          {feedback && (
            <div className="dispatcher-reports-alert dispatcher-reports-alert--success" style={{ marginBottom: '1rem' }}>
              <CheckCircle2 size={16} />
              <span>{feedback}</span>
            </div>
          )}

          {/* Rollback Confirmation Banner */}
          {selectedRollback && (
            <div
              style={{
                marginBottom: '1.25rem',
                padding: '0.85rem 1rem',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div>
                <strong style={{ color: '#1e3a8a', fontSize: '0.85rem' }}>
                  Roll back {selectedRollback.ruleName} to v{selectedRollback.version}?
                </strong>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#1e40af' }}>
                  Base fee will revert to {formatLKR(selectedRollback.baseFee)} as a new draft revision for review.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="dispatcher-overview__refresh-btn"
                  onClick={() => setSelectedRollback(null)}
                  disabled={isRollingBack}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="dispatcher-btn-primary"
                  onClick={handleRollbackConfirm}
                  disabled={isRollingBack}
                >
                  <RotateCcw size={13} />
                  <span>{isRollingBack ? 'Restoring...' : 'Confirm Rollback'}</span>
                </button>
              </div>
            </div>
          )}

          <div className="dispatcher-table-container">
            <table className="dispatcher-table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Rule Name</th>
                  <th>Base &amp; Rates</th>
                  <th>Effective Date</th>
                  <th>Published</th>
                  <th>Updated By</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                      Loading audit records...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="dispatcher-table__empty">
                      <History size={28} style={{ margin: '0 auto 0.5rem', color: '#94a3b8' }} />
                      <p>No historical versions recorded yet.</p>
                    </td>
                  </tr>
                ) : (
                  history.map((record) => {
                    const isArchived = record.status === 'ARCHIVED';
                    return (
                      <tr key={record.id}>
                        <td>
                          <span
                            className="dispatcher-status-badge"
                            style={{
                              background: isArchived ? '#f8fafc' : '#f0fdf4',
                              color: isArchived ? '#64748b' : '#15803d',
                              border: `1px solid ${isArchived ? '#e2e8f0' : '#bbf7d0'}`,
                            }}
                          >
                            v{record.version}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{record.ruleName}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{record.ruleCode}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{formatLKR(record.baseFee)}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            +{formatLKR(record.distanceSurchargePerKm)}/km • +{formatLKR(record.extraWeightSurchargePerKg)}/kg
                          </div>
                        </td>
                        <td style={{ fontSize: '0.78rem' }}>{record.effectiveDate}</td>
                        <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {record.publishedDate ? new Date(record.publishedDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: '#475569' }}>{record.updatedBy}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="dispatcher-zone-action-btn"
                            onClick={() => setSelectedRollback(record)}
                            title={`Rollback to v${record.version}`}
                          >
                            <RotateCcw size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="dispatcher-modal-footer">
          <button
            type="button"
            className="dispatcher-overview__refresh-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

