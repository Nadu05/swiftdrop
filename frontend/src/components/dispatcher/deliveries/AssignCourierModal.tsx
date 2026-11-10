'use client';

import { useState } from 'react';
import { X, UserCheck, Bike, Car, ShieldAlert, Check } from 'lucide-react';
import { courierWorkloadMock, type CourierWorkloadItem } from '@/components/dispatcher/overview/mockData';
import type { UnassignedDeliveryOrder } from './deliveriesMockData';

interface AssignCourierModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: UnassignedDeliveryOrder | null;
  onAssignConfirm: (orderId: string, courier: CourierWorkloadItem) => void;
}

export default function AssignCourierModal({
  isOpen,
  onClose,
  order,
  onAssignConfirm,
}: AssignCourierModalProps) {
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  // Filter couriers: show Available first, then Busy with remaining capacity, exclude Offline
  const assignableCouriers = courierWorkloadMock.filter((c) => c.status !== 'OFFLINE');

  const selectedCourier = assignableCouriers.find((c) => c.id === selectedCourierId);

  const handleConfirm = () => {
    if (selectedCourier) {
      onAssignConfirm(order.id, selectedCourier);
      onClose();
    }
  };

  return (
    <div className="dispatcher-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="dispatcher-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="dispatcher-modal-header">
          <div>
            <h2 className="dispatcher-modal-title">Assign Courier to Order</h2>
            <p className="dispatcher-modal-subtitle">
              Tracking: <strong>{order.trackingNumber}</strong> • {order.zone}
            </p>
          </div>
          <button
            type="button"
            className="dispatcher-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Order Quick Context */}
        <div className="dispatcher-modal-order-summary">
          <div className="dispatcher-modal-order-col">
            <span className="dispatcher-modal-label">Pickup Location:</span>
            <span className="dispatcher-modal-value">{order.pickupAddress}</span>
          </div>
          <div className="dispatcher-modal-order-col">
            <span className="dispatcher-modal-label">Delivery Destination:</span>
            <span className="dispatcher-modal-value">{order.deliveryAddress}</span>
          </div>
        </div>

        {/* Available Couriers List */}
        <div className="dispatcher-modal-body">
          <div className="dispatcher-modal-section-title">
            Select Active Courier ({assignableCouriers.length} available in fleet)
          </div>

          <div className="dispatcher-modal-courier-list">
            {assignableCouriers.map((courier) => {
              const isSelected = courier.id === selectedCourierId;
              const hasCapacity = courier.activeDeliveries < courier.maxCapacity;

              return (
                <div
                  key={courier.id}
                  className={`dispatcher-modal-courier-card ${
                    isSelected ? 'dispatcher-modal-courier-card--selected' : ''
                  } ${!hasCapacity ? 'dispatcher-modal-courier-card--full' : ''}`}
                  onClick={() => hasCapacity && setSelectedCourierId(courier.id)}
                  tabIndex={hasCapacity ? 0 : -1}
                  role="button"
                  aria-pressed={isSelected}
                >
                  <div className="dispatcher-modal-courier-left">
                    <div className="dispatcher-modal-courier-avatar">
                      {courier.vehicleType === 'Van' ? <Car size={16} /> : <Bike size={16} />}
                    </div>
                    <div>
                      <div className="dispatcher-modal-courier-name-row">
                        <span className="dispatcher-modal-courier-name">{courier.name}</span>
                        <span className="dispatcher-modal-courier-code">({courier.courierCode})</span>
                      </div>
                      <span className="dispatcher-modal-courier-zone">{courier.zone}</span>
                    </div>
                  </div>

                  <div className="dispatcher-modal-courier-right">
                    <span
                      className={`dispatcher-modal-status-badge ${
                        courier.status === 'AVAILABLE'
                          ? 'dispatcher-modal-status-badge--available'
                          : 'dispatcher-modal-status-badge--busy'
                      }`}
                    >
                      {courier.status}
                    </span>
                    <span className="dispatcher-modal-courier-load">
                      {courier.activeDeliveries}/{courier.maxCapacity} active
                    </span>
                    <div className="dispatcher-modal-radio">
                      {isSelected && <Check size={13} className="text-white" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="dispatcher-modal-footer">
          <button
            type="button"
            className="dispatcher-modal-btn-cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="dispatcher-btn-primary"
            disabled={!selectedCourierId}
            onClick={handleConfirm}
          >
            <UserCheck size={16} aria-hidden="true" />
            <span>Confirm Courier Assignment</span>
          </button>
        </div>
      </div>
    </div>
  );
}

