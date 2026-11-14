'use client';

import Link from 'next/link';
import { memo, useMemo, useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Info,
  MinusCircle,
  Phone,
  RefreshCw,
  Star,
  Truck,
  Users,
  X,
} from 'lucide-react';
import type {
  BranchCourierAvailability,
  BranchCourierAvailabilityFilter,
  BranchCourierOperationsMetrics,
  BranchCourierRosterItem,
} from '@/types/organization.types';

export interface BranchCourierOperationsOverviewProps {
  branchId: number | null;
  branchName: string | null;
  couriers: BranchCourierRosterItem[];
  metrics: BranchCourierOperationsMetrics;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  isPreviewMode?: boolean;
}

function getAvailabilityBadge(availability: BranchCourierAvailability) {
  switch (availability) {
    case 'AVAILABLE':
      return {
        label: 'Available',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotClass: 'bg-emerald-500',
      };
    case 'BUSY':
      return {
        label: 'Busy',
        className: 'bg-amber-50 text-amber-800 border-amber-200',
        dotClass: 'bg-amber-500',
      };
    case 'OFFLINE':
      return {
        label: 'Offline',
        className: 'bg-slate-100 text-slate-600 border-slate-200',
        dotClass: 'bg-slate-400',
      };
    default:
      return {
        label: String(availability),
        className: 'bg-slate-100 text-slate-600 border-slate-200',
        dotClass: 'bg-slate-400',
      };
  }
}

/**
 * Section C — Courier Operations Overview (Interactive Development Preview)
 * Member 04 — Branch Manager Dashboard UI
 *
 * Provides:
 * - 5 summary counters (Total, Available, Busy, Offline, Active Jobs).
 * - Availability ratio distribution bar.
 * - Interactive courier availability filters (All, Available, Busy, Offline) with live counts.
 * - Expandable Courier Details modal showing contact phone, vehicle details, active jobs, and status.
 * - Direct navigation to Courier Roster (`/organization/console/couriers`).
 */
