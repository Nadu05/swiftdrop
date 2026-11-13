'use client';

import React from 'react';
import { Search, Filter, RotateCcw, ArrowUpDown, Tag } from 'lucide-react';
import type {
  MerchantApprovalFilterState,
  MerchantApplicationStatus,
  MerchantBusinessCategory,
} from './types';

interface MerchantApprovalFiltersProps {
  filters: MerchantApprovalFilterState;
  onChange: (updated: MerchantApprovalFilterState) => void;
  onReset: () => void;
  isLoading?: boolean;
}

export default function MerchantApprovalFilters({
  filters,
  onChange,
  onReset,
  isLoading = false,
}: MerchantApprovalFiltersProps) {
  const isFiltered =
    filters.searchTerm.trim() !== '' ||
    filters.status !== 'ALL' ||
    filters.category !== 'ALL' ||
    filters.sortOrder !== 'newest';

  return (
    <section className="dispatcher-reports-filters-card" aria-label="Approval Queue Filters">
      <div className="dispatcher-reports-filters-header">
        <div className="dispatcher-reports-filters-title-group">
          <Filter size={16} className="dispatcher-reports-filters-icon" aria-hidden="true" />
          <span className="dispatcher-reports-filters-title">Filter Approval Queue</span>
        </div>

        {isFiltered && (
          <button
            type="button"
            className="dispatcher-reports-reset-btn"
            onClick={onReset}
            disabled={isLoading}
            title="Reset filters to default"
          >
            <RotateCcw size={13} aria-hidden="true" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      <div className="dispatcher-reports-filters-grid">
        {/* Search input */}
        <div className="dispatcher-reports-filter-group" style={{ flex: 1.4 }}>
          <label htmlFor="merchant-search-input" className="dispatcher-reports-filter-label">
            <Search size={13} aria-hidden="true" />
            <span>Search Application</span>
          </label>
          <div className="dispatcher-select-wrapper">
            <input
              id="merchant-search-input"
              type="text"
              className="dispatcher-reports-date-input"
              placeholder="Search business name, application ID (APP-...), or BRN..."
              value={filters.searchTerm}
              onChange={(e) => onChange({ ...filters, searchTerm: e.target.value })}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Status filter */}
        <div className="dispatcher-reports-filter-group">
          <label htmlFor="merchant-status-select" className="dispatcher-reports-filter-label">
            <span>Application Status</span>
          </label>
          <div className="dispatcher-select-wrapper">
            <select
              id="merchant-status-select"
              className="dispatcher-select dispatcher-reports-select"
              value={filters.status}
              onChange={(e) =>
                onChange({ ...filters, status: e.target.value as 'ALL' | MerchantApplicationStatus })
              }
              disabled={isLoading}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="CORRECTIONS_REQUESTED">Corrections Requested</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Category filter */}
        <div className="dispatcher-reports-filter-group">
          <label htmlFor="merchant-category-select" className="dispatcher-reports-filter-label">
            <Tag size={13} aria-hidden="true" />
            <span>Business Category</span>
          </label>
          <div className="dispatcher-select-wrapper">
            <select
              id="merchant-category-select"
              className="dispatcher-select dispatcher-reports-select"
              value={filters.category}
              onChange={(e) =>
                onChange({ ...filters, category: e.target.value as 'ALL' | MerchantBusinessCategory })
              }
              disabled={isLoading}
            >
              <option value="ALL">All Categories</option>
              <option value="GROCERY_FOOD">Grocery / Food</option>
              <option value="PHARMACY">Pharmacy</option>
              <option value="RETAIL">Retail</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        {/* Sort order */}
        <div className="dispatcher-reports-filter-group">
          <label htmlFor="merchant-sort-select" className="dispatcher-reports-filter-label">
            <ArrowUpDown size={13} aria-hidden="true" />
            <span>Sort By Submission</span>
          </label>
          <div className="dispatcher-select-wrapper">
            <select
              id="merchant-sort-select"
              className="dispatcher-select dispatcher-reports-select"
              value={filters.sortOrder}
              onChange={(e) =>
                onChange({ ...filters, sortOrder: e.target.value as 'newest' | 'oldest' })
              }
              disabled={isLoading}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}

