'use client';

import React from 'react';
import { Calendar, Building2, Layers, RotateCcw, Filter } from 'lucide-react';
import type { ReportFilterState, DateRangePreset, ServiceTypeFilter } from './types';

interface ReportFiltersProps {
  filters: ReportFilterState;
  branches: { id: string; name: string; code: string }[];
  onChange: (updated: ReportFilterState) => void;
  onReset: () => void;
  isLoading?: boolean;
}

export default function ReportFilters({
  filters,
  branches,
  onChange,
  onReset,
  isLoading = false,
}: ReportFiltersProps) {
  const handleDateRangeChange = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      onChange({
        ...filters,
        dateRange: 'custom',
        startDate: filters.startDate || weekAgo,
        endDate: filters.endDate || today,
      });
    } else {
      onChange({
        ...filters,
        dateRange: preset,
      });
    }
  };

  const isFiltered =
    filters.dateRange !== 'last7days' ||
    filters.branchId !== 'ALL' ||
    filters.serviceType !== 'ALL';

  return (
    <section className="dispatcher-reports-filters-card" aria-label="Report Filters">
      <div className="dispatcher-reports-filters-header">
        <div className="dispatcher-reports-filters-title-group">
          <Filter size={16} className="dispatcher-reports-filters-icon" aria-hidden="true" />
          <span className="dispatcher-reports-filters-title">Filter Operations Report</span>
        </div>

        {isFiltered && (
          <button
            type="button"
            className="dispatcher-reports-reset-btn"
            onClick={onReset}
            disabled={isLoading}
            title="Reset all filters to default"
          >
            <RotateCcw size={13} aria-hidden="true" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      <div className="dispatcher-reports-filters-grid">
        {/* Date Range Selector */}
        <div className="dispatcher-reports-filter-group">
          <label htmlFor="report-date-range-select" className="dispatcher-reports-filter-label">
            <Calendar size={13} aria-hidden="true" />
            <span>Date Range</span>
          </label>
          <div className="dispatcher-select-wrapper">
            <select
              id="report-date-range-select"
              className="dispatcher-select dispatcher-reports-select"
              value={filters.dateRange}
              onChange={(e) => handleDateRangeChange(e.target.value as DateRangePreset)}
              disabled={isLoading}
            >
              <option value="today">Today</option>
              <option value="last7days">Last 7 Days (Default)</option>
              <option value="last30days">Last 30 Days</option>
              <option value="custom">Custom Date Range...</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Inputs (visible when 'custom' is active) */}
        {filters.dateRange === 'custom' && (
          <>
            <div className="dispatcher-reports-filter-group">
              <label htmlFor="report-start-date" className="dispatcher-reports-filter-label">
                <span>Start Date</span>
              </label>
              <input
                id="report-start-date"
                type="date"
                className="dispatcher-reports-date-input"
                value={filters.startDate || ''}
                onChange={(e) =>
                  onChange({ ...filters, startDate: e.target.value })
                }
                disabled={isLoading}
              />
            </div>

            <div className="dispatcher-reports-filter-group">
              <label htmlFor="report-end-date" className="dispatcher-reports-filter-label">
                <span>End Date</span>
              </label>
              <input
                id="report-end-date"
                type="date"
                className="dispatcher-reports-date-input"
                value={filters.endDate || ''}
                onChange={(e) =>
                  onChange({ ...filters, endDate: e.target.value })
                }
                disabled={isLoading}
              />
            </div>
          </>
        )}

        {/* Branch Filter */}
        <div className="dispatcher-reports-filter-group">
          <label htmlFor="report-branch-select" className="dispatcher-reports-filter-label">
            <Building2 size={13} aria-hidden="true" />
            <span>Branch</span>
          </label>
          <div className="dispatcher-select-wrapper">
            <select
              id="report-branch-select"
              className="dispatcher-select dispatcher-reports-select"
              value={filters.branchId}
              onChange={(e) =>
                onChange({ ...filters, branchId: e.target.value })
              }
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

        {/* Service Type Filter */}
        <div className="dispatcher-reports-filter-group">
          <label htmlFor="report-service-type-select" className="dispatcher-reports-filter-label">
            <Layers size={13} aria-hidden="true" />
            <span>Service Type</span>
          </label>
          <div className="dispatcher-select-wrapper">
            <select
              id="report-service-type-select"
              className="dispatcher-select dispatcher-reports-select"
              value={filters.serviceType}
              onChange={(e) =>
                onChange({ ...filters, serviceType: e.target.value as ServiceTypeFilter })
              }
              disabled={isLoading}
            >
              <option value="ALL">All Services</option>
              <option value="STANDARD">Standard Delivery</option>
              <option value="EXPRESS">Express Delivery</option>
              <option value="SAME_DAY">Same-Day Delivery</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}

