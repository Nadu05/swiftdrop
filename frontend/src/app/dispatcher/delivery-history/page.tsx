'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Gavel, RefreshCw } from 'lucide-react';
import type { DeliveryExceptionDto } from '@/api/services/dispatch.api';
import DeliveryHistorySummary from '@/components/dispatcher/history/DeliveryHistorySummary';
import DeliveryHistoryFilters from '@/components/dispatcher/history/DeliveryHistoryFilters';
import DeliveryHistoryTable from '@/components/dispatcher/history/DeliveryHistoryTable';
import DeliveryHistoryDetails from '@/components/dispatcher/history/DeliveryHistoryDetails';
import ExceptionDecisionDialog from '@/components/dispatcher/history/ExceptionDecisionDialog';
import {
  calculateHistoryMetrics,
  getDeliveryHistory,
} from '@/components/dispatcher/history/historyApi';
import type { DeliveryHistoryRecord } from '@/components/dispatcher/history/types';
import { matchesRelativeDateFilter } from '@/components/dispatcher/dateUtils';
import { dispatchQueryKeys, useDeliveryExceptions } from '@/hooks/api/use-dispatch';

export default function DeliveryHistoryPage() {
  const queryClient = useQueryClient();

  const historyQuery = useQuery({
    queryKey: ['dispatch', 'delivery-history'],
    queryFn: getDeliveryHistory,
    refetchInterval: 15_000,
  });

  const exceptionsQuery = useDeliveryExceptions(undefined, { refetchInterval: 15_000 });

  const deliveries: DeliveryHistoryRecord[] = historyQuery.data?.deliveries ?? [];
  const exceptions: DeliveryExceptionDto[] = exceptionsQuery.data ?? [];
  const pendingExceptions = useMemo(
    () => exceptions.filter((ex) => ex.status === 'PENDING_DECISION'),
    [exceptions]
  );

  const isLoading = historyQuery.isLoading;
  const isRefreshing = historyQuery.isFetching || exceptionsQuery.isFetching;
  const error = historyQuery.isError
    ? historyQuery.error instanceof Error
      ? historyQuery.error.message
      : 'Unable to load delivery history records. Please check your connection.'
    : null;

  const lastUpdated = historyQuery.dataUpdatedAt
    ? new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(historyQuery.dataUpdatedAt))
    : '';

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [courierFilter, setCourierFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Modals State
  const [selectedRecord, setSelectedRecord] = useState<DeliveryHistoryRecord | null>(null);
  const [selectedException, setSelectedException] = useState<DeliveryExceptionDto | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dispatch'] });
  };

  // Unique couriers list for the dropdown filter
  const couriersList = useMemo(() => {
    const names = new Set<string>();
    deliveries.forEach((d) => {
      if (d.courier.name && d.courier.name !== 'Unassigned') names.add(d.courier.name);
    });
    return Array.from(names).sort();
  }, [deliveries]);

  // Filter & Sort Pipeline
  const filteredDeliveries = useMemo(() => {
    let result = [...deliveries];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.orderId.toLowerCase().includes(q) ||
          d.trackingNumber.toLowerCase().includes(q) ||
          d.recipient.name.toLowerCase().includes(q) ||
          d.courier.name.toLowerCase().includes(q)
      );
    }

    if (courierFilter !== 'ALL') {
      result = result.filter((d) => d.courier.name === courierFilter);
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((d) => d.status === statusFilter);
    }

    if (priorityFilter !== 'ALL') {
      result = result.filter((d) => d.priority === priorityFilter);
    }

    if (dateFilter !== 'ALL') {
      const normalizedFilter = dateFilter === '7_DAYS' ? 'LAST_7_DAYS' : dateFilter;
      result = result.filter((d) =>
        matchesRelativeDateFilter(d.completedAt, normalizedFilter)
      );
    }

    result.sort((a, b) => {
      const tA = new Date(a.completedAt).getTime();
      const tB = new Date(b.completedAt).getTime();
      return sortOrder === 'newest' ? tB - tA : tA - tB;
    });

    return result;
  }, [deliveries, searchTerm, courierFilter, statusFilter, priorityFilter, dateFilter, sortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, courierFilter, statusFilter, priorityFilter, dateFilter]);

  const calculatedMetrics = useMemo(
    () => calculateHistoryMetrics(deliveries),
    [deliveries]
  );

  const totalFilteredCount = filteredDeliveries.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const paginatedDeliveries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDeliveries.slice(start, start + pageSize);
  }, [filteredDeliveries, currentPage]);

  const handleExceptionResolved = (updated: DeliveryExceptionDto) => {
    setToastMessage(
      `Decision (${String(updated.decisionAction || '').replace(/_/g, ' ')}) recorded for ${updated.trackingNumber}.`
    );
    setTimeout(() => setToastMessage(null), 5500);
    queryClient.invalidateQueries({ queryKey: dispatchQueryKeys.all });
  };

  return (
    <div className="dispatcher-overview">
      {/* Header */}
      <header className="dispatcher-overview__header">
        <div className="dispatcher-overview__title-group">
          <h1 className="dispatcher-overview__title">Delivery History &amp; Exceptions</h1>
          <p className="dispatcher-overview__subtitle">
            Investigate completed deliveries, proof of delivery evidence, failed attempts, and 3-attempt escalations.
          </p>
        </div>

        <div className="dispatcher-overview__actions">
          {lastUpdated && (
            <div className="dispatcher-overview__date-badge" title="Live data last sync time">
              <Clock size={14} className="dispatcher-overview__date-icon" aria-hidden="true" />
              <span>Updated at {lastUpdated}</span>
            </div>
          )}

          <button
            type="button"
            className="dispatcher-overview__refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            aria-label="Refresh delivery history and exceptions"
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

      {toastMessage && (
        <div className="dispatcher-toast-success" role="status">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}

      {error && (
        <div className="dispatcher-error-banner" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <div className="dispatcher-error-banner__body">
            <strong>Failed to load delivery history</strong>
            <p>{error}</p>
          </div>
          <button type="button" className="dispatcher-action-btn-secondary" onClick={handleRefresh}>
            Retry
          </button>
        </div>
      )}

      {/* Pending Dispatcher Exception Escalations (after 3 failed delivery attempts) */}
      {pendingExceptions.length > 0 && (
        <section
          className="dispatcher-table-card"
          aria-label="Failed deliveries requiring dispatcher decision"
          style={{ border: '1px solid #fecaca', background: '#fffafa' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              borderBottom: '1px solid #fecaca',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <AlertTriangle size={20} color="#dc2626" aria-hidden="true" />
              <div>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#991b1b', margin: 0 }}>
                  Action Required: Failed Delivery Escalations ({pendingExceptions.length})
                </h2>
                <p style={{ fontSize: '0.78rem', color: '#7f1d1d', margin: 0 }}>
                  Orders below reached 3 failed delivery attempts and require a dispatcher decision.
                </p>
              </div>
            </div>
          </div>

          <div className="dispatcher-table-wrapper">
            <table className="dispatcher-table">
              <thead>
                <tr>
                  <th>Exception / Tracking</th>
                  <th>Recipient &amp; Address</th>
                  <th>Branch</th>
                  <th>Attempts &amp; Last Reason</th>
                  <th style={{ textAlign: 'right' }}>Resolution</th>
                </tr>
              </thead>
              <tbody>
                {pendingExceptions.map((ex) => (
                  <tr key={ex.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{ex.exceptionCode}</div>
                      <div style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 600 }}>
                        {ex.trackingNumber}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Order #{ex.orderId}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {ex.recipientName || 'Recipient'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                        {ex.deliveryAddress || '—'}
                      </div>
                      {ex.recipientPhone && (
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          {ex.recipientPhone}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 500 }}>
                        {ex.branchName || ex.branchCode || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="dispatcher-status-badge dispatcher-status-badge--danger">
                        {ex.failedAttemptCount} / 3 Failed
                      </span>
                      <div style={{ fontSize: '0.78rem', color: '#7f1d1d', marginTop: '0.25rem' }}>
                        {ex.lastFailureReason || 'Maximum attempts exceeded'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="dispatcher-btn-primary"
                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                        onClick={() => setSelectedException(ex)}
                      >
                        <Gavel size={14} aria-hidden="true" />
                        <span>Decide Action</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Summary KPI Cards */}
      <DeliveryHistorySummary metrics={calculatedMetrics} />

      {/* Search and Filters Toolbar */}
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

      {/* Delivery History Table */}
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

      {/* Delivery Investigation Details Modal */}
      <DeliveryHistoryDetails
        record={selectedRecord}
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
      />

      {/* Dispatcher Decision Modal for 3-Attempt Failed Exceptions */}
      <ExceptionDecisionDialog
        exceptionItem={selectedException}
        onClose={() => setSelectedException(null)}
        onResolved={handleExceptionResolved}
      />
    </div>
  );
}
