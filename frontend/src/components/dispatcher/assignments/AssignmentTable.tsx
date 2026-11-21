'use client';

import { Eye, RotateCcw, ChevronLeft, ChevronRight, AlertTriangle, Bike, Car } from 'lucide-react';
import type { AssignmentRecord } from './types';

interface AssignmentTableProps {
  assignments: AssignmentRecord[];
  isLoading?: boolean;
  onViewDetails: (assignment: AssignmentRecord) => void;
  onReassignCourier: (assignment: AssignmentRecord) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalFilteredCount: number;
  pageSize: number;
}

const statusBadgeClasses: Record<string, string> = {
  ASSIGNED: 'dispatcher-assignment-status--assigned',
  ACCEPTED: 'dispatcher-assignment-status--accepted',
  IN_TRANSIT: 'dispatcher-assignment-status--transit',
  DELIVERED: 'dispatcher-assignment-status--delivered',
  REASSIGNED: 'dispatcher-assignment-status--reassigned',
  FAILED: 'dispatcher-assignment-status--failed',
};

export default function AssignmentTable({
  assignments,
  isLoading = false,
  onViewDetails,
  onReassignCourier,
  currentPage,
  totalPages,
  onPageChange,
  totalFilteredCount,
  pageSize,
}: AssignmentTableProps) {
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
        <table className="dispatcher-table" aria-label="Courier delivery assignments">
          <thead>
            <tr>
              <th>Assignment ID</th>
              <th>Order ID</th>
              <th>Courier Name</th>
              <th>Recipient Name</th>
              <th>Destination</th>
              <th>Assigned Date</th>
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
                    <span>Loading courier assignments...</span>
                  </div>
                </td>
              </tr>
            ) : assignments.length === 0 ? (
              <tr>
                <td colSpan={8} className="dispatcher-table__empty">
                  No delivery assignments found matching the selected filter criteria.
                </td>
              </tr>
            ) : (
              assignments.map((record) => {
                const isDelivered = record.deliveryStatus === 'DELIVERED';
                return (
                  <tr key={record.assignmentId}>
                    {/* Assignment ID */}
                    <td>
                      <span className="dispatcher-tracking-number">{record.assignmentId}</span>
                    </td>

                    {/* Order ID */}
                    <td>
                      <div className="dispatcher-tracking-cell">
                        <span className="font-semibold text-slate-800">{record.orderId}</span>
                        {record.priority === 'URGENT' && (
                          <span className="dispatcher-priority-badge dispatcher-priority-badge--urgent">
                            <AlertTriangle size={10} aria-hidden="true" />
                            Urgent
                          </span>
                        )}
                      </div>
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
                      <span className={`dispatcher-assignment-status ${statusBadgeClasses[record.deliveryStatus] || ''}`}>
                        {record.deliveryStatus}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div className="dispatcher-table-actions">
                        <button
                          type="button"
                          className="dispatcher-action-btn-secondary"
                          onClick={() => onViewDetails(record)}
                          title="View assignment details"
                          aria-label={`View details for assignment ${record.assignmentId}`}
                        >
                          <Eye size={13} aria-hidden="true" />
                          <span>Details</span>
                        </button>

                        <button
                          type="button"
                          disabled={isDelivered}
                          className={`dispatcher-action-btn-secondary ${
                            isDelivered ? 'opacity-40 cursor-not-allowed' : 'hover:border-blue-400 text-blue-600'
                          }`}
                          onClick={() => !isDelivered && onReassignCourier(record)}
                          title={isDelivered ? 'Delivered orders cannot be reassigned' : 'Reassign to another courier'}
                          aria-label={`Reassign courier for order ${record.orderId}`}
                        >
                          <RotateCcw size={13} aria-hidden="true" />
                          <span>Reassign</span>
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

      {/* Pagination Bar */}
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
          of <strong>{totalFilteredCount}</strong> assignments
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

