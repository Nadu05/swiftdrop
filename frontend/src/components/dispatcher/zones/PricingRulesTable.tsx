'use client';

import React from 'react';
import { Edit2, UploadCloud, Eye, Layers, Archive, CheckCircle2, Clock } from 'lucide-react';
import type { PricingRule } from './types';
import { formatLKR } from './zonesPricingApi';

interface PricingRulesTableProps {
  rules: PricingRule[];
  isLoading?: boolean;
  onEdit: (rule: PricingRule) => void;
  onPublishClick: (rule: PricingRule) => void;
  onViewDetails: (rule: PricingRule) => void;
  onDeactivate: (ruleId: string) => void;
}

export default function PricingRulesTable({
  rules,
  isLoading = false,
  onEdit,
  onPublishClick,
  onViewDetails,
  onDeactivate,
}: PricingRulesTableProps) {
  return (
    <article className="dispatcher-card" style={{ padding: '1.25rem' }}>
      <div className="dispatcher-card__header">
        <div>
          <h2 className="dispatcher-card__title">Configured Pricing Tariffs &amp; Rules</h2>
          <p className="dispatcher-card__subtitle">
            Base charges, weight allowances, and zone-crossing surcharges in Sri Lankan Rupees (LKR)
          </p>
        </div>
      </div>

      <div className="dispatcher-table-container">
        <table className="dispatcher-table">
          <thead>
            <tr>
              <th>Rule &amp; Territory</th>
              <th style={{ textAlign: 'right' }}>Base Fee</th>
              <th style={{ textAlign: 'right' }}>Weight Allowance</th>
              <th style={{ textAlign: 'right' }}>Extra Wt. Rate</th>
              <th style={{ textAlign: 'right' }}>Distance Rate</th>
              <th style={{ textAlign: 'right' }}>Zone Surcharge</th>
              <th>Status &amp; Version</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem' }}>
                  <div className="dispatcher-reports-skeleton-list">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="dispatcher-reports-skeleton-item" />
                    ))}
                  </div>
                </td>
              </tr>
            ) : rules.length === 0 ? (
              <tr>
                <td colSpan={8} className="dispatcher-table__empty">
                  <Layers size={32} style={{ margin: '0 auto 0.5rem', color: '#94a3b8' }} />
                  <p>No pricing rules configured.</p>
                </td>
              </tr>
            ) : (
              rules.map((rule) => {
                const isPublished = rule.status === 'PUBLISHED';
                const isDraft = rule.status === 'DRAFT';

                return (
                  <tr key={rule.id}>
                    {/* Rule & Territory */}
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{rule.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {rule.ruleCode} • {rule.zoneName || 'All Zones'} • Size: {rule.parcelSize}
                      </div>
                    </td>

                    {/* Base Fee */}
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {formatLKR(rule.baseFee)}
                    </td>

                    {/* Weight Allowance */}
                    <td style={{ textAlign: 'right', color: '#334155' }}>
                      Up to {rule.includedWeightKg} kg
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Max {rule.maxWeightKg} kg</div>
                    </td>

                    {/* Extra Weight Rate */}
                    <td style={{ textAlign: 'right', color: '#475569' }}>
                      {formatLKR(rule.extraWeightSurchargePerKg)}/kg
                    </td>

                    {/* Distance Rate */}
                    <td style={{ textAlign: 'right', color: '#475569' }}>
                      {formatLKR(rule.distanceSurchargePerKm)}/km
                    </td>

                    {/* Zone Surcharge */}
                    <td style={{ textAlign: 'right', color: '#475569' }}>
                      +{formatLKR(rule.zoneSurcharge)}
                    </td>

                    {/* Status & Version */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span
                          className="dispatcher-status-badge"
                          style={{
                            background: isPublished ? '#f0fdf4' : isDraft ? '#fffbeb' : '#f1f5f9',
                            color: isPublished ? '#15803d' : isDraft ? '#b45309' : '#64748b',
                            border: `1px solid ${isPublished ? '#bbf7d0' : isDraft ? '#fde68a' : '#e2e8f0'}`,
                          }}
                        >
                          {isPublished ? (
                            <CheckCircle2 size={12} />
                          ) : isDraft ? (
                            <Clock size={12} />
                          ) : (
                            <Archive size={12} />
                          )}
                          {rule.status} (v{rule.version})
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          Eff: {rule.effectiveDate}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="dispatcher-zone-action-btn"
                          onClick={() => onViewDetails(rule)}
                          title="View Rule Details"
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          type="button"
                          className="dispatcher-zone-action-btn"
                          onClick={() => onEdit(rule)}
                          title="Edit Pricing Rule"
                        >
                          <Edit2 size={14} />
                        </button>

                        {isDraft && (
                          <button
                            type="button"
                            className="dispatcher-zone-action-btn dispatcher-zone-action-btn--publish"
                            onClick={() => onPublishClick(rule)}
                            title="Publish Rule to Production"
                          >
                            <UploadCloud size={14} />
                          </button>
                        )}

                        {isPublished && (
                          <button
                            type="button"
                            className="dispatcher-zone-action-btn dispatcher-zone-action-btn--deactivate"
                            onClick={() => onDeactivate(rule.id)}
                            title="Archive / Deactivate Rule"
                          >
                            <Archive size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

