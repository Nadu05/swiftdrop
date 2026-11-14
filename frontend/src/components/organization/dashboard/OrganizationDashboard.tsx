'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  MapPin,
  Radar,
  RefreshCw,
} from 'lucide-react';
import {
  calculateBranchDistributionByCity,
  calculateBranchPerformanceMetrics,
  calculateOrganizationDashboardMetrics,
} from '@/api/services/organization.api';
import { getAllMockBranchPerformanceSummaries } from '@/api/mock/organization-admin.mock';
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

  const cityDistribution = useMemo(
    () => calculateBranchDistributionByCity(branches, serviceAreas),
    [branches, serviceAreas]
  );

  const branchPerformanceRows = useMemo(() => {
    const perfMap = getAllMockBranchPerformanceSummaries();
    return branches.map((branch) => {
      const rawSummary = perfMap[branch.id] ?? null;
      const computed = calculateBranchPerformanceMetrics(rawSummary);
      return {
        branch,
        computed,
      };
    });
  }, [branches]);

  const networkTotals = useMemo(() => {
    let totalReceived = 0;
    let totalCompleted = 0;
    let totalPending = 0;
    let durationSum = 0;
    let durationCount = 0;

    for (const row of branchPerformanceRows) {
      totalReceived += row.computed.deliveriesReceivedToday ?? 0;
      totalCompleted += row.computed.deliveriesCompletedToday ?? 0;
      totalPending += row.computed.pendingDeliveries ?? 0;
      if (typeof row.computed.averageDeliveryDurationMinutes === 'number') {
        durationSum += row.computed.averageDeliveryDurationMinutes;
        durationCount += 1;
      }
    }

    const networkCompletionRate =
      totalReceived > 0 ? Math.round((totalCompleted / totalReceived) * 1000) / 10 : null;
    const networkAvgDuration =
      durationCount > 0 ? Math.round(durationSum / durationCount) : null;

    return {
      totalReceived,
      totalCompleted,
      totalPending,
      networkCompletionRate,
      networkAvgDuration,
    };
  }, [branchPerformanceRows]);

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

      {/* Branch Distribution by City */}
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
                Branch Distribution by City
              </h2>
              <p className="org-directory-card__subtitle">
                Geographic distribution of registered branches and circular service-area coverage
                zones across Sri Lankan municipalities.
              </p>
            </div>
            <Link
              href="/organization/branches"
              className="org-btn org-btn--secondary org-btn--sm"
            >
              <Building2 size={14} aria-hidden="true" />
              <span>Filter by City in Directory</span>
            </Link>
          </div>

          {isLoadingBranches ? (
            <div className="org-state-box" role="status" aria-live="polite">
              <span className="org-spinner" aria-hidden="true" />
              <p className="org-state-box__title">Calculating city distribution...</p>
            </div>
          ) : cityDistribution.length === 0 ? (
            <div className="org-state-box" role="status">
              <div className="org-state-box__icon" aria-hidden="true">
                <MapPin size={20} />
              </div>
              <p className="org-state-box__title">No city distribution available</p>
              <p className="org-state-box__desc">
                Create the first branch to see regional distribution across cities.
              </p>
            </div>
          ) : (
            <div className="org-city-distribution-grid">
              {cityDistribution.map((item) => {
                const networkSharePercent =
                  branches.length > 0
                    ? Math.round((item.totalBranches / branches.length) * 100)
                    : 0;

                return (
                  <article
                    key={item.city}
                    className="org-city-distribution-card"
                    data-testid={`city-distribution-item-${item.city.toLowerCase()}`}
                  >
                    <div className="org-city-distribution-card__header">
                      <span className="org-branch-city">
                        <MapPin
                          size={14}
                          className="org-branch-city__icon"
                          aria-hidden="true"
                        />
                        <strong>{item.city}</strong>
                      </span>
                      <span className="org-branch-code">
                        {item.totalBranches}{' '}
                        {item.totalBranches === 1 ? 'Branch' : 'Branches'} (
                        {networkSharePercent}%)
                      </span>
                    </div>

                    <div
                      className="org-city-distribution-card__bar-track"
                      aria-hidden="true"
                    >
                      <div
                        className="org-city-distribution-card__bar-fill"
                        style={{ width: `${Math.max(10, networkSharePercent)}%` }}
                      />
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

      {/* Branch Performance & Analytics Overview */}
      {!branchesError && branches.length > 0 && (
        <section
          className="org-directory-card"
          aria-labelledby="org-branch-performance-overview-heading"
          data-testid="dashboard-performance-overview"
        >
          <div className="org-directory-card__header">
            <div className="org-directory-card__title-group">
              <h2
                id="org-branch-performance-overview-heading"
                className="org-directory-card__title"
              >
                Branch Performance &amp; Analytics Overview
              </h2>
              <p className="org-directory-card__subtitle">
                Daily delivery volume, completion rates, and average dispatch duration across
                SwiftDrop regional hubs.
              </p>
            </div>
            <Link
              href="/organization/branches"
              className="org-dashboard-card__view-all"
            >
              <span>Inspect individual hubs</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          <div className="org-perf-kpi-strip">
            <div className="org-perf-kpi-pill">
              <div className="org-perf-kpi-pill__icon org-perf-kpi-pill__icon--blue">
                <Activity size={16} aria-hidden="true" />
              </div>
              <div>
                <span className="org-perf-kpi-pill__label">Network Volume Today</span>
                <strong className="org-perf-kpi-pill__value">
                  {networkTotals.totalReceived} deliveries
                </strong>
              </div>
            </div>

            <div className="org-perf-kpi-pill">
              <div className="org-perf-kpi-pill__icon org-perf-kpi-pill__icon--green">
                <CheckCircle2 size={16} aria-hidden="true" />
              </div>
              <div>
                <span className="org-perf-kpi-pill__label">Completed Today</span>
                <strong className="org-perf-kpi-pill__value">
                  {networkTotals.totalCompleted} (
                  {networkTotals.networkCompletionRate !== null
                    ? `${networkTotals.networkCompletionRate}%`
                    : '—'}
                  )
                </strong>
              </div>
            </div>

            <div className="org-perf-kpi-pill">
              <div className="org-perf-kpi-pill__icon org-perf-kpi-pill__icon--indigo">
                <Clock size={16} aria-hidden="true" />
              </div>
              <div>
                <span className="org-perf-kpi-pill__label">Avg Delivery Duration</span>
                <strong className="org-perf-kpi-pill__value">
                  {networkTotals.networkAvgDuration !== null
                    ? `${networkTotals.networkAvgDuration} min`
                    : '—'}
                </strong>
              </div>
            </div>

            <div className="org-perf-kpi-pill">
              <div className="org-perf-kpi-pill__icon org-perf-kpi-pill__icon--amber">
                <BarChart3 size={16} aria-hidden="true" />
              </div>
              <div>
                <span className="org-perf-kpi-pill__label">Active In-Progress</span>
                <strong className="org-perf-kpi-pill__value">
                  {networkTotals.totalPending} pending
                </strong>
              </div>
            </div>
          </div>

          <div className="org-table-wrapper">
            <table
              className="org-table"
              aria-label="Branch performance and analytics overview"
            >
              <thead>
                <tr>
                  <th scope="col">Branch Hub</th>
                  <th scope="col">City</th>
                  <th scope="col">Received Today</th>
                  <th scope="col">Completed</th>
                  <th scope="col">Completion Rate</th>
                  <th scope="col">Avg Duration</th>
                  <th scope="col" className="org-table__th--actions">
                    Analytics &amp; Map
                  </th>
                </tr>
              </thead>
              <tbody>
                {branchPerformanceRows.map(({ branch, computed }) => {
                  const rate = computed.completionRatePercent;
                  return (
                    <tr key={branch.id}>
                      <td>
                        <div className="org-branch-name-cell">
                          <Link
                            href={`/organization/branches/${branch.id}`}
                            className="org-branch-name org-branch-name--link"
                          >
                            {branch.name}
                          </Link>
                          <span className="org-branch-coords">{branch.code}</span>
                        </div>
                      </td>
                      <td>
                        <span className="org-branch-city">
                          <MapPin
                            size={13}
                            className="org-branch-city__icon"
                            aria-hidden="true"
                          />
                          <span>{branch.city}</span>
                        </span>
                      </td>
                      <td>
                        <strong>{computed.deliveriesReceivedToday ?? 0}</strong>
                      </td>
                      <td>
                        <span className="text-emerald-700 font-semibold">
                          {computed.deliveriesCompletedToday ?? 0}
                        </span>
                        {computed.pendingDeliveries ? (
                          <span className="text-xs text-slate-500 ml-1.5">
                            ({computed.pendingDeliveries} pending)
                          </span>
                        ) : null}
                      </td>
                      <td>
                        {rate !== null ? (
                          <div className="org-perf-rate-cell">
                            <span className="org-perf-rate-cell__value">{rate}%</span>
                            <div className="org-perf-rate-cell__bar">
                              <div
                                className="org-perf-rate-cell__fill"
                                style={{ width: `${Math.min(100, rate)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="org-branch-contact__muted">Suspended</span>
                        )}
                      </td>
                      <td>
                        {computed.averageDeliveryDurationMinutes !== null ? (
                          <span className="org-coords-mono">
                            {computed.averageDeliveryDurationMinutes} min
                          </span>
                        ) : (
                          <span className="org-branch-contact__muted">—</span>
                        )}
                      </td>
                      <td className="org-table__td--actions">
                        <div className="org-row-actions">
                          <Link
                            href={`/organization/branches/${branch.id}`}
                            className="org-action-btn"
                          >
                            <Eye size={13} aria-hidden="true" />
                            <span>Inspect Hub</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

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
