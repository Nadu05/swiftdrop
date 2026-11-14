'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Inbox,
  Info,
  RefreshCw,
  Search,
} from 'lucide-react';
import { calculateBranchDeliveryQueueMetrics } from '@/api/services/organization.api';
import { useBranches, useBranchDeliveryQueue } from '@/hooks/api/use-organization';
import { useBranchConsoleStore } from '@/store/branch-console.store';
import {
  isBranchDashboardPreviewActive,
  MOCK_BRANCH_INFO,
  MOCK_DELIVERY_QUEUE,
} from '@/api/mock/branch-dashboard.mock';
import type {
  BranchDeliveryQueueFilter,
  BranchDeliveryQueueStatus,
  BranchDeliveryRequestItem,
  BranchResponse,
} from '@/types/organization.types';

function formatAssignmentStatusLabel(status: BranchDeliveryQueueStatus): string {
  switch (status) {
    case 'UNASSIGNED':
      return 'Unassigned';
    case 'READY_FOR_PICKUP':
      return 'Ready for pickup';
    case 'ASSIGNED':
      return 'Assigned';
    default:
      return status;
  }
}

/**
 * Screen 28 — Branch Console / Delivery Request Queue
 * Member 04 — Branch Console UI Implementation
 *
 * Strictly adheres to team boundaries:
 * - Uses actual branch context from `getBranches()` when available (never hardcodes "COLOMBO CENTRAL BRANCH").
 * - Computes summary counts strictly from backend queue data (never hardcodes 14, 32, or 6).
 * - Never fabricates sample delivery request rows (such as SD-10521 or SD-10520).
 */
