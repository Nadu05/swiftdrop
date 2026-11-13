'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, RefreshCw, UserCheck, X } from 'lucide-react';
import {
  getCourierAvailability,
  isMockMode,
  submitAssignment,
} from './assignmentService';
import AssignmentConfirmation from './AssignmentConfirmation';
import CourierSelectionCard from './CourierSelectionCard';
import { isCourierSelectable } from './courierUtils';
import { toDispatchError, type DispatchApiError } from './dispatchErrors';
import {
  MOCK_ASSIGNMENT_SCENARIOS,
  type MockAssignmentScenario,
} from './mockDispatchStore';
import type { CourierAvailability, UnassignedDelivery } from './types';

export interface AssignCourierDialogProps {
  isOpen: boolean;
  order: UnassignedDelivery | null;
  onClose: () => void;
  onSuccess: (result: { order: UnassignedDelivery; courier: CourierAvailability }) => void;
}

type DialogStep = 'select' | 'confirm';

export default function AssignCourierDialog({
  isOpen,
  order,
  onClose,
  onSuccess,
}: AssignCourierDialogProps) {
  const [couriers, setCouriers] = useState<CourierAvailability[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
  const [step, setStep] = useState<DialogStep>('select');
  const [isLoadingCouriers, setIsLoadingCouriers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<DispatchApiError | null>(null);
  const [mockScenario, setMockScenario] = useState<MockAssignmentScenario>('success');

  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const loadCouriers = useCallback(async (targetOrder: UnassignedDelivery) => {
    setIsLoadingCouriers(true);
    setError(null);
    try {
      const list = await getCourierAvailability(targetOrder);
      setCouriers(list);
    } catch (err) {
      setError(toDispatchError(err));
    } finally {
      setIsLoadingCouriers(false);
    }
  }, []);

  // Reset state whenever a different order is opened.
  useEffect(() => {
    if (!isOpen || !order) {
      setCouriers([]);
      setSelectedCourierId(null);
      setStep('select');
      setError(null);
      return;
    }
    setSelectedCourierId(null);
    setStep('select');
    setError(null);
    loadCouriers(order);
  }, [isOpen, order, loadCouriers]);

  // Focus the close button on open.
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  // Escape closes the dialog, unless a submission is in flight.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !order) return null;

  const selectedCourier =
    couriers.find((c) => c.id === selectedCourierId) ?? null;

  const eligibleCount = couriers.filter((c) => isCourierSelectable(c)).length;

  const handleSelectCourier = (courier: CourierAvailability) => {
    if (!isCourierSelectable(courier)) return;
    setSelectedCourierId((current) => (current === courier.id ? null : courier.id));
    setError(null);
  };

  const handleProceedToConfirm = () => {
    if (!selectedCourier || !isCourierSelectable(selectedCourier)) return;
    setStep('confirm');
  };

  const handleBackToSelect = () => {
    setStep('select');
  };

  const handleConfirmAssignment = async () => {
    if (!selectedCourier || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await submitAssignment(
        { orderId: order.orderId, courierId: selectedCourier.id },
        { mockScenario },
      );
      onSuccess({ order, courier: selectedCourier });
      onClose();
    } catch (err) {
      // Keep the dialog open and show the error.
      const dispatchErr = toDispatchError(err);
      setError(dispatchErr);

      // If the failure was a conflict or the courier became unavailable,
      // refresh the availability list in the background and return to selection.
      if (
        dispatchErr.kind === 'conflict' ||
        dispatchErr.kind === 'courier_unavailable'
      ) {
        setStep('select');
        setSelectedCourierId(null);
        loadCouriers(order);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="dispatcher-modal-overlay"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div
        className="dispatcher-modal-content dispatcher-assign-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dispatcher-modal-header">
          <div>
            <div className="dispatcher-modal-header-top">
              <span className="dispatcher-modal-order-tag">{order.orderId}</span>
              <span
                className={`dispatcher-priority-badge dispatcher-priority-badge--${order.priority.toLowerCase()}`}
              >
                {order.priority === 'URGENT' && <AlertTriangle size={11} aria-hidden="true" />}
                {order.priority}
              </span>
            </div>
            <h2 id={titleId} className="dispatcher-modal-title">
              Assign Courier
            </h2>
            <p id={descriptionId} className="dispatcher-modal-subtitle">
              Select an eligible courier to dispatch this delivery.
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            disabled={isSubmitting}
            className="dispatcher-modal-close"
            onClick={onClose}
            aria-label="Close assign courier dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Selected delivery summary strip */}
        <div className="dispatcher-assign-dialog__order-strip">
          <div className="dispatcher-assign-dialog__order-item">
            <span className="dispatcher-assign-dialog__order-label">Recipient</span>
            <span className="dispatcher-assign-dialog__order-value">{order.recipientName}</span>
          </div>
          <div className="dispatcher-assign-dialog__order-item">
            <span className="dispatcher-assign-dialog__order-label">Destination</span>
            <span className="dispatcher-assign-dialog__order-value">
              {order.deliveryAddress} ({order.city})
            </span>
          </div>
          <div className="dispatcher-assign-dialog__order-item">
            <span className="dispatcher-assign-dialog__order-label">Merchant</span>
            <span className="dispatcher-assign-dialog__order-value">{order.merchantName}</span>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="dispatcher-alert dispatcher-alert--error" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <div className="dispatcher-alert__content">
              <span className="dispatcher-alert__title">Assignment failed</span>
              <span className="dispatcher-alert__message">{error.message}</span>
            </div>
          </div>
        )}

        {/* Mock scenario picker: lets the user test error handling without backend changes */}
        {isMockMode && (
          <div className="dispatcher-scenario-picker">
            <span className="dispatcher-scenario-picker__label">
              Mock response simulation:
            </span>
            <select
              value={mockScenario}
              onChange={(e) => setMockScenario(e.target.value as MockAssignmentScenario)}
              className="dispatcher-select"
              aria-label="Simulate backend response for testing"
            >
              {MOCK_ASSIGNMENT_SCENARIOS.map((sc) => (
                <option key={sc.value} value={sc.value}>
                  {sc.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Step: Selection vs Confirmation */}
        {step === 'select' ? (
          <>
            <div className="dispatcher-assign-dialog__toolbar">
              <span className="dispatcher-assign-dialog__count">
                Available couriers for {order.city}: <strong>{eligibleCount}</strong>
              </span>

              <button
                type="button"
                disabled={isLoadingCouriers || isSubmitting}
                className="dispatcher-action-btn-secondary"
                onClick={() => loadCouriers(order)}
                title="Refresh courier availability"
              >
                <RefreshCw
                  size={13}
                  className={isLoadingCouriers ? 'dispatcher-overview__refresh-icon--spinning' : ''}
                  aria-hidden="true"
                />
                <span>Refresh Fleet</span>
              </button>
            </div>

            <div className="dispatcher-modal-body dispatcher-assign-dialog__courier-grid">
              {isLoadingCouriers ? (
                <div className="dispatcher-assign-dialog__loading">
                  <span className="dispatcher-spinner" aria-hidden="true" />
                  <span>Loading eligible couriers...</span>
                </div>
              ) : couriers.length === 0 ? (
                <div className="dispatcher-assign-dialog__empty">
                  No couriers reported for this region.
                </div>
              ) : (
                couriers.map((courier) => (
                  <CourierSelectionCard
                    key={courier.id}
                    courier={courier}
                    isSelected={courier.id === selectedCourierId}
                    onSelect={handleSelectCourier}
                    disabled={isSubmitting}
                  />
                ))
              )}
            </div>

            <div className="dispatcher-modal-footer">
              <button
                type="button"
                disabled={isSubmitting}
                className="dispatcher-modal-btn-cancel"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedCourier || isSubmitting}
                className="dispatcher-btn-primary"
                onClick={handleProceedToConfirm}
              >
                <UserCheck size={16} aria-hidden="true" />
                <span>
                  {selectedCourier
                    ? `Assign to ${selectedCourier.name}`
                    : 'Select a Courier to Continue'}
                </span>
              </button>
            </div>
          </>
        ) : (
          selectedCourier && (
            <AssignmentConfirmation
              order={order}
              courier={selectedCourier}
              isSubmitting={isSubmitting}
              onConfirm={handleConfirmAssignment}
              onCancel={handleBackToSelect}
            />
          )
        )}
      </div>
    </div>
  );
}

