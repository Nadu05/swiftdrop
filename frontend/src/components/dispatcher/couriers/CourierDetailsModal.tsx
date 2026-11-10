'use client';

import { useEffect, useRef } from 'react';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Bike,
  Car,
  Star,
  Clock,
  CheckCircle2,
  Calendar,
  Package,
} from 'lucide-react';
import type { CourierProfile, CourierStatus } from './types';
import { getInitials } from '../deliveries/courierUtils';
import CourierWorkloadCard from './CourierWorkloadCard';

interface CourierDetailsModalProps {
  courier: CourierProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusBadgeConfig: Record<
  CourierStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  AVAILABLE: {
    label: 'Available',
    bg: '#f0fdf4',
    text: '#15803d',
    dot: '#22c55e',
  },
  BUSY: {
    label: 'On Route / Busy',
    bg: '#fffbeb',
    text: '#b45309',
    dot: '#f59e0b',
  },
  ON_BREAK: {
    label: 'On Break',
    bg: '#f8fafc',
    text: '#64748b',
    dot: '#94a3b8',
  },
  OFFLINE: {
    label: 'Offline',
    bg: '#f1f5f9',
    text: '#475569',
    dot: '#64748b',
  },
};

export default function CourierDetailsModal({
  courier,
  isOpen,
  onClose,
}: CourierDetailsModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Close on Escape key press & prevent background scrolling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Focus close button on mount
    closeBtnRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !courier) return null;

  const statusInfo = statusBadgeConfig[courier.status] || statusBadgeConfig.AVAILABLE;

  return (
    <div
      className="dispatcher-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="courier-details-title"
    >
      <div
        className="dispatcher-modal-card"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="dispatcher-modal-header">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {courier.courierCode}
              </span>
              <span
                className="dispatcher-status-badge"
                style={{ backgroundColor: statusInfo.bg, color: statusInfo.text }}
              >
                <span
                  className="dispatcher-status-dot"
                  style={{ backgroundColor: statusInfo.dot }}
                  aria-hidden="true"
                />
                {statusInfo.label}
              </span>
            </div>
            <h2 id="courier-details-title" className="dispatcher-modal-title">
              Courier Profile &amp; Performance Details
            </h2>
            <p className="dispatcher-modal-subtitle">
              Workforce capacity, personal contact, and live assigned orders.
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

        {/* Modal Content */}
        <div className="dispatcher-modal-content">
          {/* Personal Information & Avatar Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3.5">
              <div
                className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm relative flex-shrink-0"
                aria-hidden="true"
              >
                <span>{getInitials(courier.name)}</span>
                <span
                  className="w-3.5 h-3.5 rounded-full absolute bottom-0 right-0 border-2 border-white"
                  style={{ backgroundColor: statusInfo.dot }}
                />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  {courier.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    {courier.vehicleType === 'Van' ? <Car size={13} /> : <Bike size={13} />}
                    <span>{courier.vehicleType}</span>
                  </span>
                  <span>•</span>
                  <span className="font-mono text-slate-600 font-semibold">{courier.vehiclePlate}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-sm font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
              <Star size={16} fill="#d97706" color="#d97706" aria-hidden="true" />
              <span>{courier.rating.toFixed(1)} / 5.0</span>
            </div>
          </div>

          {/* Contact & Territory Information */}
          <div className="dispatcher-modal-section">
            <div className="dispatcher-modal-section-title">
              <MapPin size={15} aria-hidden="true" />
              <span>Contact &amp; Territory</span>
            </div>

            <div className="dispatcher-details-grid">
              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Mobile Phone</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="dispatcher-details-value font-mono">{courier.phone}</span>
                  <a
                    href={`tel:${courier.phone}`}
                    className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    title={`Call ${courier.name}`}
                  >
                    <Phone size={13} aria-hidden="true" />
                  </a>
                </div>
              </div>

              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Email Address</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="dispatcher-details-value">{courier.email}</span>
                  <a
                    href={`mailto:${courier.email}`}
                    className="p-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    title={`Email ${courier.name}`}
                  >
                    <Mail size={13} aria-hidden="true" />
                  </a>
                </div>
              </div>

              <div className="dispatcher-details-field col-span-2">
                <span className="dispatcher-details-label">Primary Assigned Zone</span>
                <span className="dispatcher-details-value text-blue-900 font-medium">
                  {courier.zone}
                </span>
              </div>
            </div>
          </div>

          {/* Workload Monitoring Card Component */}
          <CourierWorkloadCard courier={courier} />

          {/* Delivery Performance Statistics */}
          <div className="dispatcher-modal-section">
            <div className="dispatcher-modal-section-title">
              <Package size={15} aria-hidden="true" />
              <span>Completed Delivery Statistics</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>Delivered Today</span>
                </div>
                <span className="text-lg font-bold text-slate-900">
                  {courier.completedToday} orders
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                  <Calendar size={13} className="text-blue-600" />
                  <span>Lifetime Completed</span>
                </div>
                <span className="text-lg font-bold text-slate-900">
                  {courier.totalCompletedLifetime.toLocaleString()} orders
                </span>
              </div>
            </div>
          </div>

          {/* Relevant Delivery Assignments */}
          {courier.assignedOrders && courier.assignedOrders.length > 0 && (
            <div className="dispatcher-modal-section">
              <div className="dispatcher-modal-section-title">
                <Package size={15} aria-hidden="true" />
                <span>Relevant Delivery Assignments ({courier.assignedOrders.length})</span>
              </div>

              <div className="space-y-2">
                {courier.assignedOrders.map((order) => (
                  <div
                    key={order.orderId}
                    className="p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="dispatcher-cell-stack">
                      <div className="dispatcher-cell-row">
                        <span className="font-mono font-bold text-slate-900">{order.orderId}</span>
                        <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                          {order.trackingNumber}
                        </span>
                      </div>
                      <span className="text-slate-600 mt-0.5">{order.destination}</span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                          order.status === 'In Transit'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : order.status === 'Delivered'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {order.status}
                      </span>
                      <span className="text-[10px] text-slate-400">{order.assignedTime}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shift Schedule */}
          <div className="dispatcher-modal-section">
            <div className="dispatcher-modal-section-title">
              <Clock size={15} aria-hidden="true" />
              <span>Shift Timing &amp; Activity</span>
            </div>

            <div className="dispatcher-details-grid">
              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Shift Start Time</span>
                <span className="dispatcher-details-value">{courier.shiftStart}</span>
              </div>

              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Last Active Telemetry</span>
                <span className="dispatcher-details-value text-slate-700">{courier.lastActive}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

