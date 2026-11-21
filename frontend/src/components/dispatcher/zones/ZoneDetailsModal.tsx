'use client';

import React from 'react';
import { X, Edit2, MapPin, Building2, Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { DeliveryZone } from './types';

interface ZoneDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone: DeliveryZone | null;
  onEdit: (zone: DeliveryZone) => void;
}

export default function ZoneDetailsModal({
  isOpen,
  onClose,
  zone,
  onEdit,
}: ZoneDetailsModalProps) {
  if (!isOpen || !zone) return null;

  const isActive = zone.status === 'ACTIVE';

  const handleEditClick = () => {
    onClose();
    onEdit(zone);
  };

  return (
    <div
      className="dispatcher-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="zone-details-modal-title"
    >
      <div className="dispatcher-modal-content" style={{ maxWidth: 580 }}>
        {/* Header */}
        <div className="dispatcher-modal-header">
          <div className="dispatcher-modal-header__info">
            <h3 id="zone-details-modal-title" className="dispatcher-modal-title">
              Delivery Zone Details
            </h3>
            <p className="dispatcher-modal-subtitle">
              Operational specifications, coverage areas, and associated dispatch hub
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
          {/* Top Hero Card */}
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
                  {zone.name}
                </span>
                <span className="dispatcher-zone-code-badge">{zone.code}</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Internal Zone Identifier: <strong>{zone.id}</strong>
              </span>
            </div>

            <span
              className="dispatcher-status-badge"
              style={{
                background: isActive ? '#f0fdf4' : '#f8fafc',
                color: isActive ? '#15803d' : '#64748b',
                border: `1px solid ${isActive ? '#bbf7d0' : '#e2e8f0'}`,
              }}
            >
              <span
                className="dispatcher-status-dot"
                style={{ background: isActive ? '#16a34a' : '#94a3b8' }}
              />
              {zone.status}
            </span>
          </div>

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div
              style={{
                padding: '0.85rem 1rem',
                background: '#ffffff',
                border: '1px solid var(--ds-border)',
                borderRadius: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                <Building2 size={13} color="#2563eb" />
                <span>Associated Dispatch Branch</span>
              </div>
              <div style={{ marginTop: '0.35rem', fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                {zone.branchName}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                Branch Reference ID: #{zone.branchId}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                <MapPin size={13} color="#0d9488" />
                <span>Territory Coverage Count</span>
              </div>
              <div style={{ marginTop: '0.35rem', fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                {zone.coverageAreas.length} Designated Suburbs
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                Active courier routes mapped
              </div>
            </div>
          </div>

          {/* Coverage Areas Tag List */}
          <div>
            <label className="dispatcher-reports-filter-label" style={{ marginBottom: '0.5rem' }}>
              Suburbs &amp; Coverage Areas
            </label>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.45rem',
                padding: '0.85rem 1rem',
                background: '#ffffff',
                border: '1px solid var(--ds-border)',
                borderRadius: 10,
              }}
            >
              {zone.coverageAreas.map((area, idx) => (
                <span
                  key={idx}
                  className="dispatcher-zone-area-tag"
                  style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem' }}
                >
                  <MapPin size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle', color: '#2563eb' }} />
                  {area}
                </span>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="dispatcher-reports-filter-label" style={{ marginBottom: '0.4rem' }}>
              Operational Logistics Notes
            </label>
            <div
              style={{
                padding: '0.85rem 1rem',
                background: '#f8fafc',
                border: '1px solid var(--ds-border)',
                borderRadius: 10,
                fontSize: '0.8125rem',
                color: zone.description ? '#334155' : '#94a3b8',
                lineHeight: 1.5,
              }}
            >
              {zone.description || 'No operational logistics notes recorded for this zone.'}
            </div>
          </div>

          {/* Timestamps */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '0.75rem',
              borderTop: '1px solid #f1f5f9',
              fontSize: '0.72rem',
              color: '#94a3b8',
            }}
          >
            <span>Created: {new Date(zone.createdAt).toLocaleString()}</span>
            <span>Last Updated: {new Date(zone.updatedAt).toLocaleString()}</span>
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
            <span>Edit Zone</span>
          </button>
        </div>
      </div>
    </div>
  );
}

