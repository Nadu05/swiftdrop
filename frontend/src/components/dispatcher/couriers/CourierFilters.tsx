'use client';

import { Search, Filter, Truck, Gauge, ArrowUpDown } from 'lucide-react';
import type { WorkloadFilter, SortOption } from './types';

interface CourierFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  vehicleFilter: string;
  onVehicleFilterChange: (value: string) => void;
  workloadFilter: WorkloadFilter;
  onWorkloadFilterChange: (value: WorkloadFilter) => void;
  sortOption: SortOption;
  onSortOptionChange: (value: SortOption) => void;
}

export default function CourierFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  vehicleFilter,
  onVehicleFilterChange,
  workloadFilter,
  onWorkloadFilterChange,
  sortOption,
  onSortOptionChange,
}: CourierFiltersProps) {
  return (
    <div className="dispatcher-table-toolbar">
      {/* Search Bar (Name & Courier ID) */}
      <div className="dispatcher-search-input-wrapper">
        <Search size={15} className="dispatcher-search-icon" aria-hidden="true" />
        <input
          type="text"
          className="dispatcher-search-input"
          placeholder="Search by Courier Name or Courier ID (CR-101)..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search couriers by name or ID"
        />
      </div>

      {/* Filter Controls */}
      <div className="dispatcher-toolbar-filters">
        {/* Availability Status Filter */}
        <div className="dispatcher-select-wrapper">
          <Filter size={14} className="dispatcher-select-icon" aria-hidden="true" />
          <select
            className="dispatcher-select"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            aria-label="Filter couriers by availability"
          >
            <option value="ALL">All Availabilities</option>
            <option value="AVAILABLE">Available for Dispatch</option>
            <option value="BUSY">On Delivery / Busy</option>
            <option value="UNAVAILABLE">Unavailable (Break / Offline)</option>
          </select>
        </div>

        {/* Vehicle Type Filter */}
        <div className="dispatcher-select-wrapper">
          <Truck size={14} className="dispatcher-select-icon" aria-hidden="true" />
          <select
            className="dispatcher-select"
            value={vehicleFilter}
            onChange={(e) => onVehicleFilterChange(e.target.value)}
            aria-label="Filter couriers by vehicle type"
          >
            <option value="ALL">All Vehicles</option>
            <option value="Motorcycle">Motorcycle</option>
            <option value="Van">Van</option>
            <option value="Bicycle">Bicycle</option>
          </select>
        </div>

        {/* Workload Filter */}
        <div className="dispatcher-select-wrapper">
          <Gauge size={14} className="dispatcher-select-icon" aria-hidden="true" />
          <select
            className="dispatcher-select"
            value={workloadFilter}
            onChange={(e) => onWorkloadFilterChange(e.target.value as WorkloadFilter)}
            aria-label="Filter couriers by workload level"
          >
            <option value="ALL">All Workloads</option>
            <option value="LOW">Low Load (&lt; 40%)</option>
            <option value="MODERATE">Moderate Load (40% - 79%)</option>
            <option value="HIGH">High Load (≥ 80%)</option>
            <option value="FULL">At Max Capacity (100%)</option>
          </select>
        </div>

        {/* Sorting Options */}
        <div className="dispatcher-select-wrapper">
          <ArrowUpDown size={14} className="dispatcher-select-icon" aria-hidden="true" />
          <select
            className="dispatcher-select"
            value={sortOption}
            onChange={(e) => onSortOptionChange(e.target.value as SortOption)}
            aria-label="Sort couriers"
          >
            <option value="name_asc">Name: A to Z</option>
            <option value="name_desc">Name: Z to A</option>
            <option value="workload_high">Workload: High to Low</option>
            <option value="workload_low">Workload: Low to High</option>
            <option value="completed_high">Completed Orders: High to Low</option>
          </select>
        </div>
      </div>
    </div>
  );
}
