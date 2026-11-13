'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';
import type { UnassignedDelivery, DeliveryPriority } from './types';

interface UnassignedDeliveryTableProps {
  deliveries: UnassignedDelivery[];
  isLoading?: boolean;
  onViewDetails: (delivery: UnassignedDelivery) => void;
  onAssignCourier: (delivery: UnassignedDelivery) => void;
}

const priorityBadges: Record<
  DeliveryPriority,
  { label: string; classModifier: string; icon?: boolean }
> = {
  URGENT: { label: 'Urgent', classModifier: 'dispatcher-priority-badge--urgent', icon: true },
  HIGH: { label: 'High', classModifier: 'dispatcher-priority-badge--high' },
  NORMAL: { label: 'Standard', classModifier: 'dispatcher-priority-badge--normal' },
};

export default function UnassignedDeliveryTable({
  deliveries,
  isLoading = false,
  onViewDetails,
  onAssignCourier,
}: UnassignedDeliveryTableProps) {
  // State for search, filters, sorting, and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 5;

  // Filter & Sort Pipeline
  const filteredAndSortedDeliveries = useMemo(() => {
    let result = [...deliveries];

    // 1. Search by Order ID or Recipient Name
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.orderId.toLowerCase().includes(q) ||
          item.recipientName.toLowerCase().includes(q) ||
          item.merchantName.toLowerCase().includes(q) ||
          item.deliveryAddress.toLowerCase().includes(q)
      );
    }

    // 2. Filter by Delivery Priority
    if (priorityFilter !== 'ALL') {
      result = result.filter((item) => item.priority === priorityFilter);
    }

    // 3. Filter by Date (Relative matching based on mock date stamps)
    if (dateFilter !== 'ALL') {
      const today = new Date('2026-11-10').toDateString();
      const yesterday = new Date('2026-11-09').toDateString();

      result = result.filter((item) => {
        const itemDate = new Date(item.orderDate).toDateString();
        if (dateFilter === 'TODAY') return itemDate === today;
        if (dateFilter === 'YESTERDAY') return itemDate === yesterday;
        if (dateFilter === 'OLDER') return itemDate !== today && itemDate !== yesterday;
        return true;
      });
    }

    // 4. Sort by Newest vs Oldest
    result.sort((a, b) => {
      const timeA = new Date(a.orderDate).getTime();
      const timeB = new Date(b.orderDate).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [deliveries, searchTerm, priorityFilter, dateFilter, sortOrder]);

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedDeliveries.length / pageSize));
  const paginatedDeliveries = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedDeliveries.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedDeliveries, currentPage, pageSize]);

  // Adjust page if filters change resulting in lower page count
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const formatDateDisplay = (isoString: string) => {
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
      {/* 1. Filter, Search, and Sorting Toolbar */}
      <div className="dispatcher-table-toolbar">
        {/* Search */}
        <div className="dispatcher-search-input-wrapper">
          <Search size={15} className="dispatcher-search-icon" aria-hidden="true" />
          <input
            type="text"
            className="dispatcher-search-input"
            placeholder="Search Order ID, recipient, merchant..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Search deliveries by Order ID or recipient"
          />
        </div>

        {/* Filter Controls */}
        <div className="dispatcher-toolbar-filters">
          {/* Priority Filter */}
          <div className="dispatcher-select-wrapper">
            <Filter size={14} className="dispatcher-select-icon" aria-hidden="true" />
            <select
              className="dispatcher-select"
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter deliveries by priority"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Standard</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="dispatcher-select-wrapper">
            <Calendar size={14} className="dispatcher-select-icon" aria-hidden="true" />
            <select
              className="dispatcher-select"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter deliveries by date"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today (Nov 10)</option>
              <option value="YESTERDAY">Yesterday (Nov 09)</option>
              <option value="OLDER">Older Orders</option>
            </select>
          </div>

          {/* Sort By Date */}
          <button
            type="button"
            className="dispatcher-sort-btn"
            onClick={() => setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
            title={`Sort order: currently ${sortOrder}`}
            aria-label={`Toggle sort order. Currently ${sortOrder}`}
          >
            <ArrowUpDown size={14} aria-hidden="true" />
            <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>
      </div>

      {/* 2. Responsive Deliveries Table */}
      <div className="dispatcher-table-container">
        <table className="dispatcher-table" aria-label="Unassigned deliveries list">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Recipient Name</th>
              <th>Destination Address</th>
              <th>Merchant Name</th>
              <th>Order Date</th>
              <th>Priority</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="dispatcher-table__empty">
                  <div className="flex items-center justify-center gap-2 py-4 text-slate-500">
                    <span className="dispatcher-spinner" aria-hidden="true" />
                    <span>Loading pending deliveries...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedDeliveries.length === 0 ? (
              <tr>
                <td colSpan={7} className="dispatcher-table__empty">
                  No unassigned deliveries found matching your search and filter criteria.
                </td>
              </tr>
            ) : (
              paginatedDeliveries.map((delivery) => {
                const priorityInfo = priorityBadges[delivery.priority];
                return (
                  <tr key={delivery.orderId}>
                    {/* Order ID */}
                    <td>
                      <span className="dispatcher-tracking-number">{delivery.orderId}</span>
                    </td>

                    {/* Recipient Name */}
                    <td>
                      <span className="dispatcher-customer-name">{delivery.recipientName}</span>
                    </td>

                    {/* Destination Address */}
                    <td>
                      <div className="dispatcher-destination-cell">
                        <span className="dispatcher-address-text">{delivery.deliveryAddress}</span>
                        <span className="dispatcher-city-tag">{delivery.city}</span>
                      </div>
                    </td>

                    {/* Merchant Name */}
                    <td>
                      <span className="dispatcher-merchant-name">{delivery.merchantName}</span>
                    </td>

                    {/* Order Date */}
                    <td>
                      <span className="dispatcher-order-date">
                        {formatDateDisplay(delivery.orderDate)}
                      </span>
                    </td>

                    {/* Priority */}
                    <td>
                      <span
                        className={`dispatcher-priority-badge ${priorityInfo.classModifier}`}
                      >
                        {priorityInfo.icon && <AlertTriangle size={11} aria-hidden="true" />}
                        {priorityInfo.label}
                      </span>
                    </td>

                    {/* Actions: View Details & Assign Courier */}
                    <td style={{ textAlign: 'right' }}>
                      <div className="dispatcher-table-actions">
                        <button
                          type="button"
                          className="dispatcher-action-btn-secondary"
                          onClick={() => onViewDetails(delivery)}
                          title="View order details"
                          aria-label={`View details for order ${delivery.orderId}`}
                        >
                          <Eye size={13} aria-hidden="true" />
                          <span>View Details</span>
                        </button>

                        <button
                          type="button"
                          className="dispatcher-action-btn-primary"
                          onClick={() => onAssignCourier(delivery)}
                          title="Assign to courier"
                          aria-label={`Assign courier to order ${delivery.orderId}`}
                        >
                          <UserPlus size={13} aria-hidden="true" />
                          <span>Assign Courier</span>
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

      {/* 3. Pagination Controls */}
      <div className="dispatcher-pagination">
        <div className="dispatcher-pagination__info">
          Showing{' '}
          <strong>
            {filteredAndSortedDeliveries.length > 0
              ? (currentPage - 1) * pageSize + 1
              : 0}
          </strong>{' '}
          to{' '}
          <strong>
            {Math.min(currentPage * pageSize, filteredAndSortedDeliveries.length)}
          </strong>{' '}
          of <strong>{filteredAndSortedDeliveries.length}</strong> unassigned orders
        </div>

        <div className="dispatcher-pagination__controls">
          <button
            type="button"
            className="dispatcher-pagination__btn"
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
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
            onClick={() => handlePageChange(currentPage + 1)}
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

