'use client';

import { Filter, RotateCcw, Search, X } from 'lucide-react';
import type { BranchStatusFilter } from '@/types/organization.types';

export interface BranchFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: BranchStatusFilter;
  onStatusFilterChange: (status: BranchStatusFilter) => void;
  totalCount: number;
  filteredCount: number;
  activeCount: number;
  inactiveCount: number;
  onResetFilters: () => void;
}

const STATUS_OPTIONS: readonly {
  value: BranchStatusFilter;
  label: string;
}[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

export default function BranchFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  totalCount,
  filteredCount,
  activeCount,
  inactiveCount,
  onResetFilters,
}: BranchFiltersProps) {
  const hasActiveFilters = searchQuery.trim().length > 0 || statusFilter !== 'ALL';

  const getOptionCount = (value: BranchStatusFilter): number => {
    if (value === 'ACTIVE') return activeCount;
    if (value === 'INACTIVE') return inactiveCount;
    return totalCount;
  };

  return (
    <div className="org-filters" role="region" aria-label="Branch directory search and filters">
      <div className="org-filters__search-wrap">
        <Search size={16} className="org-filters__search-icon" aria-hidden="true" />
        <input
          type="search"
          className="org-filters__search-input"
          placeholder="Search by branch code, name, or city (e.g. CMB-CENTRAL, Colombo)..."
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="Search branches by code, name, or city"
        />
        {searchQuery && (
          <button
            type="button"
            className="org-filters__clear-btn"
            onClick={() => onSearchChange('')}
            aria-label="Clear search query"
            title="Clear search"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="org-filters__controls">
        <div
          className="org-filters__status-group"
          role="group"
          aria-label="Filter branches by status"
        >
          <span className="org-filters__status-label">
            <Filter size={13} aria-hidden="true" />
            <span>Status:</span>
          </span>

          {STATUS_OPTIONS.map((option) => {
            const isSelected = statusFilter === option.value;
            const count = getOptionCount(option.value);

            return (
              <button
                key={option.value}
                type="button"
                className={`org-filters__status-pill${
                  isSelected ? ' org-filters__status-pill--active' : ''
                }`}
                onClick={() => onStatusFilterChange(option.value)}
                aria-pressed={isSelected}
              >
                <span>{option.label}</span>
                <span className="org-filters__status-count">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="org-filters__meta">
          <span className="org-filters__result-count" aria-live="polite">
            Showing <strong>{filteredCount}</strong> of <strong>{totalCount}</strong>{' '}
            {totalCount === 1 ? 'branch' : 'branches'}
          </span>

          {hasActiveFilters && (
            <button
              type="button"
              className="org-filters__reset-btn"
              onClick={onResetFilters}
            >
              <RotateCcw size={13} aria-hidden="true" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

