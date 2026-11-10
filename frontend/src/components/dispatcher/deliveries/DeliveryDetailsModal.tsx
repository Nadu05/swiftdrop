'use client';

import { X, Package, MapPin, Building, Calendar, AlertTriangle, Phone, ShieldCheck } from 'lucide-react';
import type { UnassignedDelivery } from './types';

interface DeliveryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: UnassignedDelivery | null;
  onAssignClick: (delivery: UnassignedDelivery) => void;
}

export default function DeliveryDetailsModal({
  isOpen,
  onClose,
  delivery,
  onAssignClick,
}: DeliveryDetailsModalProps) {
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
              <span className="dispatcher-modal-order-tag">{delivery.orderId}</span>
              <span
                className={`dispatcher-priority-badge dispatcher-priority-badge--${delivery.priority.toLowerCase()}`}
              >
                {delivery.priority === 'URGENT' && <AlertTriangle size={11} aria-hidden="true" />}
                {delivery.priority} Priority
              </span>
            </div>
            <h2 className="dispatcher-modal-title">Delivery Order Details</h2>
            <p className="dispatcher-modal-subtitle">
              Created on {formatDate(delivery.orderDate)}
            </p>
          </div>

          <button
            type="button"
            className="dispatcher-modal-close"
            onClick={onClose}
            aria-label="Close details dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="dispatcher-modal-body">
          {/* Section: Recipient & Destination (Safe masked view) */}
          <div className="dispatcher-modal-section">
            <div className="dispatcher-modal-section-title">
              <MapPin size={15} aria-hidden="true" />
              <span>Recipient &amp; Delivery Destination</span>
            </div>

            <div className="dispatcher-details-grid">
              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Recipient Name</span>
                <span className="dispatcher-details-value">{delivery.recipientName}</span>
              </div>
              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Contact (Masked)</span>
                <span className="dispatcher-details-value font-mono flex items-center gap-1">
                  <Phone size={13} className="text-slate-400" aria-hidden="true" />
                  {delivery.recipientPhone}
                </span>
              </div>
              <div className="dispatcher-details-field col-span-2">
                <span className="dispatcher-details-label">Delivery Address</span>
                <span className="dispatcher-details-value">{delivery.deliveryAddress}</span>
              </div>
            </div>
          </div>

          {/* Section: Merchant Information */}
          <div className="dispatcher-modal-section">
            <div className="dispatcher-modal-section-title">
              <Building size={15} aria-hidden="true" />
              <span>Merchant / Sender Origin</span>
            </div>

            <div className="dispatcher-details-grid">
              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Merchant Name</span>
                <span className="dispatcher-details-value">{delivery.merchantName}</span>
              </div>
              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Dispatch Contact</span>
                <span className="dispatcher-details-value">{delivery.merchantContact || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Section: Parcel Specifications */}
          <div className="dispatcher-modal-section">
            <div className="dispatcher-modal-section-title">
              <Package size={15} aria-hidden="true" />
              <span>Parcel Specifications</span>
            </div>

            <div className="dispatcher-details-grid">
              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Category / Type</span>
                <span className="dispatcher-details-value">{delivery.parcelInfo.packageType}</span>
              </div>
              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Weight</span>
                <span className="dispatcher-details-value">{delivery.parcelInfo.weightKg} kg</span>
              </div>
              {delivery.parcelInfo.dimensions && (
                <div className="dispatcher-details-field">
                  <span className="dispatcher-details-label">Dimensions</span>
                  <span className="dispatcher-details-value">{delivery.parcelInfo.dimensions}</span>
                </div>
              )}
              {delivery.parcelInfo.handlingNotes && (
                <div className="dispatcher-details-field col-span-2">
                  <span className="dispatcher-details-label">Handling Instructions</span>
                  <span className="dispatcher-details-value text-amber-700 bg-amber-50 p-2 rounded text-xs border border-amber-200">
                    {delivery.parcelInfo.handlingNotes}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="dispatcher-modal-footer">
          <button type="button" className="dispatcher-modal-btn-cancel" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="dispatcher-btn-primary"
            onClick={() => {
              onClose();
              onAssignClick(delivery);
            }}
          >
            <span>Proceed to Assign Courier</span>
          </button>
        </div>
      </div>
    </div>
  );
}

