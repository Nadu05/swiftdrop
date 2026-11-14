'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Info,
  Plus,
  RefreshCw,
  Search,
  Truck,
  X,
} from 'lucide-react';
import { useBranches, useBranchCourierRoster } from '@/hooks/api/use-organization';
import { useBranchConsoleStore } from '@/store/branch-console.store';
import {
  isBranchDashboardPreviewActive,
  MOCK_BRANCH_INFO,
  MOCK_COURIER_ROSTER,
} from '@/api/mock/branch-dashboard.mock';
import type {
  BranchCourierAvailability,
  BranchCourierAvailabilityFilter,
  BranchCourierRosterItem,
  BranchResponse,
} from '@/types/organization.types';

function formatAvailabilityLabel(
  availability: BranchCourierAvailability
): string {
  switch (availability) {
    case 'AVAILABLE':
      return 'Available';
    case 'BUSY':
      return 'Busy';
    case 'OFFLINE':
      return 'Offline';
    default:
      return availability;
  }
}

/**
 * Screen 30 — Branch Console / Courier Roster
 * Member 04 — Branch Console UI Implementation
 *
 * Strictly adheres to team boundaries:
 * - Never fabricates sample courier roster items (such as Kasun Perera, Nimal Silva, Tharindu Jay, or Ruwan Fernando).
 * - Never simulates a fake courier invitation when "+ Invite courier" is clicked.
 */
