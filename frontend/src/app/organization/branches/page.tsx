'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  FlaskConical,
  Info,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import BranchSummaryCards from '@/components/organization/branches/BranchSummaryCards';
import BranchFilters from '@/components/organization/branches/BranchFilters';
import BranchTable from '@/components/organization/branches/BranchTable';
import {
  calculateBranchSummaryMetrics,
  getBranches,
  ISOLATED_DEV_MOCK_BRANCHES,
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

  // Explicitly isolated temporary mock-data mode for visual development when backend is offline
  const [isMockMode, setIsMockMode] = useState<boolean>(false);

  // Search & Status Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<BranchStatusFilter>('ALL');

  // Confirmed operation toast banner when returning from Create or Edit page
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Phase boundary notice for Phase 3+ actions (View Details, Activate/Deactivate, sibling tabs)
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
      setIsMockMode(false);
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

  const handleRefresh = () => {
    if (isMockMode) {
      setBranches([...ISOLATED_DEV_MOCK_BRANCHES]);
      setLastUpdated(formatTimestamp());
      return;
    }
    setIsRefreshing(true);
    loadLiveBranches();
  };

  const handleEnableMockMode = useCallback(() => {
    setIsMockMode(true);
    setError(null);
    setIsLoading(false);
    setIsRefreshing(false);
    setBranches([...ISOLATED_DEV_MOCK_BRANCHES]);
    setLastUpdated(formatTimestamp());
  }, []);

  const handleSwitchToLiveApi = useCallback(() => {
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

  const handleViewDetails = (branch: BranchResponse) => {
    // TODO (Phase 3): Connect Branch Details modal/page
    setPhaseNotice(
      `Branch details view for "${branch.name}" (${branch.code}) will be implemented in the next phase.`
    );
  };

  const handleToggleStatus = (branch: BranchResponse) => {
    // TODO (Phase 3): Connect Activate/Deactivate confirmation workflow via updateBranch(branch.id, { status })
    const targetAction = branch.status === 'ACTIVE' ? 'Deactivation' : 'Activation';
    setPhaseNotice(
      `${targetAction} workflow for "${branch.name}" (${branch.code}) is scheduled for Phase 3 (PATCH /api/v1/organization/branches/${branch.id}).`
    );
  };

  return (
    <div className="org-page">
      {/* Isolated Temporary Mock-Data Mode Warning Banner */}
      {isMockMode && (
        <div className="org-mock-banner" role="status">
          <div className="org-mock-banner__content">
            <FlaskConical size={17} className="org-mock-banner__icon" aria-hidden="true" />
            <div>
              <strong>Isolated Development Mock Mode Active:</strong> Displaying temporary
              visual preview data (not live backend data).
            </div>
          </div>
          <button
            type="button"
            className="org-mock-banner__btn"
            onClick={handleSwitchToLiveApi}
          >
            <RefreshCw size={13} aria-hidden="true" />
            <span>Connect to Live API</span>
          </button>
        </div>
      )}

      {/* Confirmed Create / Edit Operation Success Banner */}
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

          {!isMockMode && (
            <button
              type="button"
              className="org-btn org-btn--ghost"
              onClick={handleEnableMockMode}
              title="Load isolated temporary mock data for visual development"
            >
              <FlaskConical size={14} aria-hidden="true" />
              <span>Dev Mock Preview</span>
            </button>
          )}

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
        isMockMode={isMockMode}
        onRetry={handleSwitchToLiveApi}
        onEnableMockMode={handleEnableMockMode}
        onResetFilters={handleResetFilters}
        onViewDetails={handleViewDetails}
        onToggleStatus={handleToggleStatus}
      />
    </div>
  );
}
