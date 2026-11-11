'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  calculateOrganizationDashboardMetrics,
  getBranches,
  getServiceAreas,
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
  }, []);

  useEffect(() => {
    loadDashboardData(false);
  }, [loadDashboardData]);

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
        onRefresh={() => loadDashboardData(true)}
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
              onClick={() => loadDashboardData(true)}
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
