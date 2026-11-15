'use client';

import { useMemo } from 'react';
import {
  AlertCircle,
  MapPin,
  Radar,
  RefreshCw,
} from 'lucide-react';
import {
  calculateBranchDistributionByCity,
  calculateOrganizationDashboardMetrics,
} from '@/api/services/organization.api';
import { useBranches, useServiceAreas } from '@/hooks/api/use-organization';
import OrganizationWelcome from './OrganizationWelcome';
import OrganizationSummaryCards from './OrganizationSummaryCards';
import BranchStatusOverview from './BranchStatusOverview';

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

  const metrics = useMemo(
    () => calculateOrganizationDashboardMetrics(branches, serviceAreas),
    [branches, serviceAreas]
  );

  const cityDistribution = useMemo(
    () => calculateBranchDistributionByCity(branches, serviceAreas),
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

      {/* Summary Statistics Cards */}
      <OrganizationSummaryCards
        metrics={metrics}
        isLoading={isLoadingBranches}
        serviceAreasAvailable={serviceAreasAvailable}
      />

      {/* Branch Distribution by District */}
      {!branchesError && (
        <section
          className="org-directory-card"
          aria-labelledby="org-city-distribution-heading"
          data-testid="city-distribution-section"
        >
          <div className="org-directory-card__header">
            <div className="org-directory-card__title-group">
              <h2
                id="org-city-distribution-heading"
                className="org-directory-card__title"
              >
                Branch Distribution by District
              </h2>
              <p className="org-directory-card__subtitle">
                Geographic distribution of registered branches and 25 km circular service-area
                coverage zones across Sri Lankan administrative districts.
              </p>
            </div>
          </div>

          {isLoadingBranches ? (
            <div className="org-state-box" role="status" aria-live="polite">
              <span className="org-spinner" aria-hidden="true" />
              <p className="org-state-box__title">Calculating district distribution...</p>
            </div>
          ) : cityDistribution.length === 0 ? (
            <div className="org-state-box" role="status">
              <div className="org-state-box__icon" aria-hidden="true">
                <MapPin size={20} />
              </div>
              <p className="org-state-box__title">No district distribution available</p>
              <p className="org-state-box__desc">
                Create the first branch to see regional distribution across Sri Lankan districts.
              </p>
            </div>
          ) : (
            <div className="org-city-distribution-grid">
              {cityDistribution.map((item) => {
                const districtLabel = item.district || item.city;

                return (
                  <article
                    key={districtLabel}
                    className="org-city-distribution-card"
                    data-testid={`city-distribution-item-${districtLabel.toLowerCase()}`}
                  >
                    <div className="org-city-distribution-card__header">
                      <span className="org-branch-city">
                        <MapPin
                          size={14}
                          className="org-branch-city__icon"
                          aria-hidden="true"
                        />
                        <strong>{districtLabel} District</strong>
                      </span>
                      <span className="org-branch-code">
                        {item.totalBranches}{' '}
                        {item.totalBranches === 1 ? 'Branch' : 'Branches'}
                      </span>
                    </div>

                    <div className="org-city-distribution-card__meta">
                      <span className="org-city-distribution-card__stat org-city-distribution-card__stat--active">
                        {item.activeBranches} Active
                      </span>
                      <span className="org-city-distribution-card__stat org-city-distribution-card__stat--inactive">
                        {item.inactiveBranches} Inactive
                      </span>
                      <span className="org-city-distribution-card__stat">
                        <Radar size={12} aria-hidden="true" />
                        <span>
                          {item.serviceAreaCount}{' '}
                          {item.serviceAreaCount === 1
                            ? 'Service Area'
                            : 'Service Areas'}
                        </span>
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Branch Status Overview Table */}
      {!branchesError && (
        <BranchStatusOverview
          branches={branches}
          isLoading={isLoadingBranches}
        />
      )}
    </div>
  );
}
