'use client';

import {
  Eye,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Slash,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import type { DeliveryHistoryRecord, DeliveryHistoryStatus } from './types';

interface DeliveryHistoryTableProps {
  deliveries: DeliveryHistoryRecord[];
  isLoading?: boolean;
  error?: string | null;
  onViewDetails: (record: DeliveryHistoryRecord) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalFilteredCount: number;
  pageSize: number;
}

const statusBadgeConfig: Record<
  DeliveryHistoryStatus,
  { label: string; bg: string; text: string; dot: string; icon: typeof CheckCircle2 }
> = {
  DELIVERED: {
    label: 'Delivered',
    bg: '#f0fdf4',
    text: '#15803d',
    dot: '#22c55e',
    icon: CheckCircle2,
  },
  FAILED: {
    label: 'Failed',
    bg: '#fef2f2',
    text: '#dc2626',
    dot: '#ef4444',
    icon: XCircle,
  },
  RETURNED: {
    label: 'Returned',
    bg: '#fffbeb',
    text: '#b45309',
    dot: '#f59e0b',
    icon: RotateCcw,
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: '#f1f5f9',
    text: '#475569',
    dot: '#64748b',
    icon: Slash,
  },
};

export default function DeliveryHistoryTable({
  deliveries,
  isLoading = false,
  error = null,
  onViewDetails,
  currentPage,
  totalPages,
  onPageChange,
  totalFilteredCount,
  pageSize,
}: DeliveryHistoryTableProps) {
  const formatDate = (isoStr: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(isoStr));
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="dispatcher-card">
      <div className="dispatcher-table-container">
        <table className="dispatcher-table" aria-label="Delivery history archives table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Tracking Number</th>
              <th>Recipient Name</th>
              <th>Courier Name</th>
              <th>Delivery Date</th>
              <th>Delivery Attempts</th>
              <th>Final Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="dispatcher-table__empty">
                  <div className="flex items-center justify-center gap-2 py-4 text-slate-500">
                    <span className="dispatcher-spinner" aria-hidden="true" />
                    <span>Loading delivery history archives...</span>
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
            ) : deliveries.length === 0 ? (
              <tr>
                <td colSpan={8} className="dispatcher-table__empty">
                  No historical delivery records found matching your filter criteria.
                </td>
              </tr>
            ) : (
              deliveries.map((record) => {
                const statusInfo = statusBadgeConfig[record.status] || statusBadgeConfig.DELIVERED;
                const StatusIcon = statusInfo.icon;

                return (
                  <tr key={record.id}>
                    {/* Order ID */}
                    <td>
                      <div className="dispatcher-cell-stack">
                        <span className="dispatcher-tracking-number">
                          {record.orderId}
                        </span>
                        {record.priority === 'HIGH' && (
                          <span className="dispatcher-priority-badge dispatcher-priority-badge--high">
                            High Priority
                          </span>
                        )}
                        {record.priority === 'URGENT' && (
                          <span className="dispatcher-priority-badge dispatcher-priority-badge--urgent">
                            <AlertTriangle size={10} aria-hidden="true" />
                            Urgent
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Tracking Number */}
                    <td>
                      <span className="dispatcher-tracking-number" style={{ color: '#2563eb' }}>
                        {record.trackingNumber}
                      </span>
                    </td>

                    {/* Recipient Name */}
                    <td>
                      <div className="dispatcher-destination-cell">
                        <span className="dispatcher-customer-name">
                          {record.recipient.name}
                        </span>
                        <span className="dispatcher-address-text">
                          {record.recipient.city}
                        </span>
                      </div>
                    </td>

                    {/* Courier Name */}
                    <td>
                      <div className="dispatcher-active-courier-cell">
                        <span className="dispatcher-courier-avatar-mini" aria-hidden="true">
                          <User size={13} />
                        </span>
                        <div className="dispatcher-cell-stack">
                          <span className="dispatcher-customer-name">
                            {record.courier.name}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {record.courier.code} • {record.courier.vehiclePlate}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Delivery Date */}
                    <td>
                      <div className="dispatcher-cell-row">
                        <Calendar size={13} className="text-slate-400 flex-shrink-0" aria-hidden="true" />
                        <span className="dispatcher-order-date">{formatDate(record.completedAt)}</span>
                      </div>
                    </td>

                    {/* Delivery Attempts */}
                    <td>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          record.deliveryAttempts > 1
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {record.deliveryAttempts} {record.deliveryAttempts === 1 ? 'attempt' : 'attempts'}
                      </span>
                    </td>

                    {/* Final Status */}
                    <td>
                      <span
                        className="dispatcher-status-badge"
                        style={{ backgroundColor: statusInfo.bg, color: statusInfo.text }}
                      >
                        <StatusIcon size={12} strokeWidth={2.5} aria-hidden="true" />
                        <span>{statusInfo.label}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="dispatcher-action-btn-secondary"
                        onClick={() => onViewDetails(record)}
                        title="Investigate order lifecycle and delivery proof"
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
          of <strong>{totalFilteredCount}</strong> delivery records
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
