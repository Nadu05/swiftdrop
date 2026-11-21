'use client';

import React from 'react';
import { Search, Building2, Filter, RotateCcw } from 'lucide-react';
import type { ZoneFilterState, ZoneStatus } from './types';

interface ZoneFiltersProps {
  filters: ZoneFilterState;
  branches: { id: string; name: string; code: string }[];
  onChange: (updated: ZoneFilterState) => void;
  onReset: () => void;
  isLoading?: boolean;
}

export default function ZoneFilters({
  filters,
  branches,
  onChange,
  onReset,
  isLoading = false,
}: ZoneFiltersProps) {
  const isFiltered =
    filters.searchTerm.trim() !== '' ||
    filters.branchId !== 'ALL' ||
    filters.status !== 'ALL';

  return (
    <section className="dispatcher-reports-filters-card" aria-label="Zone Filters">
      <div className="dispatcher-reports-filters-header">
        <div className="dispatcher-reports-filters-title-group">
          <Filter size={16} className="dispatcher-reports-filters-icon" aria-hidden="true" />
          <span className="dispatcher-reports-filters-title">Filter Delivery Zones</span>
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
        {/* Search Input */}
        <div className="dispatcher-reports-filter-group" style={{ flex: 1.5 }}>
          <label htmlFor="zone-search-input" className="dispatcher-reports-filter-label">
            <Search size={13} aria-hidden="true" />
            <span>Search Zone / Area</span>
          </label>
          <div className="dispatcher-select-wrapper">
            <input
              id="zone-search-input"
              type="text"
              className="dispatcher-reports-date-input"
              placeholder="Search by zone name, code, or suburb..."
              value={filters.searchTerm}
              onChange={(e) => onChange({ ...filters, searchTerm: e.target.value })}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Branch Filter */}
        <div className="dispatcher-reports-filter-group">
          <label htmlFor="zone-branch-select" className="dispatcher-reports-filter-label">
            <Building2 size={13} aria-hidden="true" />
            <span>Associated Branch</span>
          </label>
          <div className="dispatcher-select-wrapper">
            <select
              id="zone-branch-select"
              className="dispatcher-select dispatcher-reports-select"
              value={filters.branchId}
              onChange={(e) => onChange({ ...filters, branchId: e.target.value })}
              disabled={isLoading}
            >
              <option value="ALL">All Branches ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter */}
        <div className="dispatcher-reports-filter-group">
          <label htmlFor="zone-status-select" className="dispatcher-reports-filter-label">
            <span>Status</span>
          </label>
          <div className="dispatcher-select-wrapper">
            <select
              id="zone-status-select"
              className="dispatcher-select dispatcher-reports-select"
              value={filters.status}
              onChange={(e) =>
                onChange({ ...filters, status: e.target.value as 'ALL' | ZoneStatus })
              }
              disabled={isLoading}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}

