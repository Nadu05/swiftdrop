'use client';

import { Search, Filter, User, Calendar, ArrowUpDown, ShieldAlert } from 'lucide-react';

interface DeliveryHistoryFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  courierFilter: string;
  onCourierFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (value: string) => void;
  dateFilter: string;
  onDateFilterChange: (value: string) => void;
  sortOrder: 'newest' | 'oldest';
  onSortOrderToggle: () => void;
  couriersList: string[];
}

export default function DeliveryHistoryFilters({
  searchTerm,
  onSearchChange,
  courierFilter,
  onCourierFilterChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  dateFilter,
  onDateFilterChange,
  sortOrder,
  onSortOrderToggle,
  couriersList,
}: DeliveryHistoryFiltersProps) {
  return (
    <div className="dispatcher-table-toolbar">
      {/* Search Input */}
      <div className="dispatcher-search-input-wrapper">
        <Search size={15} className="dispatcher-search-icon" aria-hidden="true" />
        <input
          type="text"
          className="dispatcher-search-input"
          placeholder="Search by Order ID, Tracking #, or Recipient..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search delivery history"
        />
      </div>

      {/* Filter Controls */}
      <div className="dispatcher-toolbar-filters">
        {/* Status Filter */}
        <div className="dispatcher-select-wrapper">
          <Filter size={14} className="dispatcher-select-icon" aria-hidden="true" />
          <select
            className="dispatcher-select"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            aria-label="Filter deliveries by final status"
          >
            <option value="ALL">All Statuses</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
            <option value="RETURNED">Returned</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Courier Filter */}
        <div className="dispatcher-select-wrapper">
          <User size={14} className="dispatcher-select-icon" aria-hidden="true" />
          <select
            className="dispatcher-select"
            value={courierFilter}
            onChange={(e) => onCourierFilterChange(e.target.value)}
            aria-label="Filter deliveries by assigned courier"
          >
            <option value="ALL">All Couriers</option>
            {couriersList.map((courierName) => (
              <option key={courierName} value={courierName}>
                {courierName}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div className="dispatcher-select-wrapper">
          <ShieldAlert size={14} className="dispatcher-select-icon" aria-hidden="true" />
          <select
            className="dispatcher-select"
            value={priorityFilter}
            onChange={(e) => onPriorityFilterChange(e.target.value)}
            aria-label="Filter by order priority"
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="URGENT">Urgent Priority</option>
            <option value="NORMAL">Normal Priority</option>
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="dispatcher-select-wrapper">
          <Calendar size={14} className="dispatcher-select-icon" aria-hidden="true" />
          <select
            className="dispatcher-select"
            value={dateFilter}
            onChange={(e) => onDateFilterChange(e.target.value)}
            aria-label="Filter by delivery date range"
          >
            <option value="ALL">All Recorded Dates</option>
            <option value="TODAY">Delivered Today (Nov 10)</option>
            <option value="YESTERDAY">Delivered Yesterday (Nov 09)</option>
            <option value="7_DAYS">Past 7 Days</option>
          </select>
        </div>

        {/* Sort Order Toggle */}
        <button
          type="button"
          className="dispatcher-sort-btn"
          onClick={onSortOrderToggle}
          title={`Sort: currently ${sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}`}
          aria-label={`Toggle sort order. Currently ${sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}`}
        >
          <ArrowUpDown size={14} aria-hidden="true" />
          <span>{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
        </button>
      </div>
    </div>
  );
}

