'use client';

import { X, Building, MapPin, Bike, Car, Phone, FileText, CheckCircle2, History, AlertTriangle } from 'lucide-react';
import type { ActiveDeliveryRecord } from './types';

interface ActiveDeliveryDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: ActiveDeliveryRecord | null;
}

const statusBadgeClasses: Record<string, string> = {
  ASSIGNED: 'dispatcher-assignment-status--assigned',
  ACCEPTED: 'dispatcher-assignment-status--accepted',
  IN_TRANSIT: 'dispatcher-assignment-status--transit',
};

export default function ActiveDeliveryDetails({
  isOpen,
  onClose,
  delivery,
}: ActiveDeliveryDetailsProps) {
  if (!isOpen || !delivery) return null;

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="dispatcher-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="dispatcher-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dispatcher-modal-header">
          <div>
            <div className="dispatcher-modal-header-top">
              <span className="dispatcher-modal-order-tag">{delivery.trackingNumber}</span>
              <span className={`dispatcher-assignment-status ${statusBadgeClasses[delivery.deliveryStatus] || ''}`}>
                <span
                  className={`dispatcher-status-dot ${
                    delivery.deliveryStatus === 'IN_TRANSIT' ? 'dispatcher-status-dot--pulse' : ''
                  }`}
                  style={{
                    backgroundColor:
                      delivery.deliveryStatus === 'IN_TRANSIT'
                        ? '#0284c7'
                        : delivery.deliveryStatus === 'ACCEPTED'
                        ? '#2563eb'
                        : '#64748b',
                  }}
                  aria-hidden="true"
                />
                {delivery.deliveryStatus}
              </span>
            </div>
            <h2 className="dispatcher-modal-title">Active Delivery Information</h2>
            <p className="dispatcher-modal-subtitle">
              Order ID: <strong>{delivery.orderId}</strong> • Assigned on {formatDate(delivery.assignedDate)}
            </p>
          </div>

          <button
            type="button"
            className="dispatcher-modal-close"
            onClick={onClose}
            aria-label="Close active delivery details modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="dispatcher-modal-body" style={{ paddingBottom: '1.5rem' }}>
          {/* Section: Assigned Courier */}
          <div className="dispatcher-modal-section">
            <div className="dispatcher-modal-section-title">
              <span>Assigned Courier</span>
            </div>

            <div className="dispatcher-active-courier-box">
              <div className="dispatcher-active-courier-left">
                <div className="dispatcher-modal-courier-avatar">
                  {delivery.courier.vehicle === 'Van' ? <Car size={18} /> : <Bike size={18} />}
                </div>
                <div>
                  <div className="dispatcher-modal-courier-name-row">
                    <span className="dispatcher-modal-courier-name">{delivery.courier.name}</span>
                    <span className="dispatcher-modal-courier-code">({delivery.courier.code})</span>
                  </div>
                  <span className="dispatcher-modal-courier-zone">
                    Vehicle: {delivery.courier.vehicle} • Delivery Attempts: {delivery.deliveryAttempts}
                  </span>
                </div>
              </div>

              <a
                href={`tel:${delivery.courier.phone}`}
                className="dispatcher-btn-call"
                title={`Call ${delivery.courier.name}`}
              >
                <Phone size={13} aria-hidden="true" />
                <span>Call Courier</span>
              </a>
            </div>
          </div>

          {/* Section: Recipient & Destination */}
          <div className="dispatcher-modal-section">
            <div className="dispatcher-modal-section-title">
              <MapPin size={15} aria-hidden="true" />
              <span>Recipient &amp; Delivery Destination</span>
            </div>

            <div className="dispatcher-details-grid">
              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Recipient Name</span>
                <span className="dispatcher-details-value">{delivery.recipient.name}</span>
              </div>
              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Contact (Masked)</span>
                <span className="dispatcher-details-value font-mono flex items-center gap-1">
                  <Phone size={12} className="text-slate-400" />
                  {delivery.recipient.phone}
                </span>
              </div>
              <div className="dispatcher-details-field col-span-2">
                <span className="dispatcher-details-label">Delivery Address</span>
                <span className="dispatcher-details-value">{delivery.recipient.address}</span>
              </div>
              <div className="dispatcher-details-field col-span-2">
                <span className="dispatcher-details-label">Merchant / Sender</span>
                <span className="dispatcher-details-value flex items-center gap-1">
                  <Building size={13} className="text-slate-500" />
                  {delivery.merchantName}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Handling Notes */}
          {delivery.notes && (
            <div className="dispatcher-modal-section">
              <div className="dispatcher-modal-section-title">
                <FileText size={15} aria-hidden="true" />
                <span>Delivery Notes</span>
              </div>
              <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200">
                {delivery.notes}
              </div>
            </div>
          )}

          {/* Section: Status Timeline */}
          <div className="dispatcher-modal-section">
            <div className="dispatcher-modal-section-title">
              <History size={15} aria-hidden="true" />
              <span>Delivery Status Timeline ({delivery.history.length})</span>
            </div>

            <div className="dispatcher-assignment-history">
              {delivery.history.map((entry) => (
                <div key={entry.id} className="dispatcher-assignment-history-item">
                  <div className="dispatcher-assignment-history-dot" />
                  <div className="dispatcher-assignment-history-content">
                    <div className="dispatcher-assignment-history-header">
                      <span className="dispatcher-assignment-history-courier">
                        {entry.fromCourierName
                          ? `${entry.fromCourierName} ➔ ${entry.toCourierName}`
                          : `Assigned to ${entry.toCourierName}`}
                      </span>
                      <span className="dispatcher-assignment-history-time">
                        {formatDate(entry.timestamp)}
                      </span>
                    </div>
                    <span className="dispatcher-assignment-history-reason">
                      Note: <em>"{entry.reason}"</em>
                    </span>
                    <span className="dispatcher-assignment-history-by">
                      Logged by {entry.assignedBy}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

