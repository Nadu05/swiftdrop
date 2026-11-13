'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Clock } from 'lucide-react';
import DeliveryHistorySummary from '@/components/dispatcher/history/DeliveryHistorySummary';
import DeliveryHistoryFilters from '@/components/dispatcher/history/DeliveryHistoryFilters';
import DeliveryHistoryTable from '@/components/dispatcher/history/DeliveryHistoryTable';
import DeliveryHistoryDetails from '@/components/dispatcher/history/DeliveryHistoryDetails';
import {
  getDeliveryHistory,
  calculateHistoryMetrics,
} from '@/components/dispatcher/history/historyApi';
import type {
  DeliveryHistoryRecord,
  DeliveryHistorySummaryMetrics,
} from '@/components/dispatcher/history/types';

export default function DeliveryHistoryPage() {
  const [deliveries, setDeliveries] = useState<DeliveryHistoryRecord[]>([]);
  const [metrics, setMetrics] = useState<DeliveryHistorySummaryMetrics>({
    totalDeliveries: 0,
    successfullyDelivered: 0,
    failedDeliveries: 0,
    totalDeliveryAttempts: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [courierFilter, setCourierFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Selected delivery for investigation modal
  const [selectedRecord, setSelectedRecord] = useState<DeliveryHistoryRecord | null>(null);

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
      const result = await getDeliveryHistory();
      setDeliveries(result.deliveries);
      setMetrics(result.metrics);
      setLastUpdated(formatTimestamp());
    } catch (err: any) {
      console.error('Failed to load delivery history:', err);
      setError('Unable to load delivery history records. Please check your connection.');
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

  // Unique couriers list for the dropdown filter
  const couriersList = useMemo(() => {
    const names = new Set<string>();
    deliveries.forEach((d) => {
      if (d.courier.name) names.add(d.courier.name);
    });
    return Array.from(names).sort();
  }, [deliveries]);

  // Filter & Sort Pipeline
  const filteredDeliveries = useMemo(() => {
    let result = [...deliveries];

    // 1. Search by Order ID, Tracking #, or Recipient Name
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.orderId.toLowerCase().includes(q) ||
          d.trackingNumber.toLowerCase().includes(q) ||
          d.recipient.name.toLowerCase().includes(q)
      );
    }

    // 2. Filter by Courier
    if (courierFilter !== 'ALL') {
      result = result.filter((d) => d.courier.name === courierFilter);
    }

    // 3. Filter by Status
    if (statusFilter !== 'ALL') {
      result = result.filter((d) => d.status === statusFilter);
    }

    // 4. Filter by Priority
    if (priorityFilter !== 'ALL') {
      result = result.filter((d) => d.priority === priorityFilter);
    }

    // 5. Date Range filter
    if (dateFilter !== 'ALL') {
      const nov10Str = '2026-11-10';
      const nov09Str = '2026-11-09';
      if (dateFilter === 'TODAY') {
        result = result.filter((d) => d.completedAt.startsWith(nov10Str));
      } else if (dateFilter === 'YESTERDAY') {
        result = result.filter((d) => d.completedAt.startsWith(nov09Str));
      } else if (dateFilter === '7_DAYS') {
        const sevenDaysAgo = new Date('2026-11-03T00:00:00Z').getTime();
        result = result.filter((d) => new Date(d.completedAt).getTime() >= sevenDaysAgo);
      }
    }

    // 6. Sorting
    result.sort((a, b) => {
      const timeA = new Date(a.completedAt).getTime();
      const timeB = new Date(b.completedAt).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [deliveries, searchTerm, courierFilter, statusFilter, priorityFilter, dateFilter, sortOrder]);

  // Reset page when any filter criteria changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, courierFilter, statusFilter, priorityFilter, dateFilter]);

  // Dynamic metrics calculated from current dataset
  const calculatedMetrics = useMemo(() => {
    return calculateHistoryMetrics(deliveries);
  }, [deliveries]);

  // Pagination calculation
  const totalFilteredCount = filteredDeliveries.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const paginatedDeliveries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDeliveries.slice(start, start + pageSize);
  }, [filteredDeliveries, currentPage, pageSize]);

  return (
    <div className="dispatcher-overview">
      {/* 1. Header with exact styling matching other dispatcher pages */}
      <header className="dispatcher-overview__header">
        <div className="dispatcher-overview__title-group">
          <h1 className="dispatcher-overview__title">Delivery History</h1>
          <p className="dispatcher-overview__subtitle">
            View and investigate completed, failed and previous delivery activities.
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
            aria-label="Refresh delivery history archives"
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

      {/* 2. Summary KPI Cards */}
      <DeliveryHistorySummary metrics={calculatedMetrics} />

      {/* 3. Search and Filters Toolbar */}
      <DeliveryHistoryFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        courierFilter={courierFilter}
        onCourierFilterChange={setCourierFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        sortOrder={sortOrder}
        onSortOrderToggle={() =>
          setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))
        }
        couriersList={couriersList}
      />

      {/* 4. Delivery History Table */}
      <DeliveryHistoryTable
        deliveries={paginatedDeliveries}
        isLoading={isLoading}
        error={error}
        onViewDetails={(rec) => setSelectedRecord(rec)}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalFilteredCount={totalFilteredCount}
        pageSize={pageSize}
      />

      {/* 5. Delivery Investigation Details Modal */}
      <DeliveryHistoryDetails
        record={selectedRecord}
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
      />
    </div>
  );
}
