'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  calculateOrganizationDashboardMetrics,
  getBranches,
} from '@/api/services/organization.api';
import type {
  BranchResponse,
} from '@/types/organization.types';
import OrganizationWelcome from './OrganizationWelcome';
import OrganizationSummaryCards from './OrganizationSummaryCards';
import BranchStatusOverview from './BranchStatusOverview';
import ServiceAreaCoverageOverview from './ServiceAreaCoverageOverview';
import BranchAdminDashboard from '@/components/organization/branch-admin/BranchAdminDashboard';
import { useAuthStore } from '@/store/auth.store';
import { resolveOrganizationPermissions } from '@/lib/auth/branch-admin-permissions';

export default function OrganizationDashboard() {
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const permissions = useMemo(
    () => resolveOrganizationPermissions(user, activeRole),
    [user, activeRole]
  );

  // Branch Administrators see their assigned Branch Administrator Dashboard at /organization
  if (!permissions.isGlobalAdmin) {
    return <BranchAdminDashboard />;
  }

  return <HeadOfficeOrganizationDashboard />;
}

function HeadOfficeOrganizationDashboard() {
  const [branches, setBranches] = useState<BranchResponse[]>([]);

  const [isLoadingBranches, setIsLoadingBranches] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [branchesError, setBranchesError] = useState<string | null>(null);

  const [lastUpdatedLabel, setLastUpdatedLabel] = useState<string | null>(null);

  const loadDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoadingBranches(true);
    }

    setBranchesError(null);

    try {
      const data = await getBranches();
      setBranches(data);
      setLastUpdatedLabel(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    } catch (err: unknown) {
      setBranches([]);
      setBranchesError(
        err instanceof Error
          ? err.message
          : 'Failed to load organization branches from backend.'
      );
    } finally {
      setIsLoadingBranches(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData(false);
  }, [loadDashboardData]);

  const metrics = useMemo(
    () => calculateOrganizationDashboardMetrics(branches),
    [branches]
  );

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
      />

      {/* Branch Status Overview Table */}
      {!branchesError && (
        <BranchStatusOverview
          branches={branches}
          isLoading={isLoadingBranches}
        />
      )}

      {/* Service-Area Coverage Overview (Assigned Postal Areas per Branch) */}
      {!branchesError && (
        <ServiceAreaCoverageOverview
          branches={branches}
          isLoading={isLoadingBranches}
        />
      )}
    </div>
  );
}
