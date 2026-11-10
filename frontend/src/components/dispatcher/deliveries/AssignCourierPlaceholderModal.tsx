'use client';

import { X, UserPlus, Info, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { UnassignedDelivery } from './types';

interface AssignCourierPlaceholderModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: UnassignedDelivery | null;
}

export default function AssignCourierPlaceholderModal({
  isOpen,
  onClose,
  delivery,
}: AssignCourierPlaceholderModalProps) {
  if (!isOpen || !delivery) return null;

  return (
    <div className="dispatcher-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="dispatcher-modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dispatcher-modal-header">
          <div className="flex items-center gap-2">
            <div className="dispatcher-modal-icon-badge">
              <UserPlus size={20} className="text-blue-600" aria-hidden="true" />
            </div>
            <div>
              <h2 className="dispatcher-modal-title">Assign Courier</h2>
              <p className="dispatcher-modal-subtitle">
                Order: <strong>{delivery.orderId}</strong> • {delivery.city}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="dispatcher-modal-close"
            onClick={onClose}
            aria-label="Close assign courier dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="dispatcher-modal-body">
          {/* Order Quick Context */}
          <div className="dispatcher-modal-order-summary">
            <div className="dispatcher-modal-order-col">
              <span className="dispatcher-modal-label">Destination Address:</span>
              <span className="dispatcher-modal-value">{delivery.deliveryAddress}</span>
            </div>
            <div className="dispatcher-modal-order-col">
              <span className="dispatcher-modal-label">Package &amp; Weight:</span>
              <span className="dispatcher-modal-value">
                {delivery.parcelInfo.packageType} ({delivery.parcelInfo.weightKg} kg)
              </span>
            </div>
          </div>

          {/* Development Stage Notice (Clear structured placeholder - does not fake success) */}
          <div className="dispatcher-stage-notice">
            <div className="flex items-start gap-2.5">
              <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h4 className="dispatcher-stage-notice-title">
                  Courier Assignment Engine
                </h4>
                <p className="dispatcher-stage-notice-text">
                  This modal prepares the assignment flow. In the next development stage, this interface will load eligible active couriers filtered by destination zone, display real-time courier workload capacity, and submit assignments to the backend dispatch service.
                </p>
              </div>
            </div>

            <div className="dispatcher-stage-checklist">
              <span className="dispatcher-stage-item">✓ Delivery context loaded</span>
              <span className="dispatcher-stage-item">✓ Priority verified ({delivery.priority})</span>
              <span className="dispatcher-stage-item opacity-60">○ Courier fleet matching (Stage 05)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="dispatcher-modal-footer">
          <button type="button" className="dispatcher-modal-btn-cancel" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="dispatcher-btn-primary opacity-90 cursor-not-allowed"
            title="Assignment API submission will be enabled in Stage 05"
            disabled
          >
            <span>Assign Courier (Stage 05)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

