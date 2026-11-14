'use client';

import { Eye, ChevronLeft, ChevronRight, AlertTriangle, Bike, Car, Clock, Navigation, UserCheck } from 'lucide-react';
import type { ActiveDeliveryRecord } from './types';

interface ActiveDeliveryTableProps {
  deliveries: ActiveDeliveryRecord[];
  isLoading?: boolean;
  error?: string | null;
  onViewDetails: (delivery: ActiveDeliveryRecord) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalFilteredCount: number;
  pageSize: number;
}

const statusBadgeConfig: Record<
  string,
  { label: string; bg: string; text: string; dot: string; icon: any }
> = {
  ASSIGNED: {
    label: 'Assigned',
    bg: '#f1f5f9',
    text: '#475569',
    dot: '#64748b',
    icon: Clock,
  },
  ACCEPTED: {
    label: 'Accepted',
    bg: '#eff6ff',
    text: '#1d4ed8',
    dot: '#2563eb',
    icon: UserCheck,
  },
  IN_TRANSIT: {
    label: 'In Transit',
    bg: '#f0fdf4',
    text: '#15803d',
    dot: '#22c55e',
    icon: Navigation,
  },
};

export default function ActiveDeliveryTable({
  deliveries,
  isLoading = false,
  error = null,
  onViewDetails,
  currentPage,
  totalPages,
  onPageChange,
  totalFilteredCount,
  pageSize,
}: ActiveDeliveryTableProps) {
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="dispatcher-card">
      <div className="dispatcher-table-container">
        <table className="dispatcher-table" aria-label="Active deliveries monitoring table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Tracking Number</th>
              <th>Courier Name</th>
              <th>Recipient Name</th>
              <th>Destination</th>
              <th>Assigned Date</th>
              <th>Delivery Status</th>
              <th>Priority</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="dispatcher-table__empty">
                  <div className="flex items-center justify-center gap-2 py-4 text-slate-500">
                    <span className="dispatcher-spinner" aria-hidden="true" />
                    <span>Loading active deliveries...</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={9} className="dispatcher-table__empty text-rose-600 font-medium py-6">
                  <div className="flex flex-col items-center gap-1">
                    <AlertTriangle size={20} />
                    <span>{error}</span>
                  </div>
                </td>
              </tr>
            ) : deliveries.length === 0 ? (
              <tr>
                <td colSpan={9} className="dispatcher-table__empty">
                  No active deliveries found matching current filters.
                </td>
              </tr>
            ) : (
              deliveries.map((record) => {
                const statusInfo = statusBadgeConfig[record.deliveryStatus] || statusBadgeConfig.ASSIGNED;
                const StatusIcon = statusInfo.icon;

                return (
                  <tr key={record.assignmentId}>
                    {/* Order ID */}
                    <td>
                      <span className="font-semibold text-slate-900">{record.orderId}</span>
                    </td>

                    {/* Tracking Number */}
                    <td>
                      <span className="dispatcher-tracking-number">{record.trackingNumber}</span>
                    </td>

                    {/* Courier Name */}
                    <td>
                      <div className="dispatcher-active-courier-cell">
                        <span className="dispatcher-courier-avatar-mini" aria-hidden="true">
                          {record.courier.vehicle === 'Van' ? <Car size={13} /> : <Bike size={13} />}
                        </span>
                        <div className="flex flex-col">
                          <span className="dispatcher-customer-name">{record.courier.name}</span>
                          <span className="text-xs text-slate-400 font-mono">{record.courier.code}</span>
                        </div>
                      </div>
                    </td>

                    {/* Recipient Name */}
                    <td>
                      <span className="dispatcher-customer-name">{record.recipient.name}</span>
                    </td>

                    {/* Destination */}
                    <td>
                      <div className="dispatcher-destination-cell">
                        <span className="dispatcher-address-text">{record.recipient.address}</span>
                        <span className="dispatcher-city-tag">{record.recipient.city}</span>
                      </div>
                    </td>

                    {/* Assigned Date */}
                    <td>
                      <span className="dispatcher-order-date">{formatDate(record.assignedDate)}</span>
                    </td>

                    {/* Delivery Status */}
                    <td>
                      <span
                        className="dispatcher-status-badge"
                        style={{ backgroundColor: statusInfo.bg, color: statusInfo.text }}
                      >
                        <span
                          className={`dispatcher-status-dot ${
                            record.deliveryStatus === 'IN_TRANSIT' ? 'dispatcher-status-dot--pulse' : ''
                          }`}
                          style={{ backgroundColor: statusInfo.dot }}
                          aria-hidden="true"
                        />
                        <StatusIcon size={12} aria-hidden="true" />
                        <span>{statusInfo.label}</span>
                      </span>
                    </td>

                    {/* Priority */}
                    <td>
                      <span
                        className={`dispatcher-priority-badge dispatcher-priority-badge--${record.priority.toLowerCase()}`}
                      >
                        {record.priority === 'URGENT' && <AlertTriangle size={10} aria-hidden="true" />}
                        {record.priority}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="dispatcher-action-btn-secondary"
                        onClick={() => onViewDetails(record)}
                        title="View active delivery details"
                        aria-label={`View details for order ${record.orderId}`}
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
          of <strong>{totalFilteredCount}</strong> active deliveries
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

