'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Eye,
  FlaskConical,
  History,
  Info,
  Plus,
  RefreshCw,
} from 'lucide-react';
import {
  calculateOrganizationDashboardMetrics,
  getBranches,
  getServiceAreas,
  ISOLATED_DEV_MOCK_BRANCHES,
  ISOLATED_DEV_MOCK_SERVICE_AREAS,
} from '@/api/services/organization.api';
import type {
  BranchResponse,
  ServiceAreaResponse,
} from '@/types/organization.types';
import OrganizationWelcome from './OrganizationWelcome';
import OrganizationSummaryCards from './OrganizationSummaryCards';
import BranchStatusOverview from './BranchStatusOverview';
import ServiceAreaOverview from './ServiceAreaOverview';

export default function OrganizationDashboard() {
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [serviceAreas, setServiceAreas] = useState<ServiceAreaResponse[]>([]);

  const [isLoadingBranches, setIsLoadingBranches] = useState<boolean>(true);
  const [isLoadingServiceAreas, setIsLoadingServiceAreas] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [branchesError, setBranchesError] = useState<string | null>(null);
  const [serviceAreasError, setServiceAreasError] = useState<string | null>(null);

  const [isMockMode, setIsMockMode] = useState<boolean>(false);
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState<string | null>(null);

  const loadDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoadingBranches(true);
      setIsLoadingServiceAreas(true);
    }

    setBranchesError(null);
    setServiceAreasError(null);
    setIsMockMode(false);

    const [branchesResult, serviceAreasResult] = await Promise.allSettled([
      getBranches(),
      getServiceAreas(),
    ]);

    if (branchesResult.status === 'fulfilled') {
      setBranches(branchesResult.value);
      setLastUpdatedLabel(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    } else {
      setBranches([]);
      setBranchesError(
        branchesResult.reason instanceof Error
          ? branchesResult.reason.message
          : 'Failed to load organization branches from backend.'
      );
    }

    if (serviceAreasResult.status === 'fulfilled') {
      setServiceAreas(serviceAreasResult.value);
    } else {
      setServiceAreas([]);
      setServiceAreasError(
        serviceAreasResult.reason instanceof Error
          ? serviceAreasResult.reason.message
          : 'Failed to load service areas from backend.'
      );
    }

    setIsLoadingBranches(false);
    setIsLoadingServiceAreas(false);
    setIsRefreshing(false);
  }, []);

  const retryServiceAreasOnly = useCallback(async () => {
    if (isMockMode) return;
    setIsLoadingServiceAreas(true);
    setServiceAreasError(null);
    try {
      const data = await getServiceAreas();
      setServiceAreas(data);
    } catch (err: any) {
      setServiceAreas([]);
      setServiceAreasError(
        err instanceof Error
          ? err.message
          : 'Failed to load service areas from backend.'
      );
    } finally {
      setIsLoadingServiceAreas(false);
    }
  }, [isMockMode]);

  useEffect(() => {
    loadDashboardData(false);
  }, [loadDashboardData]);

  const handleEnableMockPreview = useCallback(() => {
    setBranches([...ISOLATED_DEV_MOCK_BRANCHES]);
    setServiceAreas([...ISOLATED_DEV_MOCK_SERVICE_AREAS]);
    setBranchesError(null);
    setServiceAreasError(null);
    setIsMockMode(true);
    setIsLoadingBranches(false);
    setIsLoadingServiceAreas(false);
  }, []);

  const metrics = useMemo(
    () => calculateOrganizationDashboardMetrics(branches, serviceAreas),
    [branches, serviceAreas]
  );

  const serviceAreasAvailable =
    isMockMode || (!serviceAreasError && !isLoadingServiceAreas);

  return (
    <div className="org-page">
      <OrganizationWelcome
        lastUpdatedLabel={lastUpdatedLabel}
        isLoading={isLoadingBranches}
        isRefreshing={isRefreshing}
        isMockMode={isMockMode}
        onRefresh={() => loadDashboardData(true)}
      />

      {/* Isolated Dev Mock Preview Banner */}
      {isMockMode && (
        <div className="org-mock-banner" role="status">
          <div className="org-mock-banner__content">
            <FlaskConical size={18} className="org-mock-banner__icon" aria-hidden="true" />
            <span>
              <strong>Isolated Dev Mock Preview Mode Active:</strong> Displaying temporary
              in-memory branch and service-area records because the local Spring Boot API
              Gateway (<code className="org-inline-code">localhost:8080</code>) is offline.
            </span>
          </div>
          <button
            type="button"
            className="org-mock-banner__btn"
            onClick={() => loadDashboardData(true)}
          >
            <RefreshCw size={13} aria-hidden="true" />
            <span>Retry Live Backend</span>
          </button>
        </div>
      )}

      {/* Explicit API Error State when Backend is Unreachable */}
      {branchesError && !isMockMode && (
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
              onClick={() => loadDashboardData(true)}
            >
              <RefreshCw size={14} aria-hidden="true" />
              <span>Retry Live API</span>
            </button>
            <button
              type="button"
              className="org-btn org-btn--secondary"
              onClick={handleEnableMockPreview}
            >
              <FlaskConical size={14} aria-hidden="true" />
              <span>Preview with Isolated Dev Mock Data</span>
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

      {/* Quick Navigation Strip */}
      <section
        className="org-dashboard-quickbar"
        aria-label="Organization quick actions and navigation"
      >
        <div className="org-dashboard-quickbar__left">
          <div className="org-dashboard-quickbar__icon" aria-hidden="true">
            <Building2 size={18} />
          </div>
          <div className="org-dashboard-quickbar__text">
            <h2 className="org-dashboard-quickbar__title">
              Head Office Branch Management &amp; Directory
            </h2>
            <p className="org-dashboard-quickbar__desc">
              Search, filter, create, edit, or activate/deactivate branches across the
              organization.
            </p>
          </div>
        </div>
        <div className="org-dashboard-quickbar__actions">
          <Link
            href="/organization/branches"
            className="org-btn org-btn--secondary"
          >
            <Eye size={15} aria-hidden="true" />
            <span>Open Branch Directory</span>
          </Link>
          <Link
            href="/organization/branches/create"
            className="org-btn org-btn--primary"
          >
            <Plus size={15} aria-hidden="true" />
            <span>Create New Branch</span>
          </Link>
        </div>
      </section>

      {/* Branch Status Overview Table */}
      {(!branchesError || isMockMode) && (
        <BranchStatusOverview
          branches={branches}
          isLoading={isLoadingBranches}
          isMockMode={isMockMode}
        />
      )}

      {/* Member 03 Service-Area Coverage Overview */}
      {(!branchesError || isMockMode) && (
        <ServiceAreaOverview
          serviceAreas={serviceAreas}
          isLoading={isLoadingServiceAreas}
          error={serviceAreasError}
          isMockMode={isMockMode}
          onRetry={retryServiceAreasOnly}
        />
      )}

      {/* Audit Log / Recent Activity Integration Point (Documented Missing Backend API) */}
      <section
        className="org-directory-card org-dashboard-card org-dashboard-card--subtle"
        aria-labelledby="org-audit-integration-heading"
      >
        <div className="org-directory-card__header">
          <div className="org-directory-card__title-group">
            <div className="org-dashboard-card__title-row">
              <h2
                id="org-audit-integration-heading"
                className="org-directory-card__title"
              >
                Organization Activity &amp; Audit Stream
              </h2>
              <span className="org-dashboard-badge org-dashboard-badge--pending">
                Backend Endpoint Pending
              </span>
            </div>
            <p className="org-directory-card__subtitle">
              Organization-wide administrative audit events (branch status transitions,
              staff role assignments, and service-area boundary changes).
            </p>
          </div>

          <Link
            href="/organization/branches"
            className="org-dashboard-card__view-all"
          >
            <span>Manage branches</span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>

        {/*
         * TODO (Future Backend Integration Point — Member 03):
         * Connect to `GET /api/v1/organization/audit-logs` once exposed by
         * `organization-service`. Per project guidelines, no audit events or
         * activity feed entries are fabricated on the frontend.
         */}
        <div className="org-dashboard-audit-notice">
          <div className="org-dashboard-audit-notice__icon" aria-hidden="true">
            <History size={18} />
          </div>
          <div className="org-dashboard-audit-notice__body">
            <p className="org-dashboard-audit-notice__title">
              Dedicated Audit-Log Endpoint Not Yet Exposed
            </p>
            <p className="org-dashboard-audit-notice__desc">
              <code className="org-inline-code">organization-service</code> currently exposes{' '}
              <code className="org-inline-code">createdAt</code> and{' '}
              <code className="org-inline-code">updatedAt</code> timestamps on individual{' '}
              <code className="org-inline-code">BranchResponse</code> and{' '}
              <code className="org-inline-code">ServiceAreaResponse</code> records, which are
              displayed on each branch&apos;s Details page. An aggregated audit stream endpoint
              (e.g., <code className="org-inline-code">GET /api/v1/organization/audit-logs</code>)
              is documented as a future backend integration point.
            </p>
          </div>
          <div className="org-dashboard-audit-notice__meta">
            <Info size={14} aria-hidden="true" />
            <span>No fabricated activity events</span>
          </div>
        </div>
      </section>
    </div>
  );
}

