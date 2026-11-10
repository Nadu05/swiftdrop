'use client';

import {
  Eye,
  Phone,
  ChevronLeft,
  ChevronRight,
  Bike,
  Car,
  XCircle,
} from 'lucide-react';
import type { CourierProfile, CourierStatus } from './types';
import { getInitials } from '../deliveries/courierUtils';

interface CourierTableProps {
  couriers: CourierProfile[];
  isLoading?: boolean;
  error?: string | null;
  onViewDetails: (courier: CourierProfile) => void;
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

export default function CourierTable({
  couriers,
  isLoading = false,
  error = null,
  onViewDetails,
  currentPage,
  totalPages,
  onPageChange,
  totalFilteredCount,
  pageSize,
}: CourierTableProps) {
  return (
    <div className="dispatcher-card">
      <div className="dispatcher-table-container">
        <table className="dispatcher-table" aria-label="Couriers management directory">
          <thead>
            <tr>
              <th>Courier ID</th>
              <th>Courier Name</th>
              <th>Contact Number</th>
              <th>Vehicle Type</th>
              <th>Availability Status</th>
              <th>Active Deliveries</th>
              <th>Completed Deliveries</th>
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
            ) : error ? (
              <tr>
                <td colSpan={8} className="dispatcher-table__empty text-rose-600 font-medium py-6">
                  <div className="flex flex-col items-center gap-1">
                    <XCircle size={20} />
                    <span>{error}</span>
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
                const statusInfo = statusBadgeConfig[courier.status] || statusBadgeConfig.AVAILABLE;
                const percent = Math.min(
                  100,
                  Math.round((courier.activeDeliveries / courier.maxCapacity) * 100)
                );

                return (
                  <tr key={courier.id}>
                    {/* 1. Courier ID */}
                    <td>
                      <span className="dispatcher-tracking-number">
                        {courier.courierCode}
                      </span>
                    </td>

                    {/* 2. Courier Name */}
                    <td>
                      <div className="dispatcher-active-courier-cell">
                        <div className="dispatcher-courier-avatar" aria-hidden="true">
                          <span>{getInitials(courier.name)}</span>
                          <span
                            className="dispatcher-courier-avatar__dot"
                            style={{ backgroundColor: statusInfo.dot }}
                          />
                        </div>
                        <div className="dispatcher-cell-stack">
                          <span className="dispatcher-customer-name">{courier.name}</span>
                          <span className="text-[11px] text-slate-500">{courier.zone.split(' - ')[0]}</span>
                        </div>
                      </div>
                    </td>

                    {/* 3. Contact Number */}
                    <td>
                      <div className="dispatcher-cell-row">
                        <a
                          href={`tel:${courier.phone}`}
                          className="dispatcher-courier-phone-btn"
                          title={`Call ${courier.name}`}
                          aria-label={`Call ${courier.name}`}
                        >
                          <Phone size={12} aria-hidden="true" />
                        </a>
                        <span className="text-xs text-slate-700 font-mono font-medium">
                          {courier.phone}
                        </span>
                      </div>
                    </td>

                    {/* 4. Vehicle Type */}
                    <td>
                      <div className="dispatcher-active-courier-cell">
                        <span className="dispatcher-courier-avatar-mini" aria-hidden="true">
                          {courier.vehicleType === 'Van' ? <Car size={13} /> : <Bike size={13} />}
                        </span>
                        <div className="dispatcher-cell-stack">
                          <span className="text-xs font-semibold text-slate-800">
                            {courier.vehicleType}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {courier.vehiclePlate}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 5. Availability Status */}
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

                    {/* 6. Active Deliveries */}
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
                              percent >= 75
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

                    {/* 7. Completed Deliveries */}
                    <td>
                      <div className="dispatcher-cell-stack">
                        <span className="text-xs font-bold text-slate-900">
                          {courier.completedToday} today
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {courier.totalCompletedLifetime.toLocaleString()} total
                        </span>
                      </div>
                    </td>

                    {/* 8. Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="dispatcher-action-btn-secondary"
                        onClick={() => onViewDetails(courier)}
                        title="View courier details & workload"
                        aria-label={`View details for ${courier.name}`}
                      >
                        <Eye size={13} aria-hidden="true" />
                        <span>View Details</span>
                      </button>
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
