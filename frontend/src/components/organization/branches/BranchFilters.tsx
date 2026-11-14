'use client';

import { Filter, RotateCcw, Search, X } from 'lucide-react';
import type { BranchStatusFilter } from '@/types/organization.types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    <div
      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
      role="region"
      aria-label="Branch directory search and filters"
    >
      {/* Search Input Bar */}
      <div className="relative w-full">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Search by branch code, name, or city (e.g. CMB-CENTRAL, Colombo)..."
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          className="pl-10 pr-10 h-11 text-sm bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500"
          aria-label="Search branches by code, name, or city"
        />
        {searchQuery && (
          <button
            type="button"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            onClick={() => onSearchChange('')}
            aria-label="Clear search query"
            title="Clear search"
          >
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Filter Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter branches by status"
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 mr-1">
            <Filter size={13} aria-hidden="true" />
            <span>Status:</span>
          </span>

          {STATUS_OPTIONS.map((option) => {
            const isSelected = statusFilter === option.value;
            const count = getOptionCount(option.value);

            return (
              <Button
                key={option.value}
                type="button"
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                onClick={() => onStatusFilterChange(option.value)}
                className={`h-8 gap-2 rounded-full px-3 text-xs font-medium ${
                  isSelected
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
                aria-pressed={isSelected}
              >
                <span>{option.label}</span>
                <Badge
                  variant={isSelected ? 'secondary' : 'outline'}
                  className={`h-4 min-w-4 px-1 text-[10px] rounded-full border-0 ${
                    isSelected
                      ? 'bg-blue-500/30 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
            Showing <strong className="text-slate-900 dark:text-slate-100">{filteredCount}</strong> of{' '}
            <strong className="text-slate-900 dark:text-slate-100">{totalCount}</strong>{' '}
            {totalCount === 1 ? 'branch' : 'branches'}
          </span>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="h-8 gap-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              <RotateCcw size={13} aria-hidden="true" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