function BranchCourierOperationsOverview({
  branchId,
  branchName,
  couriers,
  metrics,
  isLoading,
  error,
  onRetry,
  isPreviewMode = false,
}: BranchCourierOperationsOverviewProps) {
  const [filter, setFilter] = useState<BranchCourierAvailabilityFilter>('ALL');
  const [selectedCourier, setSelectedCourier] = useState<BranchCourierRosterItem | null>(null);

  const formatVal = (val: number | null): string => {
    if (isLoading) return '...';
    if (val === null || val === undefined) return '—';
    return String(val);
  };

  const total = metrics.totalCouriers ?? 0;
  const availablePct =
    total > 0 && metrics.availableCouriers !== null
      ? Math.round((metrics.availableCouriers / total) * 100)
      : 0;
  const busyPct =
    total > 0 && metrics.busyCouriers !== null
      ? Math.round((metrics.busyCouriers / total) * 100)
      : 0;
  const offlinePct =
    total > 0 && metrics.offlineCouriers !== null
      ? Math.max(0, 100 - availablePct - busyPct)
      : 0;

  // Filter couriers based on selected availability state
  const filteredCouriers = useMemo(() => {
    if (filter === 'ALL') return couriers;
    return couriers.filter((c) => c.availability === filter);
  }, [couriers, filter]);

  const previewCouriers = filteredCouriers.slice(0, 6);

  return (
    <section
      className="org-directory-card org-bm-card"
      aria-labelledby="org-bm-courier-ops-heading"
      data-testid="branch-courier-operations-overview"
    >
      <div className="org-directory-card__header">
        <div className="org-directory-card__title-group">
          <div className="org-dashboard-card__title-row">
            <h2
              id="org-bm-courier-ops-heading"
              className="org-directory-card__title"
            >
              Courier Operations Overview
            </h2>
            {isPreviewMode && (
              <span className="org-dashboard-badge org-dashboard-badge--preview">
                Demonstration Data
              </span>
            )}
            <span className="org-dashboard-badge org-dashboard-badge--contract">
              Dispatch Service Contract
            </span>
          </div>
          <p className="org-directory-card__subtitle">
            Branch courier availability and active job workload. Eligibility and
            assignment rules are evaluated by Dispatch Service.
          </p>
        </div>

        <div className="org-dashboard-card__header-actions">
          <Link
            href="/organization/console/couriers"
            className="org-dashboard-card__view-all"
            aria-label="Open Branch Courier Roster"
          >
            <span>Open Courier Roster</span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* 5 Courier Summary Counters */}
      <div
        className="org-bm-courier-stats-grid"
        aria-label="Branch courier summary counters"
      >
        <button
          type="button"
          className={`org-bm-courier-stat text-left transition-colors hover:border-blue-300 ${
            filter === 'ALL' ? 'ring-2 ring-blue-500/30 border-blue-400' : ''
          }`}
          onClick={() => setFilter('ALL')}
          title="Filter all couriers"
        >
          <div className="org-bm-courier-stat__header">
            <span className="org-bm-courier-stat__label">Total Registered</span>
            <Users size={15} className="text-blue-600" aria-hidden="true" />
          </div>
          <strong
            className="org-bm-courier-stat__value"
            data-testid="courier-metric-total"
          >
            {formatVal(metrics.totalCouriers)}
          </strong>
        </button>

        <button
          type="button"
          className={`org-bm-courier-stat org-bm-courier-stat--available text-left transition-colors hover:border-emerald-300 ${
            filter === 'AVAILABLE' ? 'ring-2 ring-emerald-500/30 border-emerald-400' : ''
          }`}
          onClick={() => setFilter('AVAILABLE')}
          title="Filter available couriers"
        >
          <div className="org-bm-courier-stat__header">
            <span className="org-bm-courier-stat__label">Available</span>
            <CheckCircle2
              size={15}
              className="text-emerald-600"
              aria-hidden="true"
            />
          </div>
          <strong
            className="org-bm-courier-stat__value text-emerald-800"
            data-testid="courier-metric-available"
          >
            {formatVal(metrics.availableCouriers)}
          </strong>
        </button>

        <button
          type="button"
          className={`org-bm-courier-stat org-bm-courier-stat--busy text-left transition-colors hover:border-amber-300 ${
            filter === 'BUSY' ? 'ring-2 ring-amber-500/30 border-amber-400' : ''
          }`}
          onClick={() => setFilter('BUSY')}
          title="Filter busy couriers"
        >
          <div className="org-bm-courier-stat__header">
            <span className="org-bm-courier-stat__label">Busy</span>
            <Clock size={15} className="text-amber-600" aria-hidden="true" />
          </div>
          <strong
            className="org-bm-courier-stat__value text-amber-900"
            data-testid="courier-metric-busy"
          >
            {formatVal(metrics.busyCouriers)}
          </strong>
        </button>

        <button
          type="button"
          className={`org-bm-courier-stat org-bm-courier-stat--offline text-left transition-colors hover:border-slate-300 ${
            filter === 'OFFLINE' ? 'ring-2 ring-slate-500/30 border-slate-400' : ''
          }`}
          onClick={() => setFilter('OFFLINE')}
          title="Filter offline couriers"
        >
          <div className="org-bm-courier-stat__header">
            <span className="org-bm-courier-stat__label">Offline</span>
            <MinusCircle
              size={15}
              className="text-slate-500"
              aria-hidden="true"
            />
          </div>
          <strong
            className="org-bm-courier-stat__value text-slate-700"
            data-testid="courier-metric-offline"
          >
            {formatVal(metrics.offlineCouriers)}
          </strong>
        </button>

        <div className="org-bm-courier-stat">
          <div className="org-bm-courier-stat__header">
            <span className="org-bm-courier-stat__label">Active Jobs</span>
            <Briefcase
              size={15}
              className="text-indigo-600"
              aria-hidden="true"
            />
          </div>
          <strong
            className="org-bm-courier-stat__value text-indigo-900"
            data-testid="courier-metric-active-jobs"
          >
            {formatVal(metrics.totalActiveJobs)}
          </strong>
        </div>
      </div>

      {/* Availability Ratio Bar */}
      {!isLoading && !error && total > 0 && (
        <div
          className="org-bm-availability-bar-box"
          aria-label="Courier availability breakdown"
        >
          <div className="org-bm-availability-bar-box__labels">
            <span>
              Availability Distribution ({availablePct}% Available · {busyPct}%
              Busy · {offlinePct}% Offline)
            </span>
            <span>{total} Registered Couriers</span>
          </div>
          <div className="org-bm-availability-bar">
            {availablePct > 0 && (
              <div
                className="org-bm-availability-bar__segment org-bm-availability-bar__segment--available"
                style={{ width: `${availablePct}%` }}
                title={`Available: ${metrics.availableCouriers}`}
              />
            )}
            {busyPct > 0 && (
              <div
                className="org-bm-availability-bar__segment org-bm-availability-bar__segment--busy"
                style={{ width: `${busyPct}%` }}
                title={`Busy: ${metrics.busyCouriers}`}
              />
            )}
            {offlinePct > 0 && (
              <div
                className="org-bm-availability-bar__segment org-bm-availability-bar__segment--offline"
                style={{ width: `${offlinePct}%` }}
                title={`Offline: ${metrics.offlineCouriers}`}
              />
            )}
          </div>
        </div>
      )}

      {/* Content Area */}
      {isLoading ? (
        <div className="org-state-box" role="status" aria-live="polite">
          <div className="org-spinner" aria-hidden="true" />
          <p className="org-state-box__title">
            Loading branch courier operations...
          </p>
          <p className="org-state-box__desc">
            Querying{' '}
            <code className="org-inline-code">
              GET /api/v1/organization/branches/{branchId ?? '{branchId}'}/couriers
            </code>
          </p>
        </div>
      ) : error ? (
        <div className="org-state-box org-dashboard-unavailable" role="status">
          <div className="org-state-box__icon" aria-hidden="true">
            <Truck size={22} />
          </div>
          <h3 className="org-state-box__title">
            Branch Courier Roster Endpoint Pending
          </h3>
          <p className="org-state-box__desc">{error}</p>
          <div className="org-dashboard-contract-note">
            <Info
              size={15}
              className="org-dashboard-contract-note__icon"
              aria-hidden="true"
            />
            <span>
              <strong>Service Ownership Boundary:</strong> Dispatch Service owns
              courier operational profiles, availability, and active job counts.
              No fake couriers are fabricated on the frontend. Once{' '}
              <code className="org-inline-code">
                GET /api/v1/organization/branches/&#123;branchId&#125;/couriers
              </code>{' '}
              is connected, live courier availability and workload will render
              here.
            </span>
          </div>
          <div className="org-state-box__actions">
            <button
              type="button"
              className="org-btn org-btn--secondary"
              onClick={onRetry}
            >
              <RefreshCw size={14} aria-hidden="true" />
              <span>Retry Courier Sync</span>
            </button>
            <Link
              href="/organization/console/couriers"
              className="org-btn org-btn--primary"
            >
              <span>Open Courier Roster</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : couriers.length === 0 ? (
        <div className="org-state-box" role="status">
          <div className="org-state-box__icon" aria-hidden="true">
            <Truck size={22} />
          </div>
          <h3 className="org-state-box__title">
            No Registered Couriers for {branchName || 'This Branch'}
          </h3>
          <p className="org-state-box__desc">
            Zero courier profiles are currently registered under this branch in
            the backend. Open the Courier Roster to inspect availability filters
            or courier onboarding status.
          </p>
          <div className="org-state-box__actions">
            <Link
              href="/organization/console/couriers"
              className="org-btn org-btn--primary"
            >
              <span>Open Courier Roster</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="org-bm-workload-list-wrap">
          <div className="org-bm-workload-list-wrap__header">
            <div className="flex items-center gap-2">
              <h3 className="org-bm-workload-list-wrap__title">
                Branch Courier Workload Snapshot
              </h3>
              {filter !== 'ALL' && (
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Filter: {filter}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="org-bm-workload-list-wrap__hint">
                Showing {previewCouriers.length} of {filteredCouriers.length} couriers
              </span>
              {filter !== 'ALL' && (
                <button
                  type="button"
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                  onClick={() => setFilter('ALL')}
                >
                  Show all
                </button>
              )}
            </div>
          </div>

          <ul
            className="org-console-list"
            aria-label="Branch courier workload overview"
          >
            {previewCouriers.map((courier, idx) => {
              const badge = getAvailabilityBadge(courier.availability);
              const isTinted = idx % 2 === 0;
              return (
                <li
                  key={courier.id}
                  className={`org-console-row hover:bg-slate-50 cursor-pointer transition-colors${
                    isTinted ? ' org-console-row--tinted' : ''
                  }`}
                  onClick={() => setSelectedCourier(courier)}
                  title="Click to view courier details"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                    <div className="flex items-center flex-wrap gap-2">
                      <strong className="text-sm font-bold text-slate-900">
                        {courier.name}
                      </strong>
                      <span className="org-console-row__sep" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-xs font-medium text-slate-600">
                        {courier.vehicleType}
                      </span>
                      {courier.phone && (
                        <>
                          <span
                            className="org-console-row__sep"
                            aria-hidden="true"
                          >
                            ·
                          </span>
                          <span className="text-xs font-mono text-slate-500">
                            {courier.phone}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {courier.activeJobs}{' '}
                        {courier.activeJobs === 1 ? 'active job' : 'active jobs'}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${badge.dotClass}`}
                          aria-hidden="true"
                        />
                        <span>{badge.label}</span>
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Courier Details Modal */}
      {selectedCourier && (
        <div
          className="org-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="courier-modal-title"
          onClick={() => setSelectedCourier(null)}
        >
          <div
            className="org-modal-box max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="org-modal-header">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-blue-600" aria-hidden="true" />
                <h3 id="courier-modal-title" className="text-base font-bold text-slate-900">
                  Courier Profile · {selectedCourier.name}
                </h3>
              </div>
              <button
                type="button"
                className="org-modal-close"
                onClick={() => setSelectedCourier(null)}
                aria-label="Close courier details modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="org-modal-body space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase">Operational Status</span>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        getAvailabilityBadge(selectedCourier.availability).className
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          getAvailabilityBadge(selectedCourier.availability).dotClass
                        }`}
                        aria-hidden="true"
                      />
                      <span>{getAvailabilityBadge(selectedCourier.availability).label}</span>
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Active Dispatches</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {selectedCourier.activeJobs} {selectedCourier.activeJobs === 1 ? 'job' : 'jobs'}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Vehicle:</span>
                    <strong className="text-slate-800">{selectedCourier.vehicleType}</strong>
                  </div>
                  {selectedCourier.phone && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Contact Phone:</span>
                      <strong className="text-slate-800 font-mono">{selectedCourier.phone}</strong>
                    </div>
                  )}
                  {selectedCourier.distanceKm !== undefined && selectedCourier.distanceKm !== null && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Estimated Proximity:</span>
                      <strong className="text-slate-800">{selectedCourier.distanceKm} km from hub</strong>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100 text-slate-700">
                  <span className="font-bold text-emerald-900 block mb-0.5">Assigned Hub</span>
                  <p>{branchName || 'Colombo Central Branch (CMB-001)'}</p>
                </div>
              </div>
            </div>

            <div className="org-modal-footer flex items-center justify-between gap-3">
              <button
                type="button"
                className="org-btn org-btn--secondary"
                onClick={() => setSelectedCourier(null)}
              >
                <span>Close</span>
              </button>

              <Link
                href="/organization/console/couriers"
                className="org-btn org-btn--primary"
                onClick={() => setSelectedCourier(null)}
              >
                <span>View Full Roster</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default memo(BranchCourierOperationsOverview);
