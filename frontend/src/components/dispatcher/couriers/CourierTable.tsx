'use client';

import { Eye, Phone, ChevronLeft, ChevronRight, Bike, Car, Star } from 'lucide-react';
import type { CourierProfile, CourierStatus } from './types';
import { getInitials } from '../deliveries/courierUtils';

interface CourierTableProps {
  couriers: CourierProfile[];
  isLoading?: boolean;
  onViewProfile: (courier: CourierProfile) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalFilteredCount: number;
  pageSize: number;
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
    label: 'On Route',
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

export default function CourierTable({
  couriers,
  isLoading = false,
  onViewProfile,
  currentPage,
  totalPages,
  onPageChange,
  totalFilteredCount,
  pageSize,
}: CourierTableProps) {
  return (
    <div className="dispatcher-card">
      <div className="dispatcher-table-container">
        <table className="dispatcher-table" aria-label="Courier fleet directory">
          <thead>
            <tr>
              <th>Courier</th>
              <th>Vehicle &amp; Contact</th>
              <th>Service Zone</th>
              <th>Workload Capacity</th>
              <th>Completed (Today / Total)</th>
              <th>Rating</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="dispatcher-table__empty">
                  <div className="flex items-center justify-center gap-2 py-4 text-slate-500">
                    <span className="dispatcher-spinner" aria-hidden="true" />
                    <span>Loading courier workforce...</span>
                  </div>
                </td>
              </tr>
            ) : couriers.length === 0 ? (
              <tr>
                <td colSpan={8} className="dispatcher-table__empty">
                  No couriers found matching the selected filter criteria.
                </td>
              </tr>
            ) : (
              couriers.map((courier) => {
                const statusInfo = statusBadgeConfig[courier.status];
                const percent = Math.min(
                  100,
                  Math.round((courier.activeDeliveries / courier.maxCapacity) * 100)
                );

                return (
                  <tr key={courier.id}>
                    {/* Courier Name & Code */}
                    <td>
                      <div className="dispatcher-courier-profile-cell">
                        <div className="dispatcher-courier-avatar" aria-hidden="true">
                          <span>{getInitials(courier.name)}</span>
                          <span
                            className="dispatcher-courier-avatar__dot"
                            style={{ backgroundColor: statusInfo.dot }}
                          />
                        </div>
                        <div className="dispatcher-courier-profile-info">
                          <span className="dispatcher-courier-profile-name">{courier.name}</span>
                          <span className="dispatcher-courier-profile-code font-mono">
                            {courier.courierCode}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Vehicle & Contact */}
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="dispatcher-courier-avatar-mini" aria-hidden="true">
                          {courier.vehicleType === 'Van' ? <Car size={13} /> : <Bike size={13} />}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-800">
                            {courier.vehiclePlate}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">{courier.phone}</span>
                        </div>
                      </div>
                    </td>

                    {/* Service Zone */}
                    <td>
                      <span className="dispatcher-city-tag">{courier.zone.split(' - ')[0]}</span>
                    </td>

                    {/* Workload Capacity Bar */}
                    <td>
                      <div className="dispatcher-workload-bar-wrapper">
                        <div className="dispatcher-workload-bar-top">
                          <span className="font-semibold text-slate-700">
                            {courier.activeDeliveries}/{courier.maxCapacity} active
                          </span>
                          <span className="text-slate-400">{percent}%</span>
                        </div>
                        <div
                          className="dispatcher-workload-bar-track"
                          role="progressbar"
                          aria-valuenow={courier.activeDeliveries}
                          aria-valuemin={0}
                          aria-valuemax={courier.maxCapacity}
                        >
                          <div
                            className={`dispatcher-workload-bar-fill ${
                              percent >= 70
                                ? 'dispatcher-workload-bar__fill--high'
                                : percent >= 40
                                ? 'dispatcher-workload-bar__fill--moderate'
                                : 'dispatcher-workload-bar__fill--low'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Completed Today vs Lifetime */}
                    <td>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900">
                          {courier.completedToday} today
                        </span>
                        <span className="text-xs text-slate-400">
                          {courier.totalCompletedLifetime.toLocaleString()} total
                        </span>
                      </div>
                    </td>

                    {/* Rating */}
                    <td>
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-600">
                        <Star size={13} fill="#d97706" color="#d97706" aria-hidden="true" />
                        <span>{courier.rating.toFixed(1)}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td>
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
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div className="dispatcher-table-actions">
                        <a
                          href={`tel:${courier.phone}`}
                          className="dispatcher-courier-phone-btn"
                          title={`Call ${courier.name}`}
                          aria-label={`Call ${courier.name}`}
                        >
                          <Phone size={12} aria-hidden="true" />
                        </a>

                        <button
                          type="button"
                          className="dispatcher-action-btn-secondary"
                          onClick={() => onViewProfile(courier)}
                          title="View courier profile"
                          aria-label={`View profile for ${courier.name}`}
                        >
                          <Eye size={13} aria-hidden="true" />
                          <span>Profile</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="dispatcher-pagination">
        <div className="dispatcher-pagination__info">
          Showing{' '}
          <strong>
            {totalFilteredCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}
          </strong>{' '}
          to{' '}
          <strong>
            {Math.min(currentPage * pageSize, totalFilteredCount)}
          </strong>{' '}
          of <strong>{totalFilteredCount}</strong> couriers
        </div>

        <div className="dispatcher-pagination__controls">
          <button
            type="button"
            className="dispatcher-pagination__btn"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Go to previous page"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            <span>Previous</span>
          </button>

          <span className="dispatcher-pagination__current">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            className="dispatcher-pagination__btn"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Go to next page"
          >
            <span>Next</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

