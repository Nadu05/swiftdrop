'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Info,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import {
  calculateBranchCourierOperationsMetrics,
  calculateBranchDeliveryOperationsMetrics,
  calculateBranchPerformanceMetrics,
  OrganizationApiError,
} from '@/api/services/organization.api';
import {
  useBranchCourierRoster,
  useBranchDeliveryQueue,
  useBranches,
  useBranchPerformanceSummary,
  useBranchServiceAreas,
} from '@/hooks/api/use-organization';
import {
  resolveAuthorizedBranchContext,
  useBranchConsoleStore,
} from '@/store/branch-console.store';
import type {
  BranchCourierRosterItem,
  BranchDeliveryRequestItem,
  BranchPerformanceSummaryResponse,
  BranchResponse,
  ServiceAreaResponse,
} from '@/types/organization.types';
import {
  isBranchDashboardPreviewActive,
  MOCK_BRANCH_INFO,
  MOCK_COMPUTED_PERFORMANCE,
  MOCK_COURIER_METRICS,
  MOCK_COURIER_ROSTER,
  MOCK_DELIVERY_QUEUE,
  MOCK_DELIVERY_SUMMARY_METRICS,
  MOCK_PERFORMANCE_SUMMARY,
  MOCK_SERVICE_AREAS,
} from '@/api/mock/branch-dashboard.mock';
import BranchManagerWelcome from './BranchManagerWelcome';
import BranchQuickActions from './BranchQuickActions';
import BranchDeliverySummaryCards from './BranchDeliverySummaryCards';
import BranchRecentDeliveryActivity from './BranchRecentDeliveryActivity';
import BranchCourierOperationsOverview from './BranchCourierOperationsOverview';
import BranchPerformanceOverview from './BranchPerformanceOverview';
import BranchInfoServiceAreaSection from './BranchInfoServiceAreaSection';

export interface BranchManagerDashboardProps {
  /**
   * Optional explicit assigned branch ID from authenticated user context.
   * Pass `null` to explicitly indicate the user has no assigned branch.
   */
  assignedBranchId?: number | null;
  /**
   * Optional authenticated Branch Manager display name from Identity Service.
   */
  managerDisplayName?: string | null;
  /**
   * Whether the caller is authorized for Head Office administration.
   * Defaults to `false` (strict least-privilege for Branch Managers).
   */
  canAccessHeadOffice?: boolean;
  /**
   * Whether the caller is authorized to edit branch/service-area definitions.
   * Defaults to `false` (strictly read-only for Branch Managers).
   */
  canEditBranchConfig?: boolean;
  /**
   * Whether to fall back to the first active branch returned by `organization-service`
   * while authentication integration is deferred. Defaults to `true`.
   */
  allowAuthorizedListFallback?: boolean;
  /**
   * Optional URL `branchId` query parameter override for testing UI branch isolation.
   */
  urlBranchIdOverride?: string | null;
  /**
   * Optional explicit preview mode flag. When omitted, reads from `isBranchDashboardPreviewActive()`.
   */
  previewMode?: boolean;
  /**
   * Optional query state overrides for deterministic unit/component testing
   * without requiring live network connections.
   */
  testOverrides?: {
    branches?: BranchResponse[];
    isLoadingBranches?: boolean;
    isRefreshing?: boolean;
    branchesError?: Error | OrganizationApiError | null;
    deliveryQueue?: BranchDeliveryRequestItem[];
    isLoadingQueue?: boolean;
    queueError?: Error | OrganizationApiError | null;
    courierRoster?: BranchCourierRosterItem[];
    isLoadingRoster?: boolean;
    rosterError?: Error | OrganizationApiError | null;
    serviceAreas?: ServiceAreaResponse[];
    isLoadingServiceAreas?: boolean;
    serviceAreasError?: Error | OrganizationApiError | null;
    performanceSummary?: BranchPerformanceSummaryResponse | null;
    isLoadingPerformance?: boolean;
    performanceError?: Error | OrganizationApiError | null;
    lastUpdatedLabel?: string | null;
  };
}

function getErrorStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  if ('status' in err && typeof (err as { status?: unknown }).status === 'number') {
    return (err as { status: number }).status;
  }
  return undefined;
}

function getErrorMessage(err: unknown, fallback: string): string | null {
  if (!err) return null;
  if (err instanceof Error) return err.message;
  return fallback;
}

/**
 * Branch Manager Operational Dashboard
 * Member 04 — Branch Console / Branch Manager Dashboard UI
 *
 * Supports both:
 * 1. Live backend microservices integration through Spring Cloud API Gateway (:8080).
 * 2. Development Preview Mode with realistic demonstration data for Colombo Central Branch (CMB-001).
 */
export default function BranchManagerDashboard({
  assignedBranchId: explicitAssignedBranchId,
  managerDisplayName: explicitManagerName,
  canAccessHeadOffice: explicitCanAccessHeadOffice,
  canEditBranchConfig: explicitCanEditBranchConfig,
  allowAuthorizedListFallback = true,
  urlBranchIdOverride,
  previewMode: explicitPreviewMode,
  testOverrides,
}: BranchManagerDashboardProps = {}) {
  const searchParams = useSearchParams();
  const rawUrlBranchId =
    urlBranchIdOverride !== undefined
      ? urlBranchIdOverride
      : searchParams?.get('branchId') ?? null;

  // Development Preview Mode (controlled strictly via .env or explicit prop)
  const isPreviewActive =
    explicitPreviewMode !== undefined
      ? explicitPreviewMode
      : testOverrides
        ? false
        : isBranchDashboardPreviewActive();

  const [simulatedRefreshing, setSimulatedRefreshing] = useState(false);
  const [simulatedLastUpdated, setSimulatedLastUpdated] = useState<string>(() => {
    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  });

  const storeAssignedBranchId = useBranchConsoleStore(
    (s) => s.assignedBranchId
  );
  const storeManagerName = useBranchConsoleStore((s) => s.managerDisplayName);
  const storeCanAccessHeadOffice = useBranchConsoleStore(
    (s) => s.canAccessHeadOffice
  );
  const storeCanEditBranchConfig = useBranchConsoleStore(
    (s) => s.canEditBranchConfig
  );
  const setAssignedBranchId = useBranchConsoleStore(
    (s) => s.setAssignedBranchId
  );

  const managerDisplayName =
    explicitManagerName !== undefined
      ? explicitManagerName
      : isPreviewActive
        ? 'A. Wickramasinghe'
        : storeManagerName;

  const canAccessHeadOffice =
    explicitCanAccessHeadOffice !== undefined
      ? explicitCanAccessHeadOffice
      : storeCanAccessHeadOffice;

  const canEditBranchConfig =
    explicitCanEditBranchConfig !== undefined
      ? explicitCanEditBranchConfig
      : storeCanEditBranchConfig;

  // 1. Fetch Registered Branches (Organization Service)
  const branchesQuery = useBranches();
  const liveBranches = testOverrides?.branches ?? branchesQuery.data ?? [];
  const liveIsLoadingBranches =
    testOverrides?.isLoadingBranches ?? branchesQuery.isLoading;
  const liveRawBranchesError =
    testOverrides?.branchesError !== undefined
      ? testOverrides.branchesError
      : branchesQuery.error;

  // Determine effective branches based on preview mode
  const { branches, isLoadingBranches, rawBranchesError } = useMemo(() => {
    if (!isPreviewActive) {
      return {
        branches: liveBranches,
        isLoadingBranches: liveIsLoadingBranches,
        rawBranchesError: liveRawBranchesError,
      };
    }

    const effectiveBranches =
      liveBranches.length > 0 ? liveBranches : [MOCK_BRANCH_INFO];
    return {
      branches: effectiveBranches,
      isLoadingBranches: false,
      rawBranchesError: null,
    };
  }, [
    isPreviewActive,
    liveBranches,
    liveIsLoadingBranches,
    liveRawBranchesError,
  ]);

  // 2. Resolve Authorized Assigned Branch (Strictly blocking URL `?branchId=` overrides)
  const {
    resolvedBranchId,
    resolvedBranch,
    isUrlOverrideBlocked,
    blockedUrlBranchId,
  } = useMemo(
    () =>
      resolveAuthorizedBranchContext({
        explicitAssignedBranchId:
          explicitAssignedBranchId !== undefined
            ? explicitAssignedBranchId
            : isPreviewActive && !testOverrides
              ? MOCK_BRANCH_INFO.id
              : undefined,
        storeAssignedBranchId,
        availableBranches: branches,
        urlBranchIdParam: rawUrlBranchId,
        allowAuthorizedListFallback,
      }),
    [
      explicitAssignedBranchId,
      isPreviewActive,
      testOverrides,
      storeAssignedBranchId,
      branches,
      rawUrlBranchId,
      allowAuthorizedListFallback,
    ]
  );

  // Sync resolved branch ID into Zustand store
  useEffect(() => {
    if (
      resolvedBranchId !== null &&
      explicitAssignedBranchId === undefined &&
      storeAssignedBranchId === null
    ) {
      setAssignedBranchId(resolvedBranchId);
    }
  }, [
    resolvedBranchId,
    explicitAssignedBranchId,
    storeAssignedBranchId,
    setAssignedBranchId,
  ]);

  const activeBranchId = resolvedBranch?.id ?? undefined;

  // 3. Fetch Branch-Scoped Operational Data
  const queueQuery = useBranchDeliveryQueue(activeBranchId);
  const rosterQuery = useBranchCourierRoster(activeBranchId);
  const serviceAreasQuery = useBranchServiceAreas(activeBranchId ?? 0);
  const performanceQuery = useBranchPerformanceSummary(activeBranchId);

  // Derive effective queue data
  const { deliveryQueue, isLoadingQueue, rawQueueError } = useMemo(() => {
    if (testOverrides?.deliveryQueue !== undefined || testOverrides?.queueError !== undefined) {
      return {
        deliveryQueue: testOverrides.deliveryQueue ?? [],
        isLoadingQueue: testOverrides.isLoadingQueue ?? false,
        rawQueueError: testOverrides.queueError ?? null,
      };
    }

    if (isPreviewActive) {
      return { deliveryQueue: MOCK_DELIVERY_QUEUE, isLoadingQueue: false, rawQueueError: null };
    }

    return {
      deliveryQueue: queueQuery.data ?? [],
      isLoadingQueue: Boolean(activeBranchId) && queueQuery.isLoading,
      rawQueueError: queueQuery.error,
    };
  }, [
    testOverrides?.deliveryQueue,
    testOverrides?.isLoadingQueue,
    testOverrides?.queueError,
    isPreviewActive,
    activeBranchId,
    queueQuery.data,
    queueQuery.isLoading,
    queueQuery.error,
  ]);

  // Derive effective courier roster
  const { courierRoster, isLoadingRoster, rawRosterError } = useMemo(() => {
    if (testOverrides?.courierRoster !== undefined || testOverrides?.rosterError !== undefined) {
      return {
        courierRoster: testOverrides.courierRoster ?? [],
        isLoadingRoster: testOverrides.isLoadingRoster ?? false,
        rawRosterError: testOverrides.rosterError ?? null,
      };
    }

    if (isPreviewActive) {
      return { courierRoster: MOCK_COURIER_ROSTER, isLoadingRoster: false, rawRosterError: null };
    }

    return {
      courierRoster: rosterQuery.data ?? [],
      isLoadingRoster: Boolean(activeBranchId) && rosterQuery.isLoading,
      rawRosterError: rosterQuery.error,
    };
  }, [
    testOverrides?.courierRoster,
    testOverrides?.isLoadingRoster,
    testOverrides?.rosterError,
    isPreviewActive,
    activeBranchId,
    rosterQuery.data,
    rosterQuery.isLoading,
    rosterQuery.error,
  ]);

  // Derive effective service areas
  const { serviceAreas, isLoadingServiceAreas, rawServiceAreasError } = useMemo(() => {
    if (testOverrides?.serviceAreas !== undefined || testOverrides?.serviceAreasError !== undefined) {
      return {
        serviceAreas: testOverrides.serviceAreas ?? [],
        isLoadingServiceAreas: testOverrides.isLoadingServiceAreas ?? false,
        rawServiceAreasError: testOverrides.serviceAreasError ?? null,
      };
    }

    if (isPreviewActive) {
      return { serviceAreas: MOCK_SERVICE_AREAS, isLoadingServiceAreas: false, rawServiceAreasError: null };
    }

    return {
      serviceAreas: serviceAreasQuery.data ?? [],
      isLoadingServiceAreas: Boolean(activeBranchId) && serviceAreasQuery.isLoading,
      rawServiceAreasError: serviceAreasQuery.error,
    };
  }, [
    testOverrides?.serviceAreas,
    testOverrides?.isLoadingServiceAreas,
    testOverrides?.serviceAreasError,
    isPreviewActive,
    activeBranchId,
    serviceAreasQuery.data,
    serviceAreasQuery.isLoading,
    serviceAreasQuery.error,
  ]);

  // Derive effective performance summary
  const { performanceSummary, isLoadingPerformance, rawPerformanceError } = useMemo(() => {
    if (testOverrides?.performanceSummary !== undefined || testOverrides?.performanceError !== undefined) {
      return {
        performanceSummary: testOverrides.performanceSummary ?? null,
        isLoadingPerformance: testOverrides.isLoadingPerformance ?? false,
        rawPerformanceError: testOverrides.performanceError ?? null,
      };
    }

    if (isPreviewActive) {
      return { performanceSummary: MOCK_PERFORMANCE_SUMMARY, isLoadingPerformance: false, rawPerformanceError: null };
    }

    return {
      performanceSummary: performanceQuery.data ?? null,
      isLoadingPerformance: Boolean(activeBranchId) && performanceQuery.isLoading,
      rawPerformanceError: performanceQuery.error,
    };
  }, [
    testOverrides?.performanceSummary,
    testOverrides?.isLoadingPerformance,
    testOverrides?.performanceError,
    isPreviewActive,
    activeBranchId,
    performanceQuery.data,
    performanceQuery.isLoading,
    performanceQuery.error,
  ]);

  const isRefreshing =
    testOverrides?.isRefreshing ??
    simulatedRefreshing ??
    (branchesQuery.isRefetching ||
      queueQuery.isRefetching ||
      rosterQuery.isRefetching ||
      serviceAreasQuery.isRefetching ||
      performanceQuery.isRefetching);

  const lastUpdatedLabel = useMemo(() => {
    if (testOverrides?.lastUpdatedLabel !== undefined) {
      return testOverrides.lastUpdatedLabel;
    }
    if (isPreviewActive) {
      return simulatedLastUpdated;
    }
    if (!branchesQuery.dataUpdatedAt) return null;
    return new Date(branchesQuery.dataUpdatedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [testOverrides?.lastUpdatedLabel, isPreviewActive, simulatedLastUpdated, branchesQuery.dataUpdatedAt]);

  // 4. Error & Auth Status Classification
  const primaryErrorStatus =
    getErrorStatus(rawBranchesError) ??
    getErrorStatus(rawQueueError) ??
    getErrorStatus(rawRosterError);

  const isSessionExpired = primaryErrorStatus === 401;
  const isUnauthorizedAccess = primaryErrorStatus === 403;

  const branchesErrorMessage = getErrorMessage(
    rawBranchesError,
    'Unable to load assigned branch details from Organization Service.'
  );
  const queueErrorMessage = getErrorMessage(
    rawQueueError,
    'Branch delivery request queue API is not yet available from the backend.'
  );
  const rosterErrorMessage = getErrorMessage(
    rawRosterError,
    'Branch courier roster API is not yet available from the backend.'
  );
  const serviceAreasErrorMessage = getErrorMessage(
    rawServiceAreasError,
    'Branch service-area API is not yet available from the backend.'
  );
  const performanceErrorMessage = getErrorMessage(
    rawPerformanceError,
    'Branch performance analytics API is not yet available from the backend.'
  );

  const isQueueAvailable = !rawQueueError && Boolean(resolvedBranch);
  const isRosterAvailable = !rawRosterError && Boolean(resolvedBranch);
  const isPerformanceAvailable =
    !rawPerformanceError &&
    performanceSummary !== null &&
    Boolean(resolvedBranch);

  // 5. Derived Operational Metrics
  const deliveryMetrics = useMemo(() => {
    if (isPreviewActive) {
      return MOCK_DELIVERY_SUMMARY_METRICS;
    }
    return calculateBranchDeliveryOperationsMetrics(
      deliveryQueue,
      performanceSummary,
      isQueueAvailable
    );
  }, [isPreviewActive, deliveryQueue, performanceSummary, isQueueAvailable]);

  const courierMetrics = useMemo(() => {
    if (isPreviewActive) {
      return MOCK_COURIER_METRICS;
    }
    return calculateBranchCourierOperationsMetrics(
      courierRoster,
      isRosterAvailable
    );
  }, [isPreviewActive, courierRoster, isRosterAvailable]);

  const computedPerformance = useMemo(() => {
    if (isPreviewActive) {
      return MOCK_COMPUTED_PERFORMANCE;
    }
    return calculateBranchPerformanceMetrics(performanceSummary);
  }, [isPreviewActive, performanceSummary]);

  const firstUnassignedDelivery = useMemo(
    () =>
      deliveryQueue.find((item) => item.assignmentStatus === 'UNASSIGNED') ??
      null,
    [deliveryQueue]
  );

  // Detect partial data availability
  const unavailableSubsystems = useMemo(() => {
    if (!resolvedBranch || isLoadingBranches) return [];
    const list: string[] = [];
    if (rawQueueError && !isLoadingQueue) list.push('Delivery Request Queue');
    if (rawRosterError && !isLoadingRoster) list.push('Courier Roster');
    if (rawPerformanceError && !isLoadingPerformance)
      list.push('Branch Performance Analytics');
    if (rawServiceAreasError && !isLoadingServiceAreas)
      list.push('Service-Area Definitions');
    return list;
  }, [
    resolvedBranch,
    isLoadingBranches,
    rawQueueError,
    isLoadingQueue,
    rawRosterError,
    isLoadingRoster,
    rawPerformanceError,
    isLoadingPerformance,
    rawServiceAreasError,
    isLoadingServiceAreas,
  ]);

  // Refresh handler
  const handleRefreshAll = useCallback(() => {
    if (isPreviewActive) {
      setSimulatedRefreshing(true);
      setTimeout(() => {
        setSimulatedRefreshing(false);
        setSimulatedLastUpdated(
          new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      }, 600);
      return;
    }

    branchesQuery.refetch();
    if (activeBranchId) {
      queueQuery.refetch();
      rosterQuery.refetch();
      serviceAreasQuery.refetch();
      performanceQuery.refetch();
    }
  }, [
    isPreviewActive,
    activeBranchId,
    branchesQuery,
    queueQuery,
    rosterQuery,
    serviceAreasQuery,
    performanceQuery,
  ]);

  const handleAuthorizedBranchSelect = useCallback(
    (newBranchId: number) => {
      if (Number.isInteger(newBranchId) && newBranchId > 0) {
        setAssignedBranchId(newBranchId);
      }
    },
    [setAssignedBranchId]
  );

  return (
    <div className="org-page org-bm-dashboard" data-testid="branch-manager-dashboard">
      {/* Section A: Branch Welcome & Assigned Branch Identity */}
      <BranchManagerWelcome
        branch={resolvedBranch}
        availableBranches={branches}
        canSwitchAssignedBranch={
          explicitAssignedBranchId === undefined && branches.length > 1
        }
        onSelectAssignedBranch={handleAuthorizedBranchSelect}
        managerDisplayName={managerDisplayName}
        lastUpdatedLabel={lastUpdatedLabel}
        isLoading={isLoadingBranches}
        isRefreshing={isRefreshing}
        onRefresh={handleRefreshAll}
        isPreviewMode={isPreviewActive}
      />

      {/* Dashboard Refresh In-Progress Banner */}
      {isRefreshing && !isLoadingBranches && (
        <div
          className="org-phase-notice"
          role="status"
          aria-live="polite"
          data-testid="branch-dashboard-refreshing"
        >
          <div className="org-phase-notice__left">
            <RefreshCw
              size={15}
              className="org-phase-notice__icon org-icon--spinning"
              aria-hidden="true"
            />
            <span>
              Refreshing branch operational data with the API Gateway...
            </span>
          </div>
        </div>
      )}

      {/* Branch Isolation Security Boundary Alert (URL Tampering Blocked) */}
      {isUrlOverrideBlocked && (
        <div
          className="org-form-alert org-form-alert--error"
          role="alert"
          data-testid="branch-isolation-warning"
        >
          <div className="org-form-alert__content">
            <ShieldAlert
              size={18}
              className="org-form-alert__icon"
              aria-hidden="true"
            />
            <div className="org-form-alert__text">
              <strong className="org-form-alert__title">
                Branch Isolation Enforced — URL Branch Parameter Ignored
              </strong>
              <p className="org-form-alert__desc">
                Attempted access to branch parameter{' '}
                <code className="org-inline-code">
                  ?branchId={blockedUrlBranchId}
                </code>{' '}
                was blocked. Branch Managers cannot switch branches via URL or
                query parameters and remain restricted to their assigned branch
                context
                {resolvedBranch
                  ? ` (${resolvedBranch.name} · ${resolvedBranch.code})`
                  : ''}
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {/* State 1: Session Expired (HTTP 401) */}
      {isSessionExpired ? (
        <section
          className="org-directory-card"
          role="alert"
          data-testid="branch-dashboard-session-expired"
        >
          <div className="org-state-box org-state-box--error">
            <div
              className="org-state-box__icon org-state-box__icon--error"
              aria-hidden="true"
            >
              <KeyRound size={22} />
            </div>
            <h2 className="org-state-box__title">Session Expired (HTTP 401)</h2>
            <p className="org-state-box__desc">
              {branchesErrorMessage ||
                'Your Branch Manager session has expired or is unauthenticated. Please sign in again to resume branch operations.'}
            </p>
            <div className="org-state-box__actions">
              <Link href="/login" className="org-btn org-btn--primary">
                <span>Sign In Again</span>
              </Link>
              <button
                type="button"
                className="org-btn org-btn--secondary"
                onClick={handleRefreshAll}
              >
                <RefreshCw size={14} aria-hidden="true" />
                <span>Retry Session Check</span>
              </button>
            </div>
          </div>
        </section>
      ) : isUnauthorizedAccess ? (
        /* State 2: Unauthorized Access (HTTP 403) */
        <section
          className="org-directory-card"
          role="alert"
          data-testid="branch-dashboard-unauthorized"
        >
          <div className="org-state-box org-state-box--error">
            <div
              className="org-state-box__icon org-state-box__icon--error"
              aria-hidden="true"
            >
              <Lock size={22} />
            </div>
            <h2 className="org-state-box__title">
              Unauthorized Branch Access (HTTP 403)
            </h2>
            <p className="org-state-box__desc">
              {branchesErrorMessage ||
                'You do not have permission to access this branch console. Branch Managers may only view and operate their assigned branch.'}
            </p>
            <div className="org-state-box__actions">
              <button
                type="button"
                className="org-btn org-btn--secondary"
                onClick={handleRefreshAll}
              >
                <RefreshCw size={14} aria-hidden="true" />
                <span>Retry Authorization Check</span>
              </button>
            </div>
          </div>
        </section>
      ) : isLoadingBranches ? (
        /* State 3: Initial Loading State */
        <section
          className="org-directory-card"
          role="status"
          aria-live="polite"
          data-testid="branch-dashboard-loading"
        >
          <div className="org-state-box">
            <div className="org-spinner" aria-hidden="true" />
            <h2 className="org-state-box__title">
              Loading Assigned Branch Operations...
            </h2>
            <p className="org-state-box__desc">
              Synchronizing branch identity, delivery queue, courier roster, and
              service-area coverage through the API Gateway.
            </p>
          </div>
        </section>
      ) : branchesErrorMessage ? (
        /* State 4: Primary API Unavailable / Error State */
        <section
          className="org-directory-card"
          role="alert"
          data-testid="branch-dashboard-api-error"
        >
          <div className="org-state-box org-state-box--error">
            <div
              className="org-state-box__icon org-state-box__icon--error"
              aria-hidden="true"
            >
              <AlertCircle size={22} />
            </div>
            <h2 className="org-state-box__title">
              Branch Operations API Unavailable
            </h2>
            <p className="org-state-box__desc">{branchesErrorMessage}</p>
            <div className="org-dashboard-contract-note">
              <Info
                size={15}
                className="org-dashboard-contract-note__icon"
                aria-hidden="true"
              />
              <span>
                Verify that the API Gateway (<code className="org-inline-code">:8080</code>)
                and Organization Service (<code className="org-inline-code">:8082</code>)
                are running.
              </span>
            </div>
            <div className="org-state-box__actions">
              <button
                type="button"
                className="org-btn org-btn--primary"
                onClick={handleRefreshAll}
              >
                <RefreshCw size={14} aria-hidden="true" />
                <span>Retry Connection</span>
              </button>
            </div>
          </div>
        </section>
      ) : !resolvedBranch ? (
        /* State 5: No Assigned Branch Determined */
        <section
          className="org-directory-card"
          role="status"
          data-testid="branch-dashboard-no-branch"
        >
          <div className="org-state-box">
            <div className="org-state-box__icon" aria-hidden="true">
              <Building2 size={22} />
            </div>
            <h2 className="org-state-box__title">
              No Assigned Branch Context Available
            </h2>
            <p className="org-state-box__desc">
              {explicitAssignedBranchId !== undefined &&
              explicitAssignedBranchId !== null
                ? `Assigned branch #${explicitAssignedBranchId} could not be found in the Organization Service.`
                : 'An assigned branch could not be determined for the current Branch Manager session.'}
            </p>
            <div className="org-dashboard-contract-note">
              <Info
                size={15}
                className="org-dashboard-contract-note__icon"
                aria-hidden="true"
              />
              <span>
                <strong>Deferred Auth Integration Boundary (Member 01):</strong>{' '}
                Once Identity Service authentication is merged, this dashboard
                will resolve the Branch Manager&apos;s assigned{' '}
                <code className="org-inline-code">branchId</code> claim
                automatically.
              </span>
            </div>
            <div className="org-state-box__actions">
              <button
                type="button"
                className="org-btn org-btn--primary"
                onClick={handleRefreshAll}
              >
                <RefreshCw size={14} aria-hidden="true" />
                <span>Retry Branch Resolution</span>
              </button>
            </div>
          </div>
        </section>
      ) : (
        /* State 6: Assigned Branch Resolved — Render Complete Operational Dashboard */
        <>
          {/* Partial Data Unavailable Notice when 1+ secondary operational endpoints are pending */}
          {unavailableSubsystems.length > 0 && (
            <div
              className="org-bm-partial-banner"
              role="status"
              data-testid="branch-dashboard-partial-data"
            >
              <div className="org-bm-partial-banner__left">
                <AlertTriangle
                  size={16}
                  className="text-amber-600 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div>
                  <strong className="org-bm-partial-banner__title">
                    Partial Operational Data Available
                  </strong>
                  <p className="org-bm-partial-banner__desc">
                    Assigned branch identity (
                    <strong>
                      {resolvedBranch.name} · {resolvedBranch.code}
                    </strong>
                    ) is synchronized, while{' '}
                    <strong>{unavailableSubsystems.join(', ')}</strong>{' '}
                    {unavailableSubsystems.length === 1
                      ? 'is currently pending backend integration or unreachable.'
                      : 'are currently pending backend integration or unreachable.'}{' '}
                    Unavailable metrics are marked as <code className="org-inline-code">—</code>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="org-btn org-btn--secondary"
                onClick={handleRefreshAll}
              >
                <RefreshCw size={13} aria-hidden="true" />
                <span>Retry All</span>
              </button>
            </div>
          )}

          {/* Section B: Delivery Operations Summary (Urgent operational metrics first) */}
          <BranchDeliverySummaryCards
            metrics={deliveryMetrics}
            isLoading={isLoadingQueue}
            isPreviewMode={isPreviewActive}
          />

          {/* Section G: Quick Actions */}
          <BranchQuickActions
            branchId={resolvedBranch.id}
            firstUnassignedDelivery={firstUnassignedDelivery}
            canAccessHeadOffice={canAccessHeadOffice}
            isLoading={isLoadingBranches}
            isRefreshing={isRefreshing}
            onRefresh={handleRefreshAll}
          />

          {/* Operational Two-Column Grid: Section D (Recent Delivery Activity) + Section C (Courier Operations) */}
          <div className="org-bm-ops-grid">
            <BranchRecentDeliveryActivity
              branchId={resolvedBranch.id}
              branchName={resolvedBranch.name}
              requests={deliveryQueue}
              isLoading={isLoadingQueue}
              error={queueErrorMessage}
              onRetry={() => queueQuery.refetch()}
              isPreviewMode={isPreviewActive}
            />

            <BranchCourierOperationsOverview
              branchId={resolvedBranch.id}
              branchName={resolvedBranch.name}
              couriers={courierRoster}
              metrics={courierMetrics}
              isLoading={isLoadingRoster}
              error={rosterErrorMessage}
              onRetry={() => rosterQuery.refetch()}
              isPreviewMode={isPreviewActive}
            />
          </div>

          {/* Section E: Branch Performance Overview with Trends Chart */}
          <BranchPerformanceOverview
            branchId={resolvedBranch.id}
            branchName={resolvedBranch.name}
            performance={computedPerformance}
            couriers={courierRoster}
            isPerformanceAvailable={isPerformanceAvailable}
            isCourierRosterAvailable={isRosterAvailable}
            isLoading={isLoadingPerformance}
            error={performanceErrorMessage}
            onRetry={() => performanceQuery.refetch()}
            isPreviewMode={isPreviewActive}
          />

          {/* Section F: Branch Information & Service Area (Read-Only for Branch Manager) */}
          <BranchInfoServiceAreaSection
            branch={resolvedBranch}
            serviceAreas={serviceAreas}
            isLoadingServiceAreas={isLoadingServiceAreas}
            serviceAreasError={serviceAreasErrorMessage}
            onRetryServiceAreas={() => serviceAreasQuery.refetch()}
            canEditBranchConfig={canEditBranchConfig}
            isPreviewMode={isPreviewActive}
          />
        </>
      )}
    </div>
  );
}