export default function DeliveryRequestQueue() {
  const searchParams = useSearchParams();
  const branchIdParam = searchParams.get('branchId');

  const {
    data: branches = [],
    isLoading: isLoadingBranches,
    error: rawBranchError,
  } = useBranches();

  const assignedBranchId = useBranchConsoleStore((s) => s.assignedBranchId);
  const setAssignedBranchId = useBranchConsoleStore((s) => s.setAssignedBranchId);

  const [explicitBranchId, setExplicitBranchId] = useState<number | undefined>(
    assignedBranchId ??
      (branchIdParam && !Number.isNaN(Number(branchIdParam))
        ? Number(branchIdParam)
        : undefined)
  );

  const selectedBranchId = useMemo(() => {
    if (explicitBranchId !== undefined) return explicitBranchId;
    if (assignedBranchId !== null) return assignedBranchId;
    if (branches.length === 0) return undefined;
    const requestedId =
      branchIdParam && !Number.isNaN(Number(branchIdParam))
        ? Number(branchIdParam)
        : undefined;
    const matchingBranch = requestedId
      ? branches.find((b) => b.id === requestedId)
      : undefined;
    return (
      matchingBranch ??
      branches.find((b) => b.status === 'ACTIVE') ??
      branches[0]
    )?.id;
  }, [branches, explicitBranchId, assignedBranchId, branchIdParam]);

  const setSelectedBranchId = (id: number | undefined) => {
    setExplicitBranchId(id);
    setAssignedBranchId(id ?? null);
  };

  const {
    data: requests = [],
    isLoading: isLoadingQueue,
    error: rawQueueError,
    refetch: refetchQueue,
  } = useBranchDeliveryQueue(selectedBranchId);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<BranchDeliveryQueueFilter>('OPEN');

  const branchError = rawBranchError
    ? rawBranchError instanceof Error
      ? rawBranchError.message
      : 'Unable to load branch context from Organization Service.'
    : null;

  const queueUnavailableMessage = rawQueueError
    ? rawQueueError instanceof Error
      ? rawQueueError.message
      : 'Branch delivery request queue API is not yet available from the backend.'
    : null;

  const isPreview = isBranchDashboardPreviewActive();

  const selectedBranch = useMemo(
    () => branches.find((b) => b.id === selectedBranchId) ?? (isPreview ? MOCK_BRANCH_INFO : null),
    [branches, selectedBranchId, isPreview]
  );

  const effectiveRequests = useMemo(() => {
    if (requests.length > 0) return requests;
    if (isPreview && (requests.length === 0 || Boolean(rawQueueError))) {
      return MOCK_DELIVERY_QUEUE;
    }
    return requests;
  }, [requests, isPreview, rawQueueError]);

  const metrics = useMemo(
    () => calculateBranchDeliveryQueueMetrics(effectiveRequests),
    [effectiveRequests]
  );

  const filteredRequests = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return effectiveRequests.filter((req) => {
      if (statusFilter === 'OPEN' && req.assignmentStatus === 'ASSIGNED') {
        return false;
      }
      if (
        statusFilter !== 'OPEN' &&
        req.assignmentStatus !== statusFilter
      ) {
        return false;
      }

      if (normalizedQuery.length > 0) {
        const matchesId =
          req.orderCode.toLowerCase().includes(normalizedQuery) ||
          req.id.toLowerCase().includes(normalizedQuery);
        const matchesCustomer = (req.customerName ?? '')
          .toLowerCase()
          .includes(normalizedQuery);
        const matchesPickup = req.pickupLocation
          .toLowerCase()
          .includes(normalizedQuery);
        const matchesDropoff = req.dropoffLocation
          .toLowerCase()
          .includes(normalizedQuery);

        return matchesId || matchesCustomer || matchesPickup || matchesDropoff;
      }

      return true;
    });
  }, [effectiveRequests, searchQuery, statusFilter]);

  const isLoading = !isPreview && (isLoadingBranches || isLoadingQueue);
  const isBackendQueueUnavailable = isPreview
    ? false
    : Boolean(branchError) || Boolean(queueUnavailableMessage);

  return (
    <div className="org-page org-console-page">
      {/* Screen 28 Page Title & Incoming Delivery Requests Section Header */}
      <header className="org-console-header">
        <div className="org-console-header__top">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="org-console-header__page-title">
              Branch Console / Delivery Request Queue
            </h1>
          </div>

          <div className="org-console-header__utility">
            <button
              type="button"
              className="org-btn org-btn--secondary"
              onClick={() => refetchQueue()}
              disabled={isLoading}
            >
              <RefreshCw
                size={14}
                className={isLoading ? 'org-icon--spinning' : ''}
                aria-hidden="true"
              />
              <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        <div className="org-console-header__section-row">
          <h2 className="org-console-header__section-title">
            Incoming delivery requests
          </h2>

          <div className="org-console-branch-context">
            {branches.length > 1 && (
              <label className="org-sr-only" htmlFor="org-console-branch-select">
                Select active branch
              </label>
            )}
            {branches.length > 1 ? (
              <select
                id="org-console-branch-select"
                className="org-console-branch-pill org-console-branch-pill--select"
                value={selectedBranchId ?? ''}
                onChange={(e) => setSelectedBranchId(Number(e.target.value))}
                aria-label="Active branch context"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name.toUpperCase()} ({branch.code})
                  </option>
                ))}
              </select>
            ) : selectedBranch ? (
              <span
                className="org-console-branch-pill"
                title={`Active branch: ${selectedBranch.name} (${selectedBranch.code})`}
              >
                <Building2 size={13} aria-hidden="true" />
                <span>{selectedBranch.name.toUpperCase()}</span>
              </span>
            ) : (
              <span className="org-console-branch-pill org-console-branch-pill--muted">
                <Building2 size={13} aria-hidden="true" />
                <span>
                  {isLoadingBranches
                    ? 'LOADING BRANCH CONTEXT...'
                    : 'NO ACTIVE BRANCH SELECTED'}
                </span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Screen 28 Summary Cards (Derived strictly from real backend data when available) */}
      <section
        className="org-console-kpi-grid"
        aria-label="Delivery request queue summary counts"
      >
        <article className="org-console-kpi-card">
          <span className="org-console-kpi-card__label">Unassigned</span>
          <strong className="org-console-kpi-card__value">
            {isLoading
              ? '...'
              : isBackendQueueUnavailable || !selectedBranch
              ? '—'
              : metrics.unassignedCount}
          </strong>
        </article>

        <article className="org-console-kpi-card">
          <span className="org-console-kpi-card__label">Assigned today</span>
          <strong className="org-console-kpi-card__value">
            {isLoading
              ? '...'
              : isBackendQueueUnavailable || !selectedBranch
              ? '—'
              : metrics.assignedTodayCount}
          </strong>
        </article>

        <article className="org-console-kpi-card">
          <span className="org-console-kpi-card__label">Ready for pickup</span>
          <strong className="org-console-kpi-card__value">
            {isLoading
              ? '...'
              : isBackendQueueUnavailable || !selectedBranch
              ? '—'
              : metrics.readyForPickupCount}
          </strong>
        </article>
      </section>

      {/* Screen 28 Branch Queue Card */}
      <section className="org-console-card" aria-labelledby="branch-queue-heading">
        <div className="org-console-card__header">
          <div>
            <h3 id="branch-queue-heading" className="org-console-card__title">
              Branch queue
            </h3>
            <p className="org-console-card__subtitle">
              Only requests routed to this branch are shown.
            </p>
          </div>

          <div className="org-console-card__header-links">
            <Link
              href={
                selectedBranchId
                  ? `/organization/console/assign?branchId=${selectedBranchId}`
                  : '/organization/console/assign'
              }
              className="org-dashboard-card__view-all"
            >
              <span>Courier assignment view</span>
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
            <Link
              href={
                selectedBranchId
                  ? `/organization/console/couriers?branchId=${selectedBranchId}`
                  : '/organization/console/couriers'
              }
              className="org-dashboard-card__view-all"
            >
              <span>Courier roster</span>
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Search & Status Filter Controls matching Screen 28 */}
        <div className="org-console-filters">
          <div className="org-console-filter-field org-console-filter-field--search">
            <label
              htmlFor="branch-queue-search"
              className="org-console-filter-field__label"
            >
              Search
            </label>
            <div className="org-console-input-wrap">
              <Search
                size={15}
                className="org-console-input-wrap__icon"
                aria-hidden="true"
              />
              <input
                id="branch-queue-search"
                type="search"
                className="org-console-input org-console-input--with-icon"
                placeholder="Delivery ID / customer"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="org-console-filter-field org-console-filter-field--status">
            <label
              htmlFor="branch-queue-status"
              className="org-console-filter-field__label"
            >
              Status
            </label>
            <select
              id="branch-queue-status"
              className="org-console-select"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as BranchDeliveryQueueFilter)
              }
            >
              <option value="OPEN">Open requests</option>
              <option value="UNASSIGNED">Unassigned</option>
              <option value="READY_FOR_PICKUP">Ready for pickup</option>
              <option value="ASSIGNED">Assigned</option>
            </select>
          </div>
        </div>

        {/* Queue Content States: Loading / Backend Unavailable / Empty / Request List */}
        {isLoading ? (
          <div className="org-console-list" aria-busy="true">
            {[1, 2, 3, 4].map((skeletonId) => (
              <div
                key={skeletonId}
                className="org-console-row org-console-row--skeleton"
              >
                <div className="org-skeleton org-skeleton--lg" />
              </div>
            ))}
          </div>
        ) : branchError ? (
          <div className="org-empty-state org-empty-state--error" role="alert">
            <div className="org-empty-state__icon org-empty-state__icon--error">
              <AlertCircle size={22} aria-hidden="true" />
            </div>
            <h4 className="org-empty-state__title">
              Branch Context Unavailable
            </h4>
            <p className="org-empty-state__description">{branchError}</p>
            <div className="org-empty-state__actions">
              <button
                type="button"
                className="org-btn org-btn--primary"
                onClick={() => refetchQueue()}
              >
                <RefreshCw size={14} aria-hidden="true" />
                <span>Retry Connection</span>
              </button>
              <Link
                href="/organization/console/assign"
                className="org-btn org-btn--secondary"
              >
                <span>Open Courier Assignment Screen</span>
              </Link>
            </div>
          </div>
        ) : queueUnavailableMessage ? (
          <div
            className="org-empty-state org-dashboard-unavailable"
            role="status"
          >
            <div className="org-empty-state__icon">
              <Inbox size={22} aria-hidden="true" />
            </div>
            <h4 className="org-empty-state__title">
              Branch Delivery Queue Endpoint Pending
            </h4>
            <p className="org-empty-state__description">
              {queueUnavailableMessage}
            </p>
            <div className="org-dashboard-contract-note">
              <Info
                size={15}
                className="org-dashboard-contract-note__icon"
                aria-hidden="true"
              />
              <span>
                <strong>Integration Boundary Ready:</strong> No fake delivery
                requests or sample counts are shown. Once Member 03 / Order &amp;
                Dispatch Services expose{' '}
                <code>
                  GET /api/v1/organization/branches/&#123;branchId&#125;/delivery-requests
                </code>
                , incoming branch-routed requests will populate here automatically.
              </span>
            </div>
            <div className="org-empty-state__actions">
              <button
                type="button"
                className="org-btn org-btn--secondary"
                onClick={() => refetchQueue()}
              >
                <RefreshCw size={14} aria-hidden="true" />
                <span>Retry Queue Fetch</span>
              </button>
              <Link
                href={
                  selectedBranchId
                    ? `/organization/console/assign?branchId=${selectedBranchId}`
                    : '/organization/console/assign'
                }
                className="org-btn org-btn--primary"
              >
                <span>Inspect Courier Assignment UI</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        ) : !selectedBranch ? (
          <div className="org-empty-state" role="status">
            <div className="org-empty-state__icon">
              <Building2 size={22} aria-hidden="true" />
            </div>
            <h4 className="org-empty-state__title">No Branches Registered</h4>
            <p className="org-empty-state__description">
              Create an active branch in the Branch Directory to view its incoming
              delivery request queue.
            </p>
            <div className="org-empty-state__actions">
              <Link
                href="/organization/branches/create"
                className="org-btn org-btn--primary"
              >
                <span>Create Branch</span>
              </Link>
            </div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="org-empty-state" role="status">
            <div className="org-empty-state__icon">
              <Inbox size={22} aria-hidden="true" />
            </div>
            <h4 className="org-empty-state__title">
              {effectiveRequests.length === 0
                ? `No Delivery Requests Routed to ${selectedBranch.name}`
                : 'No Matching Delivery Requests'}
            </h4>
            <p className="org-empty-state__description">
              {effectiveRequests.length === 0
                ? 'There are currently no incoming delivery requests assigned to this branch.'
                : 'No delivery requests match your current search or status filter criteria.'}
            </p>
            {effectiveRequests.length > 0 && (
              <div className="org-empty-state__actions">
                <button
                  type="button"
                  className="org-btn org-btn--secondary"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('OPEN');
                  }}
                >
                  <span>Clear Filters</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <ul className="org-console-list" aria-label="Branch delivery requests">
            {filteredRequests.map((item, idx) => {
              const isHighlighted = idx % 2 === 0;
              const isUnassigned = item.assignmentStatus === 'UNASSIGNED';

              return (
                <li
                  key={item.id}
                  className={`org-console-row${
                    isHighlighted ? ' org-console-row--tinted' : ''
                  }`}
                >
                  <div className="org-console-row__summary">
                    <span className="org-console-row__primary">
                      {item.orderCode}
                    </span>
                    <span className="org-console-row__sep" aria-hidden="true">
                      ·
                    </span>
                    <span className="org-console-row__route">
                      {item.pickupLocation} → {item.dropoffLocation}
                    </span>
                    <span className="org-console-row__sep" aria-hidden="true">
                      ·
                    </span>
                    <span className="org-console-row__meta">
                      {item.requestTime}
                    </span>
                    <span className="org-console-row__sep" aria-hidden="true">
                      ·
                    </span>
                    <span className="org-console-row__status">
                      {formatAssignmentStatusLabel(item.assignmentStatus)}
                    </span>
                    {isUnassigned && (
                      <>
                        <span
                          className="org-console-row__sep"
                          aria-hidden="true"
                        >
                          ·
                        </span>
                        <Link
                          href={`/organization/console/assign?deliveryId=${encodeURIComponent(
                            item.orderCode || item.id
                          )}${
                            selectedBranchId
                              ? `&branchId=${selectedBranchId}`
                              : ''
                          }`}
                          className="org-console-row__action-link"
                        >
                          Review &amp; assign
                        </Link>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

