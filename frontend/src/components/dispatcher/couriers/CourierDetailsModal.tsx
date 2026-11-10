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
    label: 'On Delivery',
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
      className="dispatcher-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="courier-details-title"
    >
      <div
        className="dispatcher-modal-content"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="dispatcher-modal-header">
          <div>
            <div className="dispatcher-modal-header-top" style={{ marginBottom: '0.4rem' }}>
              <span className="dispatcher-tracking-number" style={{ fontSize: '0.8125rem' }}>
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

        {/* Modal Body */}
        <div className="dispatcher-modal-body">
          {/* 1. Personal Information Hero Card */}
          <div className="dispatcher-courier-hero-card">
            <div className="dispatcher-courier-hero-left">
              <div className="dispatcher-courier-hero-avatar" aria-hidden="true">
                <span>{getInitials(courier.name)}</span>
                <span
                  className="dispatcher-courier-hero-avatar__dot"
                  style={{ backgroundColor: statusInfo.dot }}
                />
              </div>

              <div className="dispatcher-courier-hero-info">
                <span className="dispatcher-courier-hero-name">{courier.name}</span>
                <div className="dispatcher-courier-hero-meta">
                  <span className="dispatcher-cell-row">
                    {courier.vehicleType === 'Van' ? <Car size={13} /> : <Bike size={13} />}
                    <span>{courier.vehicleType}</span>
                  </span>
                  <span>•</span>
                  <span className="font-mono font-semibold text-slate-700">{courier.vehiclePlate}</span>
                </div>
              </div>
            </div>

            <div className="dispatcher-courier-rating-badge">
              <Star size={14} fill="#d97706" color="#d97706" aria-hidden="true" />
              <span>{courier.rating.toFixed(1)} / 5.0</span>
            </div>
          </div>

          {/* 2. Contact & Territory Information */}
          <div className="dispatcher-modal-section">
            <div className="dispatcher-modal-section-title">
              <MapPin size={15} aria-hidden="true" />
              <span>Contact &amp; Territory</span>
            </div>

            <div className="dispatcher-details-grid">
              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Mobile Phone</span>
                <div className="dispatcher-cell-row" style={{ marginTop: '0.15rem' }}>
                  <span className="dispatcher-details-value font-mono">{courier.phone}</span>
                  <a
                    href={`tel:${courier.phone}`}
                    className="dispatcher-courier-phone-btn"
                    title={`Call ${courier.name}`}
                  >
                    <Phone size={11} aria-hidden="true" />
                  </a>
                </div>
              </div>

              <div className="dispatcher-details-field">
                <span className="dispatcher-details-label">Email Address</span>
                <div className="dispatcher-cell-row" style={{ marginTop: '0.15rem' }}>
                  <span className="dispatcher-details-value">{courier.email}</span>
                  <a
                    href={`mailto:${courier.email}`}
                    className="dispatcher-courier-phone-btn"
                    style={{ background: '#f1f5f9', color: '#475569' }}
                    title={`Email ${courier.name}`}
                  >
                    <Mail size={11} aria-hidden="true" />
                  </a>
                </div>
              </div>

              <div className="dispatcher-details-field" style={{ gridColumn: 'span 2' }}>
                <span className="dispatcher-details-label">Primary Assigned Zone</span>
                <span className="dispatcher-details-value text-blue-900 font-medium">
                  {courier.zone}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Workload Monitoring Card Component */}
          <CourierWorkloadCard courier={courier} />

          {/* 4. Delivery Performance Statistics */}
          <div className="dispatcher-modal-section">
            <div className="dispatcher-modal-section-title">
              <Package size={15} aria-hidden="true" />
              <span>Completed Delivery Statistics</span>
            </div>

            <div className="dispatcher-modal-stat-grid">
              <div className="dispatcher-modal-stat-box">
                <div className="dispatcher-modal-stat-label">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>Delivered Today</span>
                </div>
                <span className="dispatcher-modal-stat-value">
                  {courier.completedToday} orders
                </span>
              </div>

              <div className="dispatcher-modal-stat-box">
                <div className="dispatcher-modal-stat-label">
                  <Calendar size={13} className="text-blue-600" />
                  <span>Lifetime Completed</span>
                </div>
                <span className="dispatcher-modal-stat-value">
                  {courier.totalCompletedLifetime.toLocaleString()} orders
                </span>
              </div>
            </div>
          </div>

          {/* 5. Relevant Delivery Assignments */}
          {courier.assignedOrders && courier.assignedOrders.length > 0 && (
            <div className="dispatcher-modal-section">
              <div className="dispatcher-modal-section-title">
                <Package size={15} aria-hidden="true" />
                <span>Relevant Delivery Assignments ({courier.assignedOrders.length})</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {courier.assignedOrders.map((order) => (
                  <div key={order.orderId} className="dispatcher-assigned-order-card">
                    <div className="dispatcher-cell-stack">
                      <div className="dispatcher-cell-row">
                        <span className="font-mono font-bold text-slate-900">{order.orderId}</span>
                        <span className="dispatcher-tracking-number" style={{ fontSize: '0.75rem', color: '#2563eb' }}>
                          {order.trackingNumber}
                        </span>
                      </div>
                      <span className="text-slate-600" style={{ fontSize: '0.75rem', marginTop: '0.15rem' }}>
                        {order.destination}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                      <span
                        className="dispatcher-status-badge"
                        style={{
                          fontSize: '0.7rem',
                          padding: '0.2rem 0.5rem',
                          backgroundColor:
                            order.status === 'In Transit'
                              ? '#fffbeb'
                              : order.status === 'Delivered'
                              ? '#f0fdf4'
                              : '#eff6ff',
                          color:
                            order.status === 'In Transit'
                              ? '#b45309'
                              : order.status === 'Delivered'
                              ? '#15803d'
                              : '#1d4ed8',
                        }}
                      >
                        {order.status}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{order.assignedTime}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Shift Schedule */}
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
