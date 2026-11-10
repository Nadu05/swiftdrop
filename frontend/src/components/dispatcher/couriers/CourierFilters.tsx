'use client';

import { Search, Filter, MapPin, ArrowUpDown, Truck } from 'lucide-react';

interface CourierFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  vehicleFilter: string;
  onVehicleFilterChange: (value: string) => void;
  zoneFilter: string;
  onZoneFilterChange: (value: string) => void;
  sortOrder: 'name' | 'workload';
  onSortOrderToggle: () => void;
}

export default function CourierFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  vehicleFilter,
  onVehicleFilterChange,
  zoneFilter,
  onZoneFilterChange,
  sortOrder,
  onSortOrderToggle,
}: CourierFiltersProps) {
  const zonesList = [
    'ALL',
    'Zone A - Colombo Central',
    'Zone B - Colombo East',
    'Zone C - Colombo South',
    'Zone E - Kelaniya / Kadawatha',
  ];

  return (
    <div className="dispatcher-table-toolbar">
      {/* Search Bar */}
      <div className="dispatcher-search-input-wrapper">
        <Search size={15} className="dispatcher-search-icon" aria-hidden="true" />
        <input
          type="text"
          className="dispatcher-search-input"
          placeholder="Search courier name, code (CR-101), plate..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search courier fleet"
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
            aria-label="Filter couriers by availability status"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="BUSY">On Delivery / Busy</option>
            <option value="ON_BREAK">On Break</option>
            <option value="OFFLINE">Offline</option>
          </select>
        </div>

        {/* Vehicle Filter */}
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

        {/* Zone Filter */}
        <div className="dispatcher-select-wrapper">
          <MapPin size={14} className="dispatcher-select-icon" aria-hidden="true" />
          <select
            className="dispatcher-select"
            value={zoneFilter}
            onChange={(e) => onZoneFilterChange(e.target.value)}
            aria-label="Filter couriers by zone"
          >
            {zonesList.map((z) => (
              <option key={z} value={z}>
                {z === 'ALL' ? 'All Assigned Zones' : z}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Order Toggle */}
        <button
          type="button"
          className="dispatcher-sort-btn"
          onClick={onSortOrderToggle}
          title={`Sort: currently ${sortOrder === 'name' ? 'Alphabetical' : 'Active Workload'}`}
          aria-label={`Toggle sort order. Currently ${sortOrder === 'name' ? 'Alphabetical' : 'Active Workload'}`}
        >
          <ArrowUpDown size={14} aria-hidden="true" />
          <span>{sortOrder === 'name' ? 'Sort: Name' : 'Sort: Workload'}</span>
        </button>
      </div>
    </div>
  );
}

