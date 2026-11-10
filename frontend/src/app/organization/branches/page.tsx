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
import {
  calculateBranchSummaryMetrics,
  getBranches,
} from '@/api/services/organization.api';
import type {
  BranchResponse,
  BranchStatusFilter,
} from '@/types/organization.types';

const DIRECTORY_TABS = [
  { id: 'branch-directory', label: 'Branch directory', active: true },
  { id: 'staff-accounts', label: 'Staff accounts', active: false },
  { id: 'roles-permissions', label: 'Roles & permissions', active: false },
  { id: 'audit-log', label: 'Audit log', active: false },
] as const;

export default function OrganizationBranchesPage() {
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Search & Status Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<BranchStatusFilter>('ALL');

  // Confirmed operation toast banner (Create, Edit, Activate, Deactivate)
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Branch selected for Activate / Deactivate confirmation modal
  const [branchPendingStatusToggle, setBranchPendingStatusToggle] =
    useState<BranchResponse | null>(null);

  // Phase boundary notice for sibling tabs (Staff accounts, Roles & permissions, Audit log)
  const [phaseNotice, setPhaseNotice] = useState<string | null>(null);

  const formatTimestamp = () =>
    new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date());

  const loadLiveBranches = useCallback(async () => {
    try {
      setError(null);
      const data = await getBranches();
      setBranches(data);
      setLastUpdated(formatTimestamp());
    } catch (err: unknown) {
      setBranches([]);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load branch directory from the Organization Service.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLiveBranches();

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
  }, [loadLiveBranches]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadLiveBranches();
  }, [loadLiveBranches]);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    loadLiveBranches();
  }, [loadLiveBranches]);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('ALL');
  }, []);

  // Summary metrics derived from the full loaded branch list
  const summaryMetrics = useMemo(
    () => calculateBranchSummaryMetrics(branches),
    [branches]
  );

  // Filtered branch list by search query (code, name, or city) and status filter
  const filteredBranches = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return branches.filter((branch) => {
      if (statusFilter !== 'ALL' && branch.status !== statusFilter) {
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
  }, [branches, searchQuery, statusFilter]);

  const hasActiveFilters = searchQuery.trim().length > 0 || statusFilter !== 'ALL';

  const handleRequestToggleStatus = useCallback((branch: BranchResponse) => {
    setBranchPendingStatusToggle(branch);
  }, []);

  const handleStatusUpdated = useCallback(
    async (updatedBranch: BranchResponse) => {
      setBranchPendingStatusToggle(null);

      // Immediately update local state so table row and summary cards reflect the confirmed change
      setBranches((prev) =>
        prev.map((item) => (item.id === updatedBranch.id ? updatedBranch : item))
      );
      setLastUpdated(formatTimestamp());

      const actionWord =
        updatedBranch.status === 'ACTIVE' ? 'activated' : 'deactivated';
      setSuccessBanner(
        `Branch "${updatedBranch.name}" (${updatedBranch.code}) has been ${actionWord} and is now ${updatedBranch.status}.`
      );

      // Re-fetch authoritative list from the backend
      try {
        const freshList = await getBranches();
        setBranches(freshList);
        setLastUpdated(formatTimestamp());
      } catch {
        // Keep the confirmed updatedBranch in state if the background refresh fails
      }
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

      {/* Figma Frame Context + Page Heading & Primary Action */}
      <header className="org-page-header">
        <div className="org-page-header__titles">
          <p className="org-page-header__eyebrow">Admin / Branch Directory and Staff</p>
          <h1 className="org-page-header__title">Branch Management</h1>
          <p className="org-page-header__subtitle">
            Manage regional branches, contact details, and operational status across the
            SwiftDrop Head Office network.
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
            disabled={isLoading || isRefreshing}
            aria-label="Refresh branch directory"
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? 'org-icon--spinning' : ''}
              aria-hidden="true"
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
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

      {/* Figma Sub-navigation Pills (Frame 34 — Branches and staff tabs) */}
      <div className="org-tabs" role="navigation" aria-label="Branches and staff sections">
        {DIRECTORY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`org-tabs__pill${tab.active ? ' org-tabs__pill--active' : ''}`}
            aria-current={tab.active ? 'page' : undefined}
            onClick={() => {
              if (!tab.active) {
                setPhaseNotice(
                  `"${tab.label}" is outside the current phase and will be implemented in a subsequent phase.`
                );
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dismissible Phase Action Feedback Notice */}
      {phaseNotice && (
        <div className="org-phase-notice" role="status" aria-live="polite">
          <div className="org-phase-notice__left">
            <Info size={16} className="org-phase-notice__icon" aria-hidden="true" />
            <span>{phaseNotice}</span>
          </div>
          <button
            type="button"
            className="org-phase-notice__close"
            onClick={() => setPhaseNotice(null)}
            aria-label="Dismiss notification"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Branch Summary Cards */}
      <BranchSummaryCards metrics={summaryMetrics} isLoading={isLoading} />

      {/* Search & Status Filter Toolbar */}
      <BranchFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
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
