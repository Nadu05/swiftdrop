'use client';

import { useMemo } from 'react';
import {
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { calculateOrganizationDashboardMetrics } from '@/api/services/organization.api';
import { useBranches, useServiceAreas } from '@/hooks/api/use-organization';
import OrganizationWelcome from './OrganizationWelcome';
import OrganizationSummaryCards from './OrganizationSummaryCards';
import BranchStatusOverview from './BranchStatusOverview';
import ServiceAreaOverview from './ServiceAreaOverview';

export default function OrganizationDashboard() {
  const {
    data: branches = [],
    isLoading: isLoadingBranches,
    isRefetching: isRefetchingBranches,
    error: rawBranchesError,
    refetch: refetchBranches,
    dataUpdatedAt: branchesUpdatedAt,
  } = useBranches();

  const {
    data: serviceAreas = [],
    isLoading: isLoadingServiceAreas,
    isRefetching: isRefetchingServiceAreas,
    error: rawServiceAreasError,
    refetch: refetchServiceAreas,
  } = useServiceAreas();

  const isRefreshing = isRefetchingBranches || isRefetchingServiceAreas;

  const branchesError = rawBranchesError
    ? rawBranchesError instanceof Error
      ? rawBranchesError.message
      : 'Failed to load organization branches from backend.'
    : null;

  const serviceAreasError = rawServiceAreasError
    ? rawServiceAreasError instanceof Error
      ? rawServiceAreasError.message
      : 'Failed to load service areas from backend.'
    : null;

  const lastUpdatedLabel = branchesUpdatedAt
    ? new Date(branchesUpdatedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  const handleRefreshAll = () => {
    refetchBranches();
    refetchServiceAreas();
  };

  const retryServiceAreasOnly = () => {
    refetchServiceAreas();
  };

  const metrics = useMemo(
    () => calculateOrganizationDashboardMetrics(branches, serviceAreas),
    [branches, serviceAreas]
  );

  const serviceAreasAvailable = !serviceAreasError && !isLoadingServiceAreas;

  return (
    <div className="org-page">
      <OrganizationWelcome
        lastUpdatedLabel={lastUpdatedLabel}
        isLoading={isLoadingBranches}
        isRefreshing={isRefreshing}
        onRefresh={handleRefreshAll}
      />

      {/* Explicit API Error State when Backend is Unreachable */}
      {branchesError && (
        <div className="org-state-box org-state-box--error" role="alert">
          <div
            className="org-state-box__icon org-state-box__icon--error"
            aria-hidden="true"
          >
            <AlertCircle size={22} />
          </div>
          <p className="org-state-box__title">
            Unable to Load Organization Dashboard Data
          </p>
          <p className="org-state-box__desc">{branchesError}</p>
          <div className="org-state-box__actions">
            <button
              type="button"
              className="org-btn org-btn--primary"
              onClick={handleRefreshAll}
            >
              <RefreshCw size={14} aria-hidden="true" />
              <span>Retry Live API</span>
            </button>
          </div>
        </div>
      )}

      {/* Summary Statistics Cards (Strictly derived from backend responses) */}
      <OrganizationSummaryCards
        metrics={metrics}
        isLoading={isLoadingBranches}
        serviceAreasAvailable={serviceAreasAvailable}
      />

      {/* Branch Status Overview Table */}
      {!branchesError && (
        <BranchStatusOverview
          branches={branches}
          isLoading={isLoadingBranches}
        />
      )}

      {/* Member 03 Service-Area Coverage Overview */}
      <ServiceAreaOverview
        serviceAreas={serviceAreas}
        isLoading={isLoadingServiceAreas}
        error={serviceAreasError}
        onRetry={retryServiceAreasOnly}
      />
    </div>
  );
}
