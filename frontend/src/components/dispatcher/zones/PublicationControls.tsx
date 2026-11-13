'use client';

import React, { useState } from 'react';
import { UploadCloud, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import type { PricingRule } from './types';
import { formatLKR } from './zonesPricingApi';

interface PublicationControlsProps {
  isOpen: boolean;
  onClose: () => void;
  rule: PricingRule | null;
  onConfirmPublish: (ruleId: string) => Promise<void>;
}

export default function PublicationControls({
  isOpen,
  onClose,
  rule,
  onConfirmPublish,
}: PublicationControlsProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !rule) return null;

  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      setError(null);
      await onConfirmPublish(rule.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to publish pricing rule.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="dispatcher-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="publish-modal-title">
      <div className="dispatcher-modal-content" style={{ maxWidth: 520 }}>
        {/* Header */}
        <div className="dispatcher-modal-header">
          <div className="dispatcher-modal-header__info">
            <h3 id="publish-modal-title" className="dispatcher-modal-title">
              Confirm Pricing Publication
            </h3>
            <p className="dispatcher-modal-subtitle">
              Publishing revision v{rule.version + 1} to live production calculations
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
        <div className="dispatcher-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div className="dispatcher-reports-alert dispatcher-reports-alert--error">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div
            style={{
              padding: '0.85rem 1rem',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 10,
              display: 'flex',
              gap: '0.75rem',
            }}
          >
            <AlertTriangle size={20} color="#b45309" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.8rem', color: '#92400e', lineHeight: 1.4 }}>
              <strong>Notice:</strong> Publishing will immediately activate this tariff schedule.
              Customer parcel bookings and dispatch quotations will compute charges based on this new configuration
              as of effective date <strong>{rule.effectiveDate}</strong>.
            </div>
          </div>

          {/* Rule Summary */}
          <div className="dispatcher-export-scope-card">
            <span className="dispatcher-export-scope-title">Pricing Specification:</span>
            <ul className="dispatcher-export-scope-list">
              <li>
                <strong>Rule:</strong> {rule.name} ({rule.ruleCode})
              </li>
              <li>
                <strong>Target Territory:</strong> {rule.zoneName || 'All Zones'}
              </li>
              <li>
                <strong>Base Delivery Tariff:</strong> {formatLKR(rule.baseFee)}
              </li>
              <li>
                <strong>Included Weight:</strong> Up to {rule.includedWeightKg} kg
              </li>
              <li>
                <strong>Excess Weight Rate:</strong> {formatLKR(rule.extraWeightSurchargePerKg)} per additional kg
              </li>
              <li>
                <strong>Distance Rate:</strong> {formatLKR(rule.distanceSurchargePerKm)} per km
              </li>
              <li>
                <strong>Zone Crossing Surcharge:</strong> +{formatLKR(rule.zoneSurcharge)}
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="dispatcher-modal-footer">
          <button
            type="button"
            className="dispatcher-overview__refresh-btn"
            onClick={onClose}
            disabled={isPublishing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="dispatcher-btn-primary"
            onClick={handlePublish}
            disabled={isPublishing}
          >
            <UploadCloud size={14} />
            <span>{isPublishing ? 'Publishing...' : 'Confirm & Publish'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

