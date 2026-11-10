'use client';

import { Search, Filter, Calendar, ArrowUpDown } from 'lucide-react';

interface AssignmentFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (value: string) => void;
  dateFilter: string;
  onDateFilterChange: (value: string) => void;
  sortOrder: 'newest' | 'oldest';
  onSortOrderToggle: () => void;
}

export default function AssignmentFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  dateFilter,
  onDateFilterChange,
  sortOrder,
  onSortOrderToggle,
}: AssignmentFiltersProps) {
  return (
    <div className="dispatcher-table-toolbar">
      {/* Search Input */}
      <div className="dispatcher-search-input-wrapper">
        <Search size={15} className="dispatcher-search-icon" aria-hidden="true" />
        <input
          type="text"
          className="dispatcher-search-input"
          placeholder="Search by Order ID, courier, or recipient..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search assignments"
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
            aria-label="Filter assignments by status"
          >
            <option value="ALL">All Assignment Statuses</option>
            <option value="ACTIVE">All Active (Assigned, Accepted, In Transit)</option>
            <option value="ASSIGNED">Assigned (Pending Acceptance)</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="DELIVERED">Delivered</option>
            <option value="REASSIGNED">Reassigned</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="dispatcher-select-wrapper">
          <select
            className="dispatcher-select"
            value={priorityFilter}
            onChange={(e) => onPriorityFilterChange(e.target.value)}
            aria-label="Filter by delivery priority"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent Priority</option>
            <option value="HIGH">High Priority</option>
            <option value="NORMAL">Standard Priority</option>
          </select>
        </div>

        {/* Date Filter */}
        <div className="dispatcher-select-wrapper">
          <Calendar size={14} className="dispatcher-select-icon" aria-hidden="true" />
          <select
            className="dispatcher-select"
            value={dateFilter}
            onChange={(e) => onDateFilterChange(e.target.value)}
            aria-label="Filter assignments by date range"
          >
            <option value="ALL">All Assigned Dates</option>
            <option value="TODAY">Today (Nov 10)</option>
            <option value="YESTERDAY">Yesterday (Nov 09)</option>
            <option value="OLDER">Older</option>
          </select>
        </div>

        {/* Sort Order Toggle */}
        <button
          type="button"
          className="dispatcher-sort-btn"
          onClick={onSortOrderToggle}
          title={`Sort order: currently ${sortOrder}`}
          aria-label={`Toggle sort order. Currently ${sortOrder}`}
        >
          <ArrowUpDown size={14} aria-hidden="true" />
          <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
        </button>
      </div>
    </div>
  );
}