export default function CourierRosterView() {
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
    data: couriers = [],
    isLoading: isLoadingRoster,
    error: rawRosterError,
    refetch: refetchRoster,
  } = useBranchCourierRoster(selectedBranchId);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [availabilityFilter, setAvailabilityFilter] =
    useState<BranchCourierAvailabilityFilter>('ALL');

  const [inviteNotice, setInviteNotice] = useState<string | null>(null);

  const branchError = rawBranchError
    ? rawBranchError instanceof Error
      ? rawBranchError.message
      : 'Unable to load branch context from Organization Service.'
    : null;

  const rosterUnavailableMessage = rawRosterError
    ? rawRosterError instanceof Error
      ? rawRosterError.message
      : 'Branch courier roster endpoint is not yet available from the backend.'
    : null;

  const isPreview = isBranchDashboardPreviewActive();

  const selectedBranch = useMemo(
    () => branches.find((b) => b.id === selectedBranchId) ?? (isPreview ? MOCK_BRANCH_INFO : null),
    [branches, selectedBranchId, isPreview]
  );

  const effectiveCouriers = useMemo(() => {
    if (couriers.length > 0) return couriers;
    if (isPreview && (couriers.length === 0 || Boolean(rawRosterError))) {
      return MOCK_COURIER_ROSTER;
    }
    return couriers;
  }, [couriers, isPreview, rawRosterError]);

  const filteredCouriers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return effectiveCouriers.filter((courier) => {
      if (
        availabilityFilter !== 'ALL' &&
        courier.availability !== availabilityFilter
      ) {
        return false;
      }

      if (normalizedQuery.length > 0) {
        const matchesName = courier.name.toLowerCase().includes(normalizedQuery);
        const matchesPhone = (courier.phone ?? '')
          .toLowerCase()
          .includes(normalizedQuery);
        return matchesName || matchesPhone;
      }

      return true;
    });
  }, [effectiveCouriers, searchQuery, availabilityFilter]);

  const isLoading = !isPreview && (isLoadingBranches || isLoadingRoster);
  const isBackendRosterUnavailable = isPreview
    ? false
    : Boolean(branchError) || Boolean(rosterUnavailableMessage);

  const handleInviteCourierClick = () => {
    // TODO (Backend Integration — Member 03 / Courier Onboarding Service):
    // Connect to the branch courier invitation endpoint once exposed by the backend.
    setInviteNotice(
      'Courier invitation backend API is not yet exposed by the backend owner. No speculative invitation request was sent.'
    );
  };

  return (
    <div className="org-page org-console-page">
      {/* Dismissible Courier Invitation Boundary Notice */}
      {inviteNotice && (
        <div className="org-phase-notice" role="status" aria-live="polite">
          <div className="org-phase-notice__left">
            <Info size={16} className="org-phase-notice__icon" aria-hidden="true" />
            <span>{inviteNotice}</span>
          </div>
          <button
            type="button"
            className="org-phase-notice__close"
            onClick={() => setInviteNotice(null)}
            aria-label="Dismiss notification"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Screen 30 Page Title & Section Header Row */}
      <header className="org-console-header">
        <div className="org-console-header__top">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="org-console-header__page-title">
              Branch Console / Courier Roster
            </h1>
          </div>

          <div className="org-console-header__utility">
            {branches.length > 1 && (
              <select
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
            )}
            <button
              type="button"
              className="org-btn org-btn--secondary"
              onClick={() => refetchRoster()}
              disabled={isLoading}
            >
              <RefreshCw
                size={14}
                className={isLoading ? 'org-icon--spinning' : ''}
                aria-hidden="true"
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="org-console-header__section-row">
          <h2 className="org-console-header__section-title">Courier roster</h2>

          <button
            type="button"
            className="org-btn org-btn--primary org-btn--add-branch"
            onClick={handleInviteCourierClick}
          >
            <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
            <span>Invite courier</span>
          </button>
        </div>
      </header>

      {/* Screen 30 Branch Couriers Card */}
      <section
        className="org-console-card"
        aria-labelledby="branch-couriers-heading"
      >
        <div className="org-console-card__header">
          <div>
            <h3 id="branch-couriers-heading" className="org-console-card__title">
              Branch couriers
            </h3>
            <p className="org-console-card__subtitle">
              Availability and workload determine assignment eligibility.
            </p>
          </div>

          {selectedBranch && (
            <span className="org-console-branch-pill">
              <Building2 size={13} aria-hidden="true" />
              <span>{selectedBranch.name.toUpperCase()}</span>
            </span>
          )}
        </div>

        {/* Search & Availability Filter Controls matching Screen 30 */}
        <div className="org-console-filters">
          <div className="org-console-filter-field org-console-filter-field--search">
            <label
              htmlFor="courier-roster-search"
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
                id="courier-roster-search"
                type="search"
                className="org-console-input org-console-input--with-icon"
                placeholder="Courier name or phone"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="org-console-filter-field org-console-filter-field--status">
            <label
              htmlFor="courier-roster-availability"
              className="org-console-filter-field__label"
            >
              Availability
            </label>
            <select
              id="courier-roster-availability"
              className="org-console-select"
              value={availabilityFilter}
              onChange={(e) =>
                setAvailabilityFilter(
                  e.target.value as BranchCourierAvailabilityFilter
                )
              }
            >
              <option value="ALL">All</option>
              <option value="AVAILABLE">Available</option>
              <option value="BUSY">Busy</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </div>
        </div>

        {/* Roster Content States: Loading / Error / Unavailable / Empty / Courier List */}
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
                onClick={() => refetchRoster()}
              >
                <RefreshCw size={14} aria-hidden="true" />
                <span>Retry Connection</span>
              </button>
            </div>
          </div>
        ) : rosterUnavailableMessage ? (
          <div
            className="org-empty-state org-dashboard-unavailable"
            role="status"
          >
            <div className="org-empty-state__icon">
              <Truck size={22} aria-hidden="true" />
            </div>
            <h4 className="org-empty-state__title">
              Branch Courier Roster Endpoint Pending
            </h4>
            <p className="org-empty-state__description">
              {rosterUnavailableMessage}
            </p>
            <div className="org-dashboard-contract-note">
              <Info
                size={15}
                className="org-dashboard-contract-note__icon"
                aria-hidden="true"
              />
              <span>
                <strong>Integration Boundary Ready:</strong> No sample courier
                records are fabricated on the frontend. Once the backend exposes{' '}
                <code>
                  GET /api/v1/organization/branches/&#123;branchId&#125;/couriers
                </code>
                , branch-assigned couriers will display here with live
                availability and active job counts.
              </span>
            </div>
            <div className="org-empty-state__actions">
              <button
                type="button"
                className="org-btn org-btn--secondary"
                onClick={() => refetchRoster()}
              >
                <RefreshCw size={14} aria-hidden="true" />
                <span>Retry Roster Fetch</span>
              </button>
              <Link
                href={
                  selectedBranchId
                    ? `/organization/console/requests?branchId=${selectedBranchId}`
                    : '/organization/console/requests'
                }
                className="org-btn org-btn--primary"
              >
                <span>Back to Delivery Request Queue</span>
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
              Register an active branch in the Branch Directory to manage its
              courier roster.
            </p>
          </div>
        ) : filteredCouriers.length === 0 ? (
          <div className="org-empty-state" role="status">
            <div className="org-empty-state__icon">
              <Truck size={22} aria-hidden="true" />
            </div>
            <h4 className="org-empty-state__title">
              {effectiveCouriers.length === 0
                ? `No Couriers Registered for ${selectedBranch.name}`
                : 'No Matching Couriers'}
            </h4>
            <p className="org-empty-state__description">
              {effectiveCouriers.length === 0
                ? 'No couriers are currently assigned to this branch in the backend.'
                : 'No couriers match your search query or availability filter.'}
            </p>
            {effectiveCouriers.length > 0 && (
              <div className="org-empty-state__actions">
                <button
                  type="button"
                  className="org-btn org-btn--secondary"
                  onClick={() => {
                    setSearchQuery('');
                    setAvailabilityFilter('ALL');
                  }}
                >
                  <span>Clear Filters</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <ul className="org-console-list" aria-label="Branch courier roster">
            {filteredCouriers.map((courier, idx) => {
              const isHighlighted = idx % 2 === 0;

              return (
                <li
                  key={courier.id}
                  className={`org-console-row${
                    isHighlighted ? ' org-console-row--tinted' : ''
                  }`}
                >
                  <div
                    className={`org-console-row__summary${
                      idx === 0 ? ' org-console-row__summary--strong' : ''
                    }`}
                  >
                    <span>{courier.name}</span>
                    <span className="org-console-row__sep" aria-hidden="true">
                      ·
                    </span>
                    <span>{courier.vehicleType}</span>
                    <span className="org-console-row__sep" aria-hidden="true">
                      ·
                    </span>
                    <span>
                      {courier.activeJobs}{' '}
                      {courier.activeJobs === 1 ? 'active job' : 'active jobs'}
                    </span>
                    {courier.distanceKm !== undefined &&
                      courier.distanceKm !== null && (
                        <>
                          <span
                            className="org-console-row__sep"
                            aria-hidden="true"
                          >
                            ·
                          </span>
                          <span>{courier.distanceKm.toFixed(1)} km away</span>
                        </>
                      )}
                    <span className="org-console-row__sep" aria-hidden="true">
                      ·
                    </span>
                    <span>{formatAvailabilityLabel(courier.availability)}</span>
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

