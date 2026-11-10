'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Clock } from 'lucide-react';
import CourierFleetSummary from '@/components/dispatcher/couriers/CourierFleetSummary';
import CourierFilters from '@/components/dispatcher/couriers/CourierFilters';
import CourierTable from '@/components/dispatcher/couriers/CourierTable';
import CourierProfileModal from '@/components/dispatcher/couriers/CourierProfileModal';
import {
  getCourierProfiles,
  getCourierFleetSummary,
} from '@/components/dispatcher/couriers/couriersApi';
import type {
  CourierProfile,
  CourierFleetSummaryMetrics,
} from '@/components/dispatcher/couriers/types';

export default function CouriersPage() {
  const [couriers, setCouriers] = useState<CourierProfile[]>([]);
  const [metrics, setMetrics] = useState<CourierFleetSummaryMetrics>({
    totalFleet: 0,
    available: 0,
    busy: 0,
    onBreak: 0,
    offline: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'name' | 'workload'>('name');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Selected courier for profile dialog
  const [selectedCourier, setSelectedCourier] = useState<CourierProfile | null>(null);

  const formatTimestamp = () => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date());
  };

  const loadData = useCallback(async () => {
    try {
      const [profiles, summary] = await Promise.all([
        getCourierProfiles(),
        getCourierFleetSummary(),
      ]);
      setCouriers(profiles);
      setMetrics(summary);
      setLastUpdated(formatTimestamp());
    } catch (err) {
      console.error('Failed to load couriers fleet:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  // Filter & Sort Pipeline
  const filteredCouriers = useMemo(() => {
    let result = [...couriers];

    // 1. Search filter (Name, Code, Vehicle Plate, Phone)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.courierCode.toLowerCase().includes(q) ||
          c.vehiclePlate.toLowerCase().includes(q) ||
          c.phone.includes(q)
      );
    }

    // 2. Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((c) => c.status === statusFilter);
    }

    // 3. Vehicle filter
    if (vehicleFilter !== 'ALL') {
      result = result.filter((c) => c.vehicleType === vehicleFilter);
    }

    // 4. Zone filter
    if (zoneFilter !== 'ALL') {
      result = result.filter((c) => c.zone === zoneFilter);
    }

    // 5. Sorting
    result.sort((a, b) => {
      if (sortOrder === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        // Sort by active workload percentage descending
        const ratioA = a.activeDeliveries / a.maxCapacity;
        const ratioB = b.activeDeliveries / b.maxCapacity;
        return ratioB - ratioA;
      }
    });

    return result;
  }, [couriers, searchTerm, statusFilter, vehicleFilter, zoneFilter, sortOrder]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, vehicleFilter, zoneFilter]);

  // Pagination calculation
  const totalFilteredCount = filteredCouriers.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const paginatedCouriers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCouriers.slice(start, start + pageSize);
  }, [filteredCouriers, currentPage, pageSize]);

  return (
    <div className="dispatcher-overview">
      {/* 1. Header with exact styling matching other dispatcher pages */}
      <header className="dispatcher-overview__header">
        <div className="dispatcher-overview__title-group">
          <h1 className="dispatcher-overview__title">Courier Fleet Management</h1>
          <p className="dispatcher-overview__subtitle">
            Monitor workforce availability, vehicle capacity, and courier assignments.
          </p>
        </div>

        <div className="dispatcher-overview__actions">
          {lastUpdated && (
            <div className="dispatcher-overview__date-badge" title="Live data last sync time">
              <Clock size={14} className="dispatcher-overview__date-icon" aria-hidden="true" />
              <span>Last updated: {lastUpdated}</span>
            </div>
          )}

          <button
            type="button"
            className="dispatcher-overview__refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            aria-label="Refresh courier workforce data"
          >
            <RefreshCw
              size={15}
              className={`dispatcher-overview__refresh-icon ${
                isRefreshing ? 'dispatcher-overview__refresh-icon--spinning' : ''
              }`}
              aria-hidden="true"
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* 2. Fleet Summary Cards */}
      <CourierFleetSummary metrics={metrics} />

      {/* 3. Filters Toolbar */}
      <CourierFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        vehicleFilter={vehicleFilter}
        onVehicleFilterChange={setVehicleFilter}
        zoneFilter={zoneFilter}
        onZoneFilterChange={setZoneFilter}
        sortOrder={sortOrder}
        onSortOrderToggle={() =>
          setSortOrder((prev) => (prev === 'name' ? 'workload' : 'name'))
        }
      />

      {/* 4. Couriers Table */}
      <CourierTable
        couriers={paginatedCouriers}
        isLoading={isLoading}
        onViewProfile={(courier) => setSelectedCourier(courier)}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalFilteredCount={totalFilteredCount}
        pageSize={pageSize}
      />

      {/* 5. Courier Profile Modal */}
      <CourierProfileModal
        courier={selectedCourier}
        isOpen={Boolean(selectedCourier)}
        onClose={() => setSelectedCourier(null)}
      />
    </div>
  );
}
