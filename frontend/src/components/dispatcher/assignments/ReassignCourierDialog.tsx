'use client';

import { useState, useEffect } from 'react';
import { X, RotateCcw, AlertCircle, ArrowRight, UserCheck, AlertTriangle } from 'lucide-react';
import type { AssignmentRecord, ReassignCourierPayload } from './types';
import CourierSelectionCard from '../deliveries/CourierSelectionCard';
import { getCourierAvailability } from '../deliveries/assignmentService';
import type { CourierAvailability, UnassignedDelivery } from '../deliveries/types';
import { toDispatchError, type DispatchApiError } from '../deliveries/dispatchErrors';
import { reassignCourier } from './assignmentsApi';

interface ReassignCourierDialogProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: AssignmentRecord | null;
  onSuccess: (updated: AssignmentRecord) => void;
}

type ReassignStep = 'form' | 'confirm';

export default function ReassignCourierDialog({
  isOpen,
  onClose,
  assignment,
  onSuccess,
}: ReassignCourierDialogProps) {
  const [reason, setReason] = useState('');
  const [couriers, setCouriers] = useState<CourierAvailability[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
  const [isLoadingCouriers, setIsLoadingCouriers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<DispatchApiError | null>(null);
  const [step, setStep] = useState<ReassignStep>('form');

  useEffect(() => {
    if (!isOpen || !assignment) {
      setReason('');
      setSelectedCourierId(null);
      setCouriers([]);
      setError(null);
      setStep('form');
      return;
    }

    setReason('');
    setSelectedCourierId(null);
    setError(null);
    setStep('form');

    // Create a mock delivery envelope to fetch availability for the destination
    const deliveryEnvelope: UnassignedDelivery = {
      orderId: assignment.orderId,
      recipientName: assignment.recipient.name,
      recipientPhone: assignment.recipient.phone,
      deliveryAddress: assignment.recipient.address,
      city: assignment.recipient.city,
      merchantName: assignment.merchantName,
      orderDate: assignment.assignedDate,
      priority: assignment.priority,
      parcelInfo: { weightKg: 1.5, packageType: 'Parcel' },
    };

    setIsLoadingCouriers(true);
    getCourierAvailability(deliveryEnvelope)
      .then((list) => {
        // Enforce rule: Mark current courier as ineligible for reassignment to avoid circular allocation
        const adjustedList = list.map((c) => {
          if (c.id === assignment.courier.id) {
            return {
              ...c,
              isEligible: false,
              ineligibilityReason: 'Currently assigned courier',
            };
          }
          return c;
        });
        setCouriers(adjustedList);
      })
      .catch((err) => {
        setError(toDispatchError(err));
      })
      .finally(() => {
        setIsLoadingCouriers(false);
      });
  }, [isOpen, assignment]);

  if (!isOpen || !assignment) return null;

  const selectedCourier = couriers.find((c) => c.id === selectedCourierId) ?? null;

  const handleSelectCourier = (courier: CourierAvailability) => {
    if (!courier.isEligible || courier.status !== 'AVAILABLE') return;
    if (courier.id === assignment.courier.id) return;
    setSelectedCourierId((curr) => (curr === courier.id ? null : courier.id));
    setError(null);
  };

  const handleProceedToConfirm = () => {
    if (!reason.trim()) {
      setError(toDispatchError(new Error('A valid reassignment reason is mandatory.')));
      return;
    }
    if (!selectedCourier) {
      setError(toDispatchError(new Error('Please select an eligible replacement courier.')));
      return;
    }
    setError(null);
    setStep('confirm');
  };

  const handleConfirmReassignment = async () => {
    if (!selectedCourier || !reason.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const payload: ReassignCourierPayload = {
      assignmentId: assignment.assignmentId,
      orderId: assignment.orderId,
      currentCourierId: assignment.courier.id,
      newCourierId: selectedCourier.id,
      reason: reason.trim(),
    };

    try {
      const updated = await reassignCourier(payload, {
        id: selectedCourier.id,
        code: selectedCourier.courierCode,
        name: selectedCourier.name,
        phone: '+94 77 000 0000',
        vehicle: 'Motorcycle',
      });
      onSuccess(updated);
      onClose();
    } catch (err) {
      setError(toDispatchError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dispatcher-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="dispatcher-modal-content dispatcher-assign-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="dispatcher-modal-header">
          <div>
            <div className="dispatcher-modal-header-top">
              <span className="dispatcher-modal-order-tag">{assignment.assignmentId}</span>
              <span className="dispatcher-reassign-badge">Reassignment</span>
            </div>
            <h2 className="dispatcher-modal-title">Reassign Delivery to New Courier</h2>
            <p className="dispatcher-modal-subtitle">
              Order: <strong>{assignment.orderId}</strong> • Currently assigned to {assignment.courier.name}
            </p>
          </div>

          <button
            type="button"
            className="dispatcher-modal-close"
            onClick={onClose}
            aria-label="Close reassignment modal"
            disabled={isSubmitting}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="dispatcher-alert dispatcher-alert--error" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <div className="dispatcher-alert__content">
              <span className="dispatcher-alert__title">Reassignment Error</span>
              <span className="dispatcher-alert__message">{error.message}</span>
            </div>
          </div>
        )}

        {step === 'form' ? (
          <>
            <div className="dispatcher-modal-body" style={{ gap: '1rem' }}>
              {/* Mandatory Reason Input */}
              <div className="dispatcher-reassign-reason-box">
                <label htmlFor="reassign-reason" className="dispatcher-reassign-reason-label">
                  Reassignment Reason <span className="text-red-500">* (Mandatory)</span>
                </label>
                <textarea
                  id="reassign-reason"
                  rows={2}
                  className="dispatcher-reassign-textarea"
                  placeholder="e.g. Courier vehicle breakdown, route congestion, or courier personal emergency..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {/* Courier Selection List */}
              <div className="dispatcher-modal-section">
                <div className="dispatcher-modal-section-title">
                  <span>Select Replacement Courier for {assignment.recipient.city}</span>
                </div>

                <div className="dispatcher-assign-dialog__courier-grid" style={{ padding: 0 }}>
                  {isLoadingCouriers ? (
                    <div className="dispatcher-assign-dialog__loading">
                      <span className="dispatcher-spinner" aria-hidden="true" />
                      <span>Loading available couriers...</span>
                    </div>
                  ) : (
                    couriers.map((c) => (
                      <CourierSelectionCard
                        key={c.id}
                        courier={c}
                        isSelected={c.id === selectedCourierId}
                        onSelect={handleSelectCourier}
                        disabled={isSubmitting || c.id === assignment.courier.id}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="dispatcher-modal-footer">
              <button
                type="button"
                className="dispatcher-modal-btn-cancel"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dispatcher-btn-primary"
                disabled={!selectedCourierId || !reason.trim() || isSubmitting}
                onClick={handleProceedToConfirm}
              >
                <RotateCcw size={15} aria-hidden="true" />
                <span>Review Reassignment</span>
              </button>
            </div>
          </>
        ) : (
          /* Step 2: Confirmation */
          selectedCourier && (
            <div className="dispatcher-confirmation">
              <div className="dispatcher-confirmation__banner">
                <RotateCcw size={18} aria-hidden="true" />
                <div className="dispatcher-confirmation__banner-text">
                  <span className="dispatcher-confirmation__banner-title">
                    Confirm Courier Reassignment
                  </span>
                  <span className="dispatcher-confirmation__banner-subtitle">
                    Please review this transfer. The new courier will receive an active dispatch notification.
                  </span>
                </div>
              </div>

              <div className="dispatcher-confirmation__summary">
                <div className="dispatcher-confirmation__side">
                  <span className="dispatcher-confirmation__side-title">Current Courier</span>
                  <span className="dispatcher-confirmation__courier-name">
                    {assignment.courier.name}
                  </span>
                  <span className="dispatcher-confirmation__courier-code">
                    {assignment.courier.code}
                  </span>
                  <div className="dispatcher-confirmation__detail text-amber-700">
                    <span>Releasing from delivery</span>
                  </div>
                </div>

                <div className="dispatcher-confirmation__arrow" aria-hidden="true">
                  <ArrowRight size={20} />
                </div>

                <div className="dispatcher-confirmation__side">
                  <span className="dispatcher-confirmation__side-title">New Replacement</span>
                  <span className="dispatcher-confirmation__courier-name">
                    {selectedCourier.name}
                  </span>
                  <span className="dispatcher-confirmation__courier-code">
                    {selectedCourier.courierCode}
                  </span>
                  <div className="dispatcher-confirmation__detail text-emerald-700">
                    <span>
                      Workload: <strong>{selectedCourier.activeDeliveries + 1}/{selectedCourier.maxCapacity}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-6 py-2">
                <span className="text-xs text-slate-500 font-semibold uppercase">Reason for Audit:</span>
                <p className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-200 mt-1">
                  "{reason}"
                </p>
              </div>

              <div className="dispatcher-modal-footer">
                <button
                  type="button"
                  className="dispatcher-modal-btn-cancel"
                  onClick={() => setStep('form')}
                  disabled={isSubmitting}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="dispatcher-btn-primary"
                  disabled={isSubmitting}
                  onClick={handleConfirmReassignment}
                >
                  {isSubmitting ? (
                    <>
                      <span className="dispatcher-spinner" aria-hidden="true" />
                      <span>Reassigning...</span>
                    </>
                  ) : (
                    <span>Confirm Reassignment</span>
                  )}
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

