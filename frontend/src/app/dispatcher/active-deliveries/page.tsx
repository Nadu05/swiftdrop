'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Clock, AlertCircle } from 'lucide-react';
import ActiveDeliverySummary from '@/components/dispatcher/activeDeliveries/ActiveDeliverySummary';
import ActiveDeliveryFilters from '@/components/dispatcher/activeDeliveries/ActiveDeliveryFilters';
import ActiveDeliveryTable from '@/components/dispatcher/activeDeliveries/ActiveDeliveryTable';
import ActiveDeliveryDetails from '@/components/dispatcher/activeDeliveries/ActiveDeliveryDetails';
import { getActiveDeliveries } from '@/components/dispatcher/activeDeliveries/activeDeliveriesApi';
import type {
  ActiveDeliveryRecord,
  ActiveDeliverySummaryMetrics,
} from '@/components/dispatcher/activeDeliveries/types';

export default function ActiveDeliveriesPage() {
  const activeQuery = useQuery({
    queryKey: ['dispatch', 'active-deliveries'],
    queryFn: getActiveDeliveries,
    refetchInterval: 15_000,
  });

  const deliveries: ActiveDeliveryRecord[] = activeQuery.data?.deliveries ?? [];
  const metrics: ActiveDeliverySummaryMetrics = activeQuery.data?.metrics ?? {
    totalActive: 0,
    assigned: 0,
    accepted: 0,
    inTransit: 0,
  };
  const isLoading = activeQuery.isLoading;
  const isRefreshing = activeQuery.isFetching;
  const lastUpdated = activeQuery.dataUpdatedAt
    ? new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(activeQuery.dataUpdatedAt))
    : '';

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Details Modal State
  const [selectedDelivery, setSelectedDelivery] = useState<ActiveDeliveryRecord | null>(null);

  const handleRefresh = () => {
    activeQuery.refetch();
  };

  // Filter & Sort Pipeline
  const filteredDeliveries = useMemo(() => {
    let result = [...deliveries];

    // 1. Search by Order ID, Tracking Number, Courier Name, or Recipient
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.orderId.toLowerCase().includes(q) ||
          d.trackingNumber.toLowerCase().includes(q) ||
          d.courier.name.toLowerCase().includes(q) ||
          d.courier.code.toLowerCase().includes(q) ||
          d.recipient.name.toLowerCase().includes(q)
      );
    }

    // 2. Filter by Active Delivery Status
    if (statusFilter !== 'ALL') {
      result = result.filter((d) => d.deliveryStatus === statusFilter);
    }

    // 3. Filter by Priority
    if (priorityFilter !== 'ALL') {
      result = result.filter((d) => d.priority === priorityFilter);
    }

    // 4. Filter by Date (live calendar dates)
    if (dateFilter !== 'ALL') {
      const now = new Date();
      const today = now.toDateString();
      const yesterdayDate = new Date(now);
      yesterdayDate.setDate(now.getDate() - 1);
      const yesterday = yesterdayDate.toDateString();

      result = result.filter((d) => {
        const itemDate = new Date(d.assignedDate).toDateString();
        if (dateFilter === 'TODAY') return itemDate === today;
        if (dateFilter === 'YESTERDAY') return itemDate === yesterday;
        if (dateFilter === 'OLDER') return itemDate !== today && itemDate !== yesterday;
        return true;
      });
    }

    // 5. Sorting
    result.sort((a, b) => {
      const timeA = new Date(a.assignedDate).getTime();
      const timeB = new Date(b.assignedDate).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [deliveries, searchTerm, statusFilter, priorityFilter, dateFilter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredDeliveries.length / pageSize));
  const paginatedDeliveries = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredDeliveries.slice(startIndex, startIndex + pageSize);
  }, [filteredDeliveries, currentPage, pageSize]);

  return (
    <div className="dispatcher-overview">
      {/* 1. Header with Title, Last Updated Timestamp, and Refresh Action */}
      <header className="dispatcher-overview__header">
        <div className="dispatcher-overview__title-group">
          <h1 className="dispatcher-overview__title">Active Deliveries</h1>
          <p className="dispatcher-overview__subtitle">
            Monitor ongoing deliveries, courier progress and delivery operations.
          </p>
        </div>

        <div className="dispatcher-overview__actions">
          {lastUpdated && (
            <div className="dispatcher-overview__date-badge" title="Data last refreshed">
              <Clock size={14} className="dispatcher-overview__date-icon" aria-hidden="true" />
              <span>Last updated: {lastUpdated}</span>
            </div>
          )}

          <button
            type="button"
            className="dispatcher-overview__refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            aria-label="Refresh active deliveries"
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

      {/* Error Alert */}
      {activeQuery.isError && (
        <div className="dispatcher-error-banner" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <div className="dispatcher-error-banner__body">
            <strong>Failed to load active deliveries</strong>
            <p>
              {activeQuery.error instanceof Error
                ? activeQuery.error.message
                : 'Could not reach Dispatch Service.'}
            </p>
          </div>
          <button type="button" className="dispatcher-action-btn-secondary" onClick={handleRefresh}>
            Retry
          </button>
        </div>
      )}

      {/* 2. Key Metrics Summary Cards */}
      <ActiveDeliverySummary metrics={metrics} />

      {/* 3. Multi-criteria Filter Toolbar */}
      <ActiveDeliveryFilters
        searchTerm={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setCurrentPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(val) => {
          setStatusFilter(val);
          setCurrentPage(1);
        }}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={(val) => {
          setPriorityFilter(val);
          setCurrentPage(1);
        }}
        dateFilter={dateFilter}
        onDateFilterChange={(val) => {
          setDateFilter(val);
          setCurrentPage(1);
        }}
        sortOrder={sortOrder}
        onSortOrderToggle={() => setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
      />

      {/* 4. Active Deliveries Table */}
      <ActiveDeliveryTable
        deliveries={paginatedDeliveries}
        isLoading={isLoading}
        onViewDetails={(record) => setSelectedDelivery(record)}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(p) => setCurrentPage(p)}
        totalFilteredCount={filteredDeliveries.length}
        pageSize={pageSize}
      />

      {/* 5. Active Delivery Details Modal */}
      <ActiveDeliveryDetails
        isOpen={selectedDelivery !== null}
        onClose={() => setSelectedDelivery(null)}
        delivery={selectedDelivery}
      />
    </div>
  );
}
