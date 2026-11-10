'use client';

import { useEffect, useRef } from 'react';
import {
  X,
  MapPin,
  Store,
  User,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Slash,
} from 'lucide-react';
import type { DeliveryHistoryRecord, DeliveryHistoryStatus } from './types';
import ProofOfDelivery from './ProofOfDelivery';
import FailedDeliveryDetails from './FailedDeliveryDetails';
import DeliveryTimeline from './DeliveryTimeline';

interface DeliveryHistoryDetailsProps {
  record: DeliveryHistoryRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusBadgeConfig: Record<
  DeliveryHistoryStatus,
  { label: string; bg: string; text: string; dot: string; icon: typeof CheckCircle2 }
> = {
  DELIVERED: {
    label: 'Delivered',
    bg: '#f0fdf4',
    text: '#15803d',
    dot: '#22c55e',
    icon: CheckCircle2,
  },
  FAILED: {
    label: 'Failed',
    bg: '#fef2f2',
    text: '#dc2626',
    dot: '#ef4444',
    icon: XCircle,
  },
  RETURNED: {
    label: 'Returned to Merchant',
    bg: '#fffbeb',
    text: '#b45309',
    dot: '#f59e0b',
    icon: RotateCcw,
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: '#f1f5f9',
    text: '#475569',
    dot: '#64748b',
    icon: Slash,
  },
};

export default function DeliveryHistoryDetails({
  record,
  isOpen,
  onClose,
}: DeliveryHistoryDetailsProps) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Close on Escape & trap scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    closeBtnRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !record) return null;

  const statusInfo = statusBadgeConfig[record.status] || statusBadgeConfig.DELIVERED;
  const StatusIcon = statusInfo.icon;

  const formatTimestamp = (isoStr: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(isoStr));
    } catch {
      return isoStr;
    }
  };

  return (
    <div
      className="dispatcher-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delivery-history-details-title"
    >
      <div
        className="dispatcher-modal-content"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Modal Header */}
        <div className="dispatcher-modal-header">
          <div>
            <div className="dispatcher-modal-header-top" style={{ marginBottom: '0.4rem', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {record.orderId}
              </span>
              <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {record.trackingNumber}
              </span>
              <span
                className="dispatcher-status-badge"
                style={{ backgroundColor: statusInfo.bg, color: statusInfo.text }}
              >
                <StatusIcon size={12} strokeWidth={2.5} aria-hidden="true" />
                <span>{statusInfo.label}</span>
              </span>
            </div>
            <h2 id="delivery-history-details-title" className="dispatcher-modal-title">
              Delivery Investigation Details
            </h2>
            <p className="dispatcher-modal-subtitle">
              Completed at {formatTimestamp(record.completedAt)} • {record.deliveryAttempts} Delivery Attempt{record.deliveryAttempts > 1 ? 's' : ''}
            </p>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            className="dispatcher-modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="dispatcher-modal-body">
          {/* Section: Courier Information */}
          <div className="dispatcher-courier-hero-card">
            <div className="dispatcher-courier-hero-left">
              <div className="dispatcher-courier-hero-avatar">
                <User size={20} />
              </div>
              <div className="dispatcher-courier-hero-info">
                <span className="dispatcher-courier-hero-name">{record.courier.name}</span>
                <div className="dispatcher-courier-hero-meta">
                  <span className="font-mono font-semibold text-slate-700">ID: {record.courier.code}</span>
                  <span>•</span>
                  <span>Vehicle: {record.courier.vehiclePlate}</span>
                </div>
              </div>
            </div>

            <a
              href={`tel:${record.courier.phone}`}
              className="dispatcher-courier-phone-btn"
              title={`Call ${record.courier.name}`}
              style={{ padding: '0.45rem 0.75rem', gap: '0.4rem', borderRadius: 'var(--radius-sm)' }}
            >
              <Phone size={13} aria-hidden="true" />
              <span className="font-mono text-xs font-semibold">{record.courier.phone}</span>
            </a>
          </div>

          {/* Section: Recipient & Delivery Destination */}
          <div className="dispatcher-modal-section">
            <div className="dispatcher-modal-section-title">
              <MapPin size={15} aria-hidden="true" />
              <span>Recipient &amp; Delivery Destination</span>
            </div>

            <div className="dispatcher-details-grid">
              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Recipient Name</span>
                <span className="dispatcher-details-value font-semibold">
                  {record.recipient.name}
                </span>
              </div>

              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Contact Number</span>
                <span className="dispatcher-details-value font-mono">
                  {record.recipient.phone}
                </span>
              </div>

              <div className="dispatcher-details-field" style={{ gridColumn: 'span 2' }}>
                <span className="dispatcher-details-label">Destination Address</span>
                <span className="dispatcher-details-value font-medium text-slate-800">
                  {record.recipient.address}, {record.recipient.city}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Merchant Information */}
          <div className="dispatcher-modal-section">
            <div className="dispatcher-modal-section-title">
              <Store size={15} aria-hidden="true" />
              <span>Merchant &amp; Consignment Details</span>
            </div>

            <div className="dispatcher-details-grid">
              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Merchant Name</span>
                <span className="dispatcher-details-value">{record.merchant.name}</span>
              </div>

              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Merchant Contact</span>
                <span className="dispatcher-details-value font-mono">
                  {record.merchant.phone || 'N/A'}
                </span>
              </div>

              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Category / Weight</span>
                <span className="dispatcher-details-value">
                  {record.parcel.category} ({record.parcel.weight})
                </span>
              </div>

              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Priority Level</span>
                <span className="dispatcher-details-value font-semibold text-slate-800">
                  {record.priority}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Delivery Outcome Information */}
          <div className="dispatcher-modal-section">
            <div className="dispatcher-modal-section-title">
              <Calendar size={15} aria-hidden="true" />
              <span>Delivery Outcome Information</span>
            </div>

            <div className="dispatcher-details-grid">
              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Final Delivery Status</span>
                <span className="dispatcher-details-value font-bold text-slate-900">
                  {statusInfo.label}
                </span>
              </div>

              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Completed Timestamp</span>
                <span className="dispatcher-details-value">
                  {formatTimestamp(record.completedAt)}
                </span>
              </div>

              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Total Delivery Attempts</span>
                <span className="dispatcher-details-value font-bold text-slate-800">
                  {record.deliveryAttempts} Attempt{record.deliveryAttempts > 1 ? 's' : ''}
                </span>
              </div>

              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Delivery Notes</span>
                <span className="dispatcher-details-value italic text-slate-600">
                  {record.deliveryNotes || 'No additional delivery instructions noted.'}
                </span>
              </div>
            </div>
          </div>

          {/* Conditional: Proof of Delivery (For DELIVERED orders) */}
          {record.status === 'DELIVERED' && record.pod && (
            <ProofOfDelivery pod={record.pod} />
          )}

          {/* Conditional: Failed Delivery Investigation (For FAILED or RETURNED orders) */}
          {(record.status === 'FAILED' || record.status === 'RETURNED') && record.failureDetails && (
            <FailedDeliveryDetails
              failureDetails={record.failureDetails}
              deliveryNotes={record.deliveryNotes}
              deliveryAttempts={record.deliveryAttempts}
            />
          )}

          {/* Chronological Lifecycle Timeline */}
          {record.timeline && record.timeline.length > 0 && (
            <DeliveryTimeline timeline={record.timeline} />
          )}
        </div>
      </div>
    </div>
  );
}
