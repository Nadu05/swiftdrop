'use client';

import React from 'react';
import { X, Edit2, Layers, DollarSign, Calendar, Clock, User, CheckCircle2 } from 'lucide-react';
import type { PricingRule } from './types';
import { formatLKR } from './zonesPricingApi';

interface PricingRuleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule: PricingRule | null;
  onEdit: (rule: PricingRule) => void;
}

export default function PricingRuleDetailsModal({
  isOpen,
  onClose,
  rule,
  onEdit,
}: PricingRuleDetailsModalProps) {
  if (!isOpen || !rule) return null;

  const isPublished = rule.status === 'PUBLISHED';
  const isDraft = rule.status === 'DRAFT';

  const handleEditClick = () => {
    onClose();
    onEdit(rule);
  };

  return (
    <div
      className="dispatcher-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pricing-details-modal-title"
    >
      <div className="dispatcher-modal-content" style={{ maxWidth: 620 }}>
        {/* Header */}
        <div className="dispatcher-modal-header">
          <div className="dispatcher-modal-header__info">
            <h3 id="pricing-details-modal-title" className="dispatcher-modal-title">
              Pricing Tariff Details
            </h3>
            <p className="dispatcher-modal-subtitle">
              Configured delivery charges, weight limits, and surcharge rates
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
        <div className="dispatcher-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Hero Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.15rem',
              background: '#f8fafc',
              border: '1px solid var(--ds-border)',
              borderRadius: 12,
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  {rule.name}
                </span>
                <span className="dispatcher-zone-code-badge">{rule.ruleCode}</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Territory Scope: <strong>{rule.zoneName || 'All Delivery Zones'}</strong> • Category: <strong>{rule.parcelSize}</strong>
              </span>
            </div>

            <span
              className="dispatcher-status-badge"
              style={{
                background: isPublished ? '#f0fdf4' : isDraft ? '#fffbeb' : '#f1f5f9',
                color: isPublished ? '#15803d' : isDraft ? '#b45309' : '#64748b',
                border: `1px solid ${isPublished ? '#bbf7d0' : isDraft ? '#fde68a' : '#e2e8f0'}`,
              }}
            >
              <span
                className="dispatcher-status-dot"
                style={{ background: isPublished ? '#16a34a' : isDraft ? '#f59e0b' : '#94a3b8' }}
              />
              {rule.status} (v{rule.version})
            </span>
          </div>

          {/* Core Tariff Rates Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div
              style={{
                padding: '0.85rem 1rem',
                background: '#ffffff',
                border: '1px solid var(--ds-border)',
                borderRadius: 10,
              }}
            >
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                Base Delivery Fee
              </div>
              <div style={{ marginTop: '0.25rem', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                {formatLKR(rule.baseFee)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                Includes up to {rule.includedWeightKg} kg parcel weight
              </div>
            </div>

            <div
              style={{
                padding: '0.85rem 1rem',
                background: '#ffffff',
                border: '1px solid var(--ds-border)',
                borderRadius: 10,
              }}
            >
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                Maximum Parcel Allowance
              </div>
              <div style={{ marginTop: '0.25rem', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                {rule.maxWeightKg} kg
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                Hard limit for dispatch assignment
              </div>
            </div>
          </div>

          {/* Surcharges Table Breakdown */}
          <div>
            <label className="dispatcher-reports-filter-label" style={{ marginBottom: '0.4rem' }}>
              Tariff Surcharge Structure
            </label>
            <div className="dispatcher-calculator-items-list">
              <div className="dispatcher-calculator-item-row">
                <span>Excess Weight Rate</span>
                <strong>+{formatLKR(rule.extraWeightSurchargePerKg)} per kg</strong>
              </div>
              <div className="dispatcher-calculator-item-row">
                <span>Distance Transit Rate</span>
                <strong>+{formatLKR(rule.distanceSurchargePerKm)} per km</strong>
              </div>
              <div className="dispatcher-calculator-item-row">
                <span>Inter-Zone Crossing Surcharge</span>
                <strong>+{formatLKR(rule.zoneSurcharge)} flat</strong>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              padding: '0.75rem 1rem',
              background: '#f8fafc',
              border: '1px solid var(--ds-border)',
              borderRadius: 10,
              fontSize: '0.75rem',
              color: '#64748b',
            }}
          >
            <div>
              Effective Date: <strong style={{ color: '#0f172a' }}>{rule.effectiveDate}</strong>
            </div>
            {rule.publishedAt && (
              <div>
                Published At: <strong style={{ color: '#0f172a' }}>{new Date(rule.publishedAt).toLocaleString()}</strong>
              </div>
            )}
            <div>
              Last Updated By: <strong style={{ color: '#0f172a' }}>{rule.updatedBy}</strong>
            </div>
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
          <button
            type="button"
            className="dispatcher-btn-primary"
            onClick={handleEditClick}
          >
            <Edit2 size={14} />
            <span>Edit Pricing Rule</span>
          </button>
        </div>
      </div>
    </div>
  );
}

