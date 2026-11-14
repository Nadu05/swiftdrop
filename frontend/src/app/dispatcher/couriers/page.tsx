'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Clock } from 'lucide-react';
import CourierSummaryCards from '@/components/dispatcher/couriers/CourierSummaryCards';
import CourierFilters from '@/components/dispatcher/couriers/CourierFilters';
import CourierTable from '@/components/dispatcher/couriers/CourierTable';
import CourierDetailsModal from '@/components/dispatcher/couriers/CourierDetailsModal';
import {
  getCourierProfiles,
  calculateCourierSummaryMetrics,
} from '@/components/dispatcher/couriers/couriersApi';
import type {
  CourierProfile,
  CourierSummaryMetrics,
  WorkloadFilter,
  SortOption,
} from '@/components/dispatcher/couriers/types';

export default function CourierManagementPage() {
  const [couriers, setCouriers] = useState<CourierProfile[]>([]);
  const [metrics, setMetrics] = useState<CourierSummaryMetrics>({
    totalCouriers: 0,
    availableCouriers: 0,
    couriersOnDelivery: 0,
    unavailableCouriers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [workloadFilter, setWorkloadFilter] = useState<WorkloadFilter>('ALL');
  const [sortOption, setSortOption] = useState<SortOption>('name_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Selected courier for details dialog
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
      setError(null);
      const profiles = await getCourierProfiles();
      setCouriers(profiles);
      setMetrics(calculateCourierSummaryMetrics(profiles));
      setLastUpdated(formatTimestamp());
    } catch (err: any) {
      console.error('Failed to load couriers fleet:', err);
      setError('Unable to reach Dispatch Service. Please check that the backend is running at http://localhost:8084.');
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

    // 1. Search filter: by Courier Name OR Courier ID (e.g. CR-101)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.courierCode.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      );
    }

    // 2. Availability filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'AVAILABLE') {
        result = result.filter((c) => c.status === 'AVAILABLE');
      } else if (statusFilter === 'BUSY') {
        result = result.filter((c) => c.status === 'BUSY');
      } else if (statusFilter === 'UNAVAILABLE') {
        result = result.filter((c) => c.status === 'ON_BREAK' || c.status === 'OFFLINE');
      }
    }

    // 3. Vehicle Type filter
    if (vehicleFilter !== 'ALL') {
      result = result.filter((c) => c.vehicleType === vehicleFilter);
    }

    // 4. Workload filter
    if (workloadFilter !== 'ALL') {
      result = result.filter((c) => {
        const percent = (c.activeDeliveries / c.maxCapacity) * 100;
        if (workloadFilter === 'LOW') return percent < 40;
        if (workloadFilter === 'MODERATE') return percent >= 40 && percent < 80;
        if (workloadFilter === 'HIGH') return percent >= 80;
        if (workloadFilter === 'FULL') return c.activeDeliveries >= c.maxCapacity;
        return true;
      });
    }

    // 5. Sorting
    result.sort((a, b) => {
      if (sortOption === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortOption === 'name_desc') {
        return b.name.localeCompare(a.name);
      }
      if (sortOption === 'workload_high') {
        const ratioA = a.activeDeliveries / a.maxCapacity;
        const ratioB = b.activeDeliveries / b.maxCapacity;
        return ratioB - ratioA;
      }
      if (sortOption === 'workload_low') {
        const ratioA = a.activeDeliveries / a.maxCapacity;
        const ratioB = b.activeDeliveries / b.maxCapacity;
        return ratioA - ratioB;
      }
      if (sortOption === 'completed_high') {
        return b.completedToday - a.completedToday;
      }
      return 0;
    });

    return result;
  }, [couriers, searchTerm, statusFilter, vehicleFilter, workloadFilter, sortOption]);

  // Reset page when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, vehicleFilter, workloadFilter]);

  // Dynamic summary metrics calculated from the actual active couriers list
  const calculatedMetrics = useMemo(() => {
    return calculateCourierSummaryMetrics(couriers);
  }, [couriers]);

  // Pagination calculation
  const totalFilteredCount = filteredCouriers.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const paginatedCouriers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCouriers.slice(start, start + pageSize);
  }, [filteredCouriers, currentPage, pageSize]);

  return (
    <div className="dispatcher-overview">
      {/* 1. Page Header matching standard Dispatcher design */}
      <header className="dispatcher-overview__header">
        <div className="dispatcher-overview__title-group">
          <h1 className="dispatcher-overview__title">Courier Management</h1>
          <p className="dispatcher-overview__subtitle">
            Monitor courier availability, workloads and delivery performance.
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

      {/* 2. Summary Cards */}
      <CourierSummaryCards metrics={calculatedMetrics} />

      {/* 3. Filters Toolbar */}
      <CourierFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        vehicleFilter={vehicleFilter}
        onVehicleFilterChange={setVehicleFilter}
        workloadFilter={workloadFilter}
        onWorkloadFilterChange={setWorkloadFilter}
        sortOption={sortOption}
        onSortOptionChange={setSortOption}
      />

      {/* 4. Couriers Table */}
      <CourierTable
        couriers={paginatedCouriers}
        isLoading={isLoading}
        error={error}
        onViewDetails={(courier) => setSelectedCourier(courier)}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalFilteredCount={totalFilteredCount}
        pageSize={pageSize}
      />

      {/* 5. Courier Details Modal */}
      <CourierDetailsModal
        courier={selectedCourier}
        isOpen={Boolean(selectedCourier)}
        onClose={() => setSelectedCourier(null)}
      />
    </div>
  );
}
