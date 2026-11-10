'use client';

import { ShieldCheck, FileText, Image as ImageIcon, CheckCircle, Smartphone } from 'lucide-react';
import type { DeliveryHistoryRecord } from './types';

interface ProofOfDeliveryProps {
  pod: NonNullable<DeliveryHistoryRecord['pod']>;
}

export default function ProofOfDelivery({ pod }: ProofOfDeliveryProps) {
  return (
    <div className="dispatcher-modal-section">
      <div className="dispatcher-modal-section-title">
        <ShieldCheck size={15} style={{ color: '#16a34a' }} aria-hidden="true" />
        <span style={{ color: '#166534', fontWeight: 700 }}>Proof of Delivery (POD) Verification</span>
      </div>

      <div className="dispatcher-pod-box">
        {/* Recipient & Reference Grid */}
        <div className="dispatcher-pod-grid">
          <div className="dispatcher-pod-field">
            <span className="dispatcher-pod-label">Received By</span>
            <span className="dispatcher-pod-val">{pod.recipientName}</span>
          </div>

          <div className="dispatcher-pod-field">
            <span className="dispatcher-pod-label">POD Reference Key</span>
            <span className="dispatcher-tracking-number" style={{ fontSize: '0.75rem', color: '#166534' }}>
              {pod.podReference}
            </span>
          </div>
        </div>

        {/* Confirmation Details Callout */}
        <div>
          <span className="dispatcher-pod-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
            Confirmation Details
          </span>
          <div className="dispatcher-pod-confirmation">
            {pod.podType === 'OTP' ? (
              <Smartphone size={16} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
            ) : pod.podType === 'SIGNATURE' ? (
              <FileText size={16} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
            ) : (
              <CheckCircle size={16} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
            )}
            <span>{pod.confirmationDetails}</span>
          </div>
        </div>

        {/* Photographic & Signature Attachments */}
        <div>
          <span className="dispatcher-pod-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
            Photographic &amp; Signature Attachments
          </span>
          {pod.photoUrl ? (
            <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid #bbf7d0', maxWidth: '320px' }}>
              <img
                src={pod.photoUrl}
                alt={`Proof of delivery photo for reference ${pod.podReference}`}
                style={{ width: '100%', height: 'auto', maxHeight: '180px', objectFit: 'cover' }}
              />
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 0.85rem',
                background: '#ffffff',
                border: '1px solid #bbf7d0',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                color: '#64748b',
              }}
            >
              <ImageIcon size={14} style={{ color: '#94a3b8' }} aria-hidden="true" />
              <span>
                No physical photograph attached. Authentication completed via {pod.podType} telemetry.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
