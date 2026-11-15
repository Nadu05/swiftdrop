'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Info,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import BranchSummaryCards from '@/components/organization/branches/BranchSummaryCards';
import BranchFilters from '@/components/organization/branches/BranchFilters';
import BranchTable from '@/components/organization/branches/BranchTable';
import BranchStatusDialog from '@/components/organization/branches/BranchStatusDialog';
import { calculateBranchSummaryMetrics } from '@/api/services/organization.api';
import { useBranches, useServiceAreas } from '@/hooks/api/use-organization';
import type {
  BranchResponse,
  BranchStatusFilter,
  ServiceAreaResponse,
} from '@/types/organization.types';

export default function OrganizationBranchesPage() {
  const {
    data: branches = [],
    isLoading,
    isRefetching,
    error: queryError,
    refetch,
    dataUpdatedAt,
  } = useBranches();

  const {
    data: serviceAreas = [],
    isLoading: isLoadingServiceAreas,
    error: serviceAreasError,
    refetch: refetchServiceAreas,
  } = useServiceAreas();

  // Search, Status & City Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<BranchStatusFilter>('ALL');
  const [cityFilter, setCityFilter] = useState<string>('ALL');

  // Confirmed operation toast banner (Create, Edit, Activate, Deactivate)
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Branch selected for Activate / Deactivate confirmation modal
  const [branchPendingStatusToggle, setBranchPendingStatusToggle] =
    useState<BranchResponse | null>(null);

  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : 'Unable to load branch directory from the Organization Service.'
    : null;

  const lastUpdated = dataUpdatedAt
    ? new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(dataUpdatedAt))
    : '';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const createdCode = searchParams.get('created');
      const updatedCode = searchParams.get('updated');

      if (createdCode) {
        setSuccessBanner(
          `Branch "${createdCode}" was created successfully and the directory has been refreshed.`
        );
        window.history.replaceState({}, '', '/organization/branches');
      } else if (updatedCode) {
        setSuccessBanner(
          `Branch "${updatedCode}" was updated successfully and the directory has been refreshed.`
        );
        window.history.replaceState({}, '', '/organization/branches');
      }
    }
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
    refetchServiceAreas();
  }, [refetch, refetchServiceAreas]);

  const handleRetry = useCallback(() => {
    refetch();
    refetchServiceAreas();
  }, [refetch, refetchServiceAreas]);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setCityFilter('ALL');
  }, []);

  // Summary metrics derived from the full loaded branch list
  const summaryMetrics = useMemo(
    () => calculateBranchSummaryMetrics(branches),
    [branches]
  );

  // Distinct sorted city options from loaded branches
  const availableCities = useMemo(() => {
    const citySet = new Set<string>();
    for (const branch of branches) {
      const trimmed = branch.city.trim();
      if (trimmed) {
        citySet.add(trimmed);
      }
    }
    return Array.from(citySet).sort((a, b) => a.localeCompare(b));
  }, [branches]);

  // Group service areas by branchId
  const serviceAreasByBranchId = useMemo(() => {
    const grouped: Record<number, ServiceAreaResponse[]> = {};
    for (const area of serviceAreas) {
      if (!grouped[area.branchId]) {
        grouped[area.branchId] = [];
      }
      grouped[area.branchId].push(area);
    }
    return grouped;
  }, [serviceAreas]);

  // Filtered branch list by search query (code, name, or city), status filter, and city filter
  const filteredBranches = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return branches.filter((branch) => {
      if (statusFilter !== 'ALL' && branch.status !== statusFilter) {
        return false;
      }

      if (cityFilter !== 'ALL' && branch.city.trim().toLowerCase() !== cityFilter.toLowerCase()) {
        return false;
      }

      if (normalizedQuery.length > 0) {
        const matchesCode = branch.code.toLowerCase().includes(normalizedQuery);
        const matchesName = branch.name.toLowerCase().includes(normalizedQuery);
        const matchesCity = branch.city.toLowerCase().includes(normalizedQuery);
        return matchesCode || matchesName || matchesCity;
      }

      return true;
    });
  }, [branches, searchQuery, statusFilter, cityFilter]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || statusFilter !== 'ALL' || cityFilter !== 'ALL';

  const serviceAreasAvailable = !isLoadingServiceAreas && !serviceAreasError;

  const handleRequestToggleStatus = useCallback((branch: BranchResponse) => {
    setBranchPendingStatusToggle(branch);
  }, []);

  const handleStatusUpdated = useCallback(
    (updatedBranch: BranchResponse) => {
      setBranchPendingStatusToggle(null);

      const actionWord =
        updatedBranch.status === 'ACTIVE' ? 'activated' : 'deactivated';
      setSuccessBanner(
        `Branch "${updatedBranch.name}" (${updatedBranch.code}) has been ${actionWord} and is now ${updatedBranch.status}.`
      );
    },
    []
  );

  return (
    <div className="org-page">
      {/* Confirmed Create / Edit / Status Operation Success Banner */}
      {successBanner && (
        <div className="org-success-banner" role="status" aria-live="polite">
          <div className="org-success-banner__left">
            <CheckCircle2 size={17} className="org-success-banner__icon" aria-hidden="true" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            className="org-success-banner__close"
            onClick={() => setSuccessBanner(null)}
            aria-label="Dismiss success notification"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Page Heading & Primary Action */}
      <header className="org-page-header">
        <div className="org-page-header__titles">
          <p className="org-page-header__eyebrow">Admin / Branch Directory</p>
          <h1 className="org-page-header__title">Branch Management</h1>
          <p className="org-page-header__subtitle">
            Manage regional branches, contact details, interactive map locations, and circular
            service-area coverage across the SwiftDrop Head Office network.
          </p>
        </div>

        <div className="org-page-header__actions">
          {lastUpdated && (
            <span className="org-timestamp-badge" title="Last data sync time">
              <Clock size={13} aria-hidden="true" />
              <span>Updated {lastUpdated}</span>
            </span>
          )}

          <button
            type="button"
            className="org-btn org-btn--secondary"
            onClick={handleRefresh}
            disabled={isLoading || isRefetching}
            aria-label="Refresh branch directory"
          >
            <RefreshCw
              size={14}
              className={isRefetching ? 'org-icon--spinning' : ''}
              aria-hidden="true"
            />
            <span>{isRefetching ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link
            href="/organization/branches/create"
            className="org-btn org-btn--primary org-btn--add-branch"
          >
            <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
            <span>Add branch</span>
          </Link>
        </div>
      </header>

      {/* Branch Summary Cards */}
      <BranchSummaryCards metrics={summaryMetrics} isLoading={isLoading} />

      {/* Search, Status & City Filter Toolbar */}
      <BranchFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        cityFilter={cityFilter}
        onCityFilterChange={setCityFilter}
        availableCities={availableCities}
        totalCount={branches.length}
        filteredCount={filteredBranches.length}
        activeCount={summaryMetrics.activeBranches}
        inactiveCount={summaryMetrics.inactiveBranches}
        onResetFilters={handleResetFilters}
      />

      {/* Branch Directory Table Card */}
      <BranchTable
        branches={filteredBranches}
        totalCount={branches.length}
        isLoading={isLoading}
        error={error}
        hasActiveFilters={hasActiveFilters}
        onRetry={handleRetry}
        onResetFilters={handleResetFilters}
        onToggleStatus={handleRequestToggleStatus}
        serviceAreasByBranchId={serviceAreasByBranchId}
        serviceAreasAvailable={serviceAreasAvailable}
      />

      {/* Activate / Deactivate Confirmation Dialog */}
      <BranchStatusDialog
        branch={branchPendingStatusToggle}
        isOpen={Boolean(branchPendingStatusToggle)}
        onClose={() => setBranchPendingStatusToggle(null)}
        onStatusUpdated={handleStatusUpdated}
      />
    </div>
  );
}
