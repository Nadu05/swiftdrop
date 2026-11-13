'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Download, AlertCircle, Clock } from 'lucide-react';
import ReportFilters from '@/components/dispatcher/reports/ReportFilters';
import ReportSummaryCards from '@/components/dispatcher/reports/ReportSummaryCards';
import DeliveryStatusChart from '@/components/dispatcher/reports/DeliveryStatusChart';
import BranchPerformance from '@/components/dispatcher/reports/BranchPerformance';
import DeliveryTrendsChart from '@/components/dispatcher/reports/DeliveryTrendsChart';
import ExportReport from '@/components/dispatcher/reports/ExportReport';
import {
  fetchReportsData,
  getAvailableBranches,
} from '@/components/dispatcher/reports/reportsApi';
import type {
  ReportFilterState,
  ReportsDataBundle,
} from '@/components/dispatcher/reports/types';

export default function ReportsAnalyticsPage() {
  const [filters, setFilters] = useState<ReportFilterState>({
    dateRange: 'last7days',
    branchId: 'ALL',
    serviceType: 'ALL',
  });

  const [branches, setBranches] = useState<{ id: string; name: string; code: string }[]>([]);
  const [data, setData] = useState<ReportsDataBundle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const formatTimestamp = () => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date());
  };

  // Initial load of branches
  useEffect(() => {
    let isMounted = true;
    async function loadBranches() {
      try {
        const branchList = await getAvailableBranches();
        if (isMounted) {
          setBranches(branchList);
        }
      } catch (err) {
        console.warn('Failed to load branches:', err);
      }
    }
    loadBranches();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch report data on filter changes or refresh
  const loadReports = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const result = await fetchReportsData(filters);
      setData(result);
      setLastUpdated(formatTimestamp());
    } catch (err: any) {
      console.error('Failed to load reports:', err);
      setError(err?.message || 'Failed to load reports and analytics data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    loadReports(false);
  }, [loadReports]);

  const handleResetFilters = () => {
    setFilters({
      dateRange: 'last7days',
      branchId: 'ALL',
      serviceType: 'ALL',
    });
  };

  const selectedBranchLabel = useMemo(() => {
    if (filters.branchId === 'ALL') return 'All Branches';
    const found = branches.find((b) => b.id === filters.branchId);
    return found ? `${found.name} (${found.code})` : 'Selected Branch';
  }, [filters.branchId, branches]);

  return (
    <div className="dispatcher-overview">
      {/* 1. Page Header */}
      <header className="dispatcher-overview__header">
        <div className="dispatcher-overview__title-group">
          <h1 className="dispatcher-overview__title">Reports &amp; Analytics</h1>
          <p className="dispatcher-overview__subtitle">
            Monitor delivery performance, operational efficiency, and branch-wise statistics.
          </p>
        </div>

        <div className="dispatcher-overview__actions">
          {lastUpdated && (
            <div className="dispatcher-overview__date-badge" title="Timestamp of last data fetch">
              <Clock size={14} className="dispatcher-overview__date-icon" aria-hidden="true" />
              <span>Last updated: {lastUpdated}</span>
            </div>
          )}

          <button
            type="button"
            className="dispatcher-overview__refresh-btn"
            onClick={() => loadReports(true)}
            disabled={isLoading || isRefreshing}
            aria-label="Refresh reports data"
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? 'dispatcher-overview__refresh-icon--spinning' : ''}
              aria-hidden="true"
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            className="dispatcher-btn-primary"
            onClick={() => setIsExportModalOpen(true)}
            disabled={!data || isLoading}
            aria-label="Open export reports dialog"
          >
            <Download size={14} aria-hidden="true" />
            <span>Export Report</span>
          </button>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="dispatcher-reports-alert dispatcher-reports-alert--error" role="alert">
          <AlertCircle size={18} />
          <div>
            <strong>Error loading reports:</strong> {error}
          </div>
          <button
            type="button"
            className="dispatcher-overview__refresh-btn"
            style={{ marginLeft: 'auto', padding: '0.25rem 0.6rem' }}
            onClick={() => loadReports(true)}
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Report Filters Bar */}
      <ReportFilters
        filters={filters}
        branches={branches}
        onChange={(newFilters) => setFilters(newFilters)}
        onReset={handleResetFilters}
        isLoading={isLoading || isRefreshing}
      />

      {/* 3. Summary Cards */}
      {data && (
        <ReportSummaryCards
          metrics={data.metrics}
          isLoading={isLoading && !isRefreshing}
        />
      )}

      {/* 4. Operations Split Grid: Status Breakdown + Branch Performance */}
      {data && (
        <div className="dispatcher-reports-split-grid">
          {/* Status breakdown horizontal bars */}
          <DeliveryStatusChart
            data={data.statusBreakdown}
            totalDeliveries={data.metrics.totalDeliveries}
            isLoading={isLoading && !isRefreshing}
          />

          {/* Branch Performance rankings and progress bars */}
          <BranchPerformance
            branches={data.branchPerformance}
            isLoading={isLoading && !isRefreshing}
          />
        </div>
      )}

      {/* 5. Delivery Volume Trends Chart */}
      {data && (
        <DeliveryTrendsChart
          trends={data.trends}
          isLoading={isLoading && !isRefreshing}
        />
      )}

      {/* 6. Export Report Dialog */}
      <ExportReport
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        data={data}
        filters={filters}
        branchLabel={selectedBranchLabel}
      />
    </div>
  );
}
