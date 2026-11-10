'use client';

import { X, Building, MapPin, Bike, Car, Phone, Clock, FileText, CheckCircle2, AlertTriangle, History } from 'lucide-react';
import type { AssignmentRecord } from './types';

interface AssignmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: AssignmentRecord | null;
  onReassignClick: (assignment: AssignmentRecord) => void;
}

const statusBadgeClasses: Record<string, string> = {
  ASSIGNED: 'dispatcher-assignment-status--assigned',
  ACCEPTED: 'dispatcher-assignment-status--accepted',
  IN_TRANSIT: 'dispatcher-assignment-status--transit',
  DELIVERED: 'dispatcher-assignment-status--delivered',
  REASSIGNED: 'dispatcher-assignment-status--reassigned',
  FAILED: 'dispatcher-assignment-status--failed',
};

export default function AssignmentDetailsModal({
  isOpen,
  onClose,
  assignment,
  onReassignClick,
}: AssignmentDetailsModalProps) {
  if (!isOpen || !assignment) return null;

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

  const isDelivered = assignment.deliveryStatus === 'DELIVERED';

  return (
    <div className="dispatcher-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="dispatcher-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dispatcher-modal-header">
          <div>
            <div className="dispatcher-modal-header-top">
              <span className="dispatcher-modal-order-tag">{assignment.assignmentId}</span>
              <span className={`dispatcher-assignment-status ${statusBadgeClasses[assignment.deliveryStatus] || ''}`}>
                {assignment.deliveryStatus}
              </span>
            </div>
            <h2 className="dispatcher-modal-title">Assignment &amp; Dispatch Details</h2>
            <p className="dispatcher-modal-subtitle">
              Order ID: <strong>{assignment.orderId}</strong> • Assigned on {formatDate(assignment.assignedDate)}
            </p>
          </div>

          <button
            type="button"
            className="dispatcher-modal-close"
            onClick={onClose}
            aria-label="Close assignment details modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="dispatcher-modal-body">
          {/* Section: Assigned Courier */}
          <div className="dispatcher-modal-section">
            <div className="dispatcher-modal-section-title">
              <span>Assigned Courier Information</span>
            </div>

            <div className="dispatcher-active-courier-box">
              <div className="dispatcher-active-courier-left">
                <div className="dispatcher-modal-courier-avatar">
                  {assignment.courier.vehicle === 'Van' ? <Car size={18} /> : <Bike size={18} />}
                </div>
                <div>
                  <div className="dispatcher-modal-courier-name-row">
                    <span className="dispatcher-modal-courier-name">{assignment.courier.name}</span>
                    <span className="dispatcher-modal-courier-code">({assignment.courier.code})</span>
                  </div>
                  <span className="dispatcher-modal-courier-zone">
                    Vehicle: {assignment.courier.vehicle} • Delivery Attempts: {assignment.deliveryAttempts}
                  </span>
                </div>
              </div>

              <a
                href={`tel:${assignment.courier.phone}`}
                className="dispatcher-btn-call"
                title={`Call ${assignment.courier.name}`}
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
                <span className="dispatcher-details-label">Recipient</span>
                <span className="dispatcher-details-value">{assignment.recipient.name}</span>
              </div>
              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Contact (Masked)</span>
                <span className="dispatcher-details-value font-mono flex items-center gap-1">
                  <Phone size={12} className="text-slate-400" />
                  {assignment.recipient.phone}
                </span>
              </div>
              <div className="dispatcher-details-field col-span-2">
                <span className="dispatcher-details-label">Address</span>
                <span className="dispatcher-details-value">{assignment.recipient.address}</span>
              </div>
              <div className="dispatcher-details-field col-span-2">
                <span className="dispatcher-details-label">Merchant / Sender</span>
                <span className="dispatcher-details-value flex items-center gap-1">
                  <Building size={13} className="text-slate-500" />
                  {assignment.merchantName}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Notes */}
          {assignment.notes && (
            <div className="dispatcher-modal-section">
              <div className="dispatcher-modal-section-title">
                <FileText size={15} aria-hidden="true" />
                <span>Handling Notes</span>
              </div>
              <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200">
                {assignment.notes}
              </div>
            </div>
          )}

          {/* Section: Assignment & Reassignment Audit History */}
          <div className="dispatcher-modal-section">
            <div className="dispatcher-modal-section-title">
              <History size={15} aria-hidden="true" />
              <span>Assignment Audit History ({assignment.history.length})</span>
            </div>

            <div className="dispatcher-assignment-history">
              {assignment.history.map((entry) => (
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
                      Reason: <em>"{entry.reason}"</em>
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

        {/* Modal Footer */}
        <div className="dispatcher-modal-footer">
          <button
            type="button"
            className="dispatcher-btn-primary"
            disabled={isDelivered}
            onClick={() => {
              onClose();
              onReassignClick(assignment);
            }}
            title={isDelivered ? 'Cannot reassign completed delivery' : 'Reassign to another courier'}
          >
            {isDelivered ? 'Delivery Completed (Closed)' : 'Reassign Courier'}
          </button>
        </div>
      </div>
    </div>
  );
}

