'use client';

import { AlertTriangle, ArrowRight, Building, MapPin, UserCheck } from 'lucide-react';
import type { CourierAvailability, UnassignedDelivery } from './types';

interface AssignmentConfirmationProps {
  order: UnassignedDelivery;
  courier: CourierAvailability;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AssignmentConfirmation({
  order,
  courier,
  isSubmitting,
  onConfirm,
  onCancel,
}: AssignmentConfirmationProps) {
  return (
    <div className="dispatcher-confirmation">
      <div className="dispatcher-confirmation__banner">
        <UserCheck size={18} aria-hidden="true" />
        <div className="dispatcher-confirmation__banner-text">
          <span className="dispatcher-confirmation__banner-title">Confirm Delivery Assignment</span>
          <span className="dispatcher-confirmation__banner-subtitle">
            Review the details below. Once confirmed, this courier will be assigned to the delivery.
          </span>
        </div>
      </div>

      <div className="dispatcher-confirmation__summary">
        <div className="dispatcher-confirmation__side">
          <span className="dispatcher-confirmation__side-title">Order</span>
          <span className="dispatcher-confirmation__order-id">{order.orderId}</span>
          <span
            className={`dispatcher-priority-badge dispatcher-priority-badge--${order.priority.toLowerCase()}`}
          >
            {order.priority === 'URGENT' && <AlertTriangle size={11} aria-hidden="true" />}
            {order.priority}
          </span>
          <div className="dispatcher-confirmation__detail">
            <Building size={13} aria-hidden="true" />
            <span>{order.merchantName}</span>
          </div>
          <div className="dispatcher-confirmation__detail">
            <MapPin size={13} aria-hidden="true" />
            <span>{order.deliveryAddress}</span>
          </div>
        </div>

        <div className="dispatcher-confirmation__arrow" aria-hidden="true">
          <ArrowRight size={20} />
        </div>

        <div className="dispatcher-confirmation__side">
          <span className="dispatcher-confirmation__side-title">Assigned Courier</span>
          <span className="dispatcher-confirmation__courier-name">{courier.name}</span>
          <span className="dispatcher-confirmation__courier-code">{courier.courierCode}</span>
          <div className="dispatcher-confirmation__detail">
            <span>
              Workload after assignment:{' '}
              <strong>
                {courier.activeDeliveries + 1}/{courier.maxCapacity}
              </strong>
            </span>
          </div>
        </div>
      </div>

      <p className="dispatcher-confirmation__notice">
        Submitting will notify the courier and remove this order from the unassigned queue.
      </p>

      <div className="dispatcher-modal-footer">
        <button
          type="button"
          disabled={isSubmitting}
          className="dispatcher-modal-btn-cancel"
          onClick={onCancel}
        >
          Back
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          className="dispatcher-btn-primary"
          onClick={onConfirm}
        >
          {isSubmitting ? (
            <>
              <span className="dispatcher-spinner" aria-hidden="true" />
              <span>Assigning...</span>
            </>
          ) : (
            <span>Confirm Assignment</span>
          )}
        </button>
      </div>
    </div>
  );
}

