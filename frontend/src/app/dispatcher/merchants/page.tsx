'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RefreshCw, Clock, ClipboardList, Store } from 'lucide-react';
import MerchantApprovalSummaryCards from '@/components/dispatcher/merchant-approvals/MerchantApprovalSummaryCards';
import MerchantApprovalFilters from '@/components/dispatcher/merchant-approvals/MerchantApprovalFilters';
import MerchantApprovalTable from '@/components/dispatcher/merchant-approvals/MerchantApprovalTable';
import RegisteredMerchantsTable from '@/components/dispatcher/merchant-approvals/RegisteredMerchantsTable';
import {
  getMerchantApplications,
  getMerchantApprovalSummaryMetrics,
  getRegisteredMerchants,
} from '@/components/dispatcher/merchant-approvals/merchantApprovalApi';
import type {
  MerchantApplication,
  MerchantApprovalSummaryMetrics,
  MerchantApprovalFilterState,
} from '@/components/dispatcher/merchant-approvals/types';

function MerchantManagementContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'directory' ? 'directory' : 'approvals';

  const [activeTab, setActiveTab] = useState<'approvals' | 'directory'>(initialTab);

  // Approval Queue State
  const [applications, setApplications] = useState<MerchantApplication[]>([]);
  const [metrics, setMetrics] = useState<MerchantApprovalSummaryMetrics>({
    pendingReview: 0,
    awaitingMerchant: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0,
    totalSubmissions: 0,
  });

  const [filters, setFilters] = useState<MerchantApprovalFilterState>({
    searchTerm: '',
    status: 'ALL',
    category: 'ALL',
    sortOrder: 'newest',
  });

  // Registered Merchants Directory State
  const [registeredMerchants, setRegisteredMerchants] = useState<MerchantApplication[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const formatTimestamp = () => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date());
  };

  const loadData = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const [loadedApps, loadedMetrics, loadedRegistered] = await Promise.all([
        getMerchantApplications(filters),
        getMerchantApprovalSummaryMetrics(),
        getRegisteredMerchants(),
      ]);

      setApplications(loadedApps);
      setMetrics(loadedMetrics);
      setRegisteredMerchants(loadedRegistered);
      setLastUpdated(formatTimestamp());
    } catch (err: any) {
      console.error('Failed to load merchant data:', err);
      setError(err?.message || 'Unable to load merchant information.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const handleResetFilters = () => {
    setFilters({
      searchTerm: '',
      status: 'ALL',
      category: 'ALL',
      sortOrder: 'newest',
    });
  };

  return (
    <div className="dispatcher-overview">
      {/* 1. Header with Breadcrumb */}
      <header className="dispatcher-overview__header">
        <div className="dispatcher-overview__title-group">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="dispatcher-breadcrumb">
            <span>SwiftDrop</span>
            <span className="dispatcher-breadcrumb-separator">/</span>
            <span>Admin</span>
            <span className="dispatcher-breadcrumb-separator">/</span>
            <span className="dispatcher-breadcrumb-current">Merchant Management</span>
          </nav>

          <h1 className="dispatcher-overview__title">Merchant Management</h1>
          <p className="dispatcher-overview__subtitle">
            Manage partner merchants, review onboarding applications and record verification decisions.
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
            onClick={() => loadData(true)}
            disabled={isLoading || isRefreshing}
            aria-label="Refresh merchant management data"
          >
            <RefreshCw
              size={14}
              className={`dispatcher-overview__refresh-icon ${
                isRefreshing ? 'dispatcher-overview__refresh-icon--spinning' : ''
              }`}
              aria-hidden="true"
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* 2. Sub-navigation Tabs */}
      <div className="dispatcher-zone-tabs-bar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'approvals'}
          className={`dispatcher-zone-tab-btn ${activeTab === 'approvals' ? 'dispatcher-zone-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('approvals')}
        >
          <ClipboardList size={15} />
          <span>Approval Queue</span>
          {metrics.pendingReview > 0 && (
            <span
              style={{
                marginLeft: '0.35rem',
                padding: '0.1rem 0.5rem',
                borderRadius: '9999px',
                background: '#2563eb',
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: 700,
              }}
            >
              {metrics.pendingReview} pending
            </span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'directory'}
          className={`dispatcher-zone-tab-btn ${activeTab === 'directory' ? 'dispatcher-zone-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('directory')}
        >
          <Store size={15} />
          <span>Registered Directory ({registeredMerchants.length})</span>
        </button>
      </div>

      {/* 3. Tab Contents */}
      {activeTab === 'approvals' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Summary KPI Cards */}
          <MerchantApprovalSummaryCards metrics={metrics} isLoading={isLoading && !isRefreshing} />

          {/* Search and Filters */}
          <MerchantApprovalFilters
            filters={filters}
            onChange={(updated) => setFilters(updated)}
            onReset={handleResetFilters}
            isLoading={isLoading || isRefreshing}
          />

          {/* Review Queue Table */}
          <MerchantApprovalTable
            applications={applications}
            isLoading={isLoading && !isRefreshing}
            error={error}
          />
        </div>
      ) : (
        <RegisteredMerchantsTable
          merchants={registeredMerchants}
          isLoading={isLoading && !isRefreshing}
        />
      )}
    </div>
  );
}

export default function MerchantManagementPage() {
  return (
    <Suspense fallback={<div className="dispatcher-overview" style={{ padding: '2rem', color: '#64748b' }}>Loading merchant management...</div>}>
      <MerchantManagementContent />
    </Suspense>
  );
}
