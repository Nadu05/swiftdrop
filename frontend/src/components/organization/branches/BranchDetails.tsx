'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Building2,
  Calendar,
  Compass,
  Headphones,
  Info,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Power,
  Radar,
  RefreshCw,
  ShoppingBag,
  Store,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  calculateBranchPerformanceMetrics,
  resolveBranchDistrict,
} from '@/api/services/organization.api';
import {
  useBranchDispatchers,
  useBranchUsers,
} from '@/hooks/api/use-organization';
import InteractiveBranchMap from '@/components/organization/map/InteractiveBranchMap';
import type {
  BranchPerformanceSummaryResponse,
  BranchResponse,
  ServiceAreaResponse,
} from '@/types/organization.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface BranchDetailsProps {
  branch: BranchResponse;
  onRequestStatusToggle: (branch: BranchResponse) => void;
  serviceAreas?: ServiceAreaResponse[];
  isLoadingServiceAreas?: boolean;
  serviceAreasError?: string | null;
  onRetryServiceAreas?: () => void;
  performanceSummary?: BranchPerformanceSummaryResponse | null;
  isLoadingPerformance?: boolean;
  performanceError?: string | null;
  onRetryPerformance?: () => void;
}

function formatDateTime(isoString: string | undefined | null): string {
  if (!isoString) return 'Not available';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Displays the complete backend `BranchResponse` DTO, interactive geographic map with
 * circular service-area radius coverage (`ServiceAreaResponse[]`), and branch analytics.
 * Member 04 — Organization Admin UI
 */
export default function BranchDetails({
  branch,
  onRequestStatusToggle,
  serviceAreas = [],
  isLoadingServiceAreas = false,
  serviceAreasError = null,
  onRetryServiceAreas,
  performanceSummary = null,
  isLoadingPerformance = false,
  performanceError = null,
  onRetryPerformance,
}: BranchDetailsProps) {
  const isActive = branch.status === 'ACTIVE';
  const [selectedServiceAreaId, setSelectedServiceAreaId] = useState<number | null>(null);

  const primaryServiceArea = useMemo(
    () => serviceAreas[0] ?? null,
    [serviceAreas]
  );

  const computedPerformance = useMemo(
    () => calculateBranchPerformanceMetrics(performanceSummary),
    [performanceSummary]
  );

  const { data: dispatchers = [], isLoading: isLoadingDispatchers } =
    useBranchDispatchers(branch.id);
  const { data: users = [], isLoading: isLoadingUsers } =
    useBranchUsers(branch.id);

  return (
    <div className="org-details">
      {/* 1. Hero Summary Banner Card */}
      <section className="org-details-hero" aria-label="Branch overview summary">
        <div className="org-details-hero__left">
          <div className="org-details-hero__avatar" aria-hidden="true">
            <Building2 size={24} strokeWidth={2.1} />
          </div>

          <div className="org-details-hero__identity">
            <div className="org-details-hero__title-row">
              <h2 className="org-details-hero__name">{branch.name}</h2>
              <span className="org-branch-code">{branch.code}</span>
              <Badge
                variant={isActive ? 'default' : 'secondary'}
                className={
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }
              >
                <span
                  className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                    isActive ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div className="org-details-hero__meta">
              <span className="org-details-hero__meta-item">
                <strong>Branch ID:</strong> #{branch.id}
              </span>
              <span className="org-details-hero__meta-sep" aria-hidden="true">
                ·
              </span>
              <span className="org-details-hero__meta-item">
                <MapPin size={13} aria-hidden="true" />
                <span>{branch.city}</span>
              </span>
              <span className="org-details-hero__meta-sep" aria-hidden="true">
                ·
              </span>
              <span className="org-details-hero__meta-item org-details-hero__meta-item--mono">
                {branch.latitude.toFixed(4)}, {branch.longitude.toFixed(4)}
              </span>
              {!isLoadingServiceAreas && !serviceAreasError && (
                <>
                  <span className="org-details-hero__meta-sep" aria-hidden="true">
                    ·
                  </span>
                  <span className="org-details-hero__meta-item">
                    <Radar size={13} aria-hidden="true" />
                    <span>
                      {!primaryServiceArea
                        ? 'No service area configured'
                        : `${primaryServiceArea.maxRadiusKm} km coverage radius`}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
            <Link href={`/organization/branches/${branch.id}/edit`}>
              <Pencil size={14} aria-hidden="true" />
              <span>Edit Branch</span>
            </Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRequestStatusToggle(branch)}
            className={
              isActive
                ? 'border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950/40 gap-1.5'
                : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:hover:bg-emerald-950/40 gap-1.5'
            }
          >
            <Power size={14} aria-hidden="true" />
            <span>{isActive ? 'Deactivate Branch' : 'Activate Branch'}</span>
          </Button>
        </div>
      </section>

      {/* 2. Detail Cards Grid */}
      <div className="org-details-grid">
        {/* Card A: Branch Identity & Operational Status */}
        <section
          className="org-details-card"
          aria-labelledby="org-details-identity-heading"
        >
          <div className="org-details-card__header">
            <div className="org-details-card__icon" aria-hidden="true">
              <Building2 size={18} strokeWidth={2.1} />
            </div>
            <div>
              <h3 id="org-details-identity-heading" className="org-details-card__title">
                Branch Identity &amp; Status
              </h3>
              <p className="org-details-card__subtitle">
                Core identifier and operational state in Organization Service
              </p>
            </div>
          </div>

          <dl className="org-details-list">
            <div className="org-details-list__item">
              <dt className="org-details-list__term">Branch Name</dt>
              <dd className="org-details-list__desc org-details-list__desc--strong">
                {branch.name}
              </dd>
            </div>

            <div className="org-details-list__item">
              <dt className="org-details-list__term">Branch Code</dt>
              <dd className="org-details-list__desc">
                <span className="org-branch-code">{branch.code}</span>
              </dd>
            </div>

            <div className="org-details-list__item">
              <dt className="org-details-list__term">Database ID</dt>
              <dd className="org-details-list__desc org-details-list__desc--mono">
                #{branch.id}
              </dd>
            </div>

            <div className="org-details-list__item">
              <dt className="org-details-list__term">Operational Status</dt>
              <dd className="org-details-list__desc">
                <span
                  className={`org-status-badge ${
                    isActive
                      ? 'org-status-badge--active'
                      : 'org-status-badge--inactive'
                  }`}
                >
                  <span className="org-status-badge__dot" aria-hidden="true" />
                  <span>{isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                </span>
              </dd>
            </div>
          </dl>
        </section>

        {/* Card B: Contact Information & Audit Timestamps */}
        <section
          className="org-details-card"
          aria-labelledby="org-details-contact-heading"
        >
          <div className="org-details-card__header">
            <div className="org-details-card__icon" aria-hidden="true">
              <Phone size={18} strokeWidth={2.1} />
            </div>
            <div>
              <h3 id="org-details-contact-heading" className="org-details-card__title">
                Contact &amp; Record Timestamps
              </h3>
              <p className="org-details-card__subtitle">
                Primary communication channels and audit history
              </p>
            </div>
          </div>

          <dl className="org-details-list">
            <div className="org-details-list__item">
              <dt className="org-details-list__term">Phone Number</dt>
              <dd className="org-details-list__desc">
                <a
                  href={`tel:${branch.phone}`}
                  className="org-branch-contact__item org-branch-contact__link"
                >
                  <Phone size={13} aria-hidden="true" />
                  <span className="org-branch-contact__phone">{branch.phone}</span>
                </a>
              </dd>
            </div>

            <div className="org-details-list__item">
              <dt className="org-details-list__term">Email Address</dt>
              <dd className="org-details-list__desc">
                {branch.email ? (
                  <a
                    href={`mailto:${branch.email}`}
                    className="org-branch-contact__item org-branch-contact__email"
                  >
                    <Mail size={13} aria-hidden="true" />
                    <span>{branch.email}</span>
                  </a>
                ) : (
                  <span className="org-branch-contact__muted">No email on file</span>
                )}
              </dd>
            </div>

            <div className="org-details-list__item">
              <dt className="org-details-list__term">Created At</dt>
              <dd className="org-details-list__desc org-details-list__desc--with-icon">
                <Calendar size={13} aria-hidden="true" />
                <span>{formatDateTime(branch.createdAt)}</span>
              </dd>
            </div>

            <div className="org-details-list__item">
              <dt className="org-details-list__term">Last Updated</dt>
              <dd className="org-details-list__desc org-details-list__desc--with-icon">
                <Calendar size={13} aria-hidden="true" />
                <span>{formatDateTime(branch.updatedAt)}</span>
              </dd>
            </div>
          </dl>
        </section>

        {/* Card C: Physical Address & Geographic Coordinates (Full Width) */}
        <section
          className="org-details-card org-details-card--full"
          aria-labelledby="org-details-location-heading"
        >
          <div className="org-details-card__header">
            <div className="org-details-card__icon" aria-hidden="true">
              <Compass size={18} strokeWidth={2.1} />
            </div>
            <div>
              <h3 id="org-details-location-heading" className="org-details-card__title">
                Physical Address &amp; Geographic Coordinates
              </h3>
              <p className="org-details-card__subtitle">
                Street address, city, and decimal GPS coordinates registered for this hub
              </p>
            </div>
          </div>

          <dl className="org-details-list org-details-list--grid-3">
            <div className="org-details-list__item">
              <dt className="org-details-list__term">Address Line 1</dt>
              <dd className="org-details-list__desc org-details-list__desc--strong">
                {branch.addressLine1}
              </dd>
            </div>

            <div className="org-details-list__item">
              <dt className="org-details-list__term">Address Line 2</dt>
              <dd className="org-details-list__desc">
                {branch.addressLine2 ? (
                  branch.addressLine2
                ) : (
                  <span className="org-branch-contact__muted">Not specified</span>
                )}
              </dd>
            </div>

            <div className="org-details-list__item">
              <dt className="org-details-list__term">City / Town</dt>
              <dd className="org-details-list__desc">
                <span className="org-branch-city">
                  <MapPin size={13} className="org-branch-city__icon" aria-hidden="true" />
                  <span>{branch.city}</span>
                </span>
              </dd>
            </div>

            <div className="org-details-list__item">
              <dt className="org-details-list__term">District</dt>
              <dd className="org-details-list__desc org-details-list__desc--strong">
                {resolveBranchDistrict(branch)} District
              </dd>
            </div>

            <div className="org-details-list__item">
              <dt className="org-details-list__term">Latitude</dt>
              <dd className="org-details-list__desc org-details-list__desc--mono">
                {branch.latitude}
              </dd>
            </div>

            <div className="org-details-list__item">
              <dt className="org-details-list__term">Longitude</dt>
              <dd className="org-details-list__desc org-details-list__desc--mono">
                {branch.longitude}
              </dd>
            </div>
          </dl>
        </section>

        {/* Card D: Interactive Map & Circular Service-Area Coverage Visualization (Full Width) */}
        <section
          className="org-details-card org-details-card--full"
          aria-labelledby="org-details-service-area-heading"
          data-testid="branch-service-area-section"
        >
          <div className="org-details-card__header">
            <div className="org-details-card__icon" aria-hidden="true">
              <Radar size={18} strokeWidth={2.1} />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="org-details-service-area-heading" className="org-details-card__title">
                  Geographic Map &amp; Circular Service-Area Coverage
                </h3>
                {!isLoadingServiceAreas && !serviceAreasError && (
                  <span className="org-radius-pill">
                    <Radar size={12} aria-hidden="true" />
                    <span>
                      {!primaryServiceArea
                        ? 'No Service Area'
                        : `${primaryServiceArea.maxRadiusKm} km Radius`}
                    </span>
                  </span>
                )}
              </div>
              <p className="org-details-card__subtitle">
                Visualizes the branch hub marker and circular delivery radius zones (
                <code>maxRadiusKm</code> around <code>centerLatitude, centerLongitude</code>) from{' '}
                <code>GET /api/v1/organization/service-areas/branch/{branch.id}</code>.
              </p>
            </div>
          </div>

          <div className="org-service-area-visualizer">
            {/* Interactive Map showing Branch Marker + Circular Service-Area Overlays */}
            <InteractiveBranchMap
              latitude={branch.latitude}
              longitude={branch.longitude}
              branchLabel={branch.name}
              branchCode={branch.code}
              interactive={false}
              serviceAreas={serviceAreas}
              selectedServiceAreaId={selectedServiceAreaId}
              onSelectServiceArea={(area) =>
                setSelectedServiceAreaId((prev) => (prev === area.id ? null : area.id))
              }
              heightPx={390}
            />

            {/* Service-Area Records Panel */}
            <div className="org-service-area-panel">
              {isLoadingServiceAreas ? (
                <div className="org-state-box" role="status" aria-live="polite">
                  <span className="org-spinner" aria-hidden="true" />
                  <p className="org-state-box__title">Loading service areas...</p>
                  <p className="org-state-box__desc">
                    Querying <code>GET /api/v1/organization/service-areas/branch/{branch.id}</code>.
                  </p>
                </div>
              ) : serviceAreasError ? (
                <div
                  className="org-state-box org-state-box--error"
                  role="alert"
                  data-testid="service-area-error-state"
                >
                  <div
                    className="org-state-box__icon org-state-box__icon--error"
                    aria-hidden="true"
                  >
                    <AlertCircle size={20} />
                  </div>
                  <p className="org-state-box__title">Service-Area Data Unavailable</p>
                  <p className="org-state-box__desc">{serviceAreasError}</p>
                  {onRetryServiceAreas && (
                    <div className="org-state-box__actions">
                      <button
                        type="button"
                        className="org-btn org-btn--secondary org-btn--sm"
                        onClick={onRetryServiceAreas}
                      >
                        <RefreshCw size={13} aria-hidden="true" />
                        <span>Retry Service Areas</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : serviceAreas.length === 0 ? (
                <div
                  className="org-state-box"
                  role="status"
                  data-testid="no-service-area-configured"
                >
                  <div className="org-state-box__icon" aria-hidden="true">
                    <Radar size={20} />
                  </div>
                  <h4 className="org-state-box__title">No service area configured</h4>
                  <p className="org-state-box__desc">
                    This branch does not have any circular service-area radius records configured
                    in the Organization Service yet. No default radius is assumed.
                  </p>
                </div>
              ) : (
                <div className="org-table-wrapper">
                  <table
                    className="org-table"
                    aria-label={`Configured service areas for ${branch.name}`}
                  >
                    <thead>
                      <tr>
                        <th scope="col">Zone Name</th>
                        <th scope="col">Coverage Radius</th>
                        <th scope="col">Center Coordinates</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviceAreas.map((area) => {
                        const isZoneActive = area.status === 'ACTIVE';
                        const isSelected = selectedServiceAreaId === area.id;

                        return (
                          <tr
                            key={area.id}
                            className={`org-table__row cursor-pointer ${
                              isSelected ? 'org-table__row--selected' : ''
                            }`}
                            onClick={() =>
                              setSelectedServiceAreaId((prev) =>
                                prev === area.id ? null : area.id
                              )
                            }
                            data-testid={`service-area-row-${area.id}`}
                          >
                            <td data-label="Zone Name">
                              <div className="org-branch-name-cell">
                                <span className="org-branch-name">{area.areaName}</span>
                                <span className="org-branch-coords">Zone ID #{area.id}</span>
                              </div>
                            </td>
                            <td data-label="Coverage Radius">
                              <span className="org-radius-pill">
                                <Radar size={12} aria-hidden="true" />
                                <span>{area.maxRadiusKm} km radius</span>
                              </span>
                            </td>
                            <td data-label="Center Coordinates">
                              <span className="org-coords-mono">
                                {area.centerLatitude.toFixed(4)}, {area.centerLongitude.toFixed(4)}
                              </span>
                            </td>
                            <td data-label="Status">
                              <span
                                className={`org-status-badge ${
                                  isZoneActive
                                    ? 'org-status-badge--active'
                                    : 'org-status-badge--inactive'
                                }`}
                              >
                                <span className="org-status-badge__dot" aria-hidden="true" />
                                <span>{area.status}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Card E: Branch Analytics & Performance Overview (Full Width) */}
        <section
          className="org-details-card org-details-card--full"
          aria-labelledby="org-details-analytics-heading"
          data-testid="branch-analytics-section"
        >
          <div className="org-details-card__header">
            <div className="org-details-card__icon" aria-hidden="true">
              <BarChart3 size={18} strokeWidth={2.1} />
            </div>
            <div className="flex-1">
              <h3 id="org-details-analytics-heading" className="org-details-card__title">
                Branch Operational Analytics
              </h3>
              <p className="org-details-card__subtitle">
                Delivery volume, completion rate, and dispatch throughput reported by{' '}
                <code>GET /api/v1/organization/branches/{branch.id}/performance-summary</code>.
              </p>
            </div>
          </div>

          {isLoadingPerformance ? (
            <div className="org-state-box" role="status" aria-live="polite">
              <span className="org-spinner" aria-hidden="true" />
              <p className="org-state-box__title">Loading branch analytics...</p>
            </div>
          ) : performanceSummary && computedPerformance ? (
            <div className="org-summary-grid">
              <article className="org-summary-card">
                <div className="org-summary-card__top">
                  <span className="org-summary-card__label">Deliveries Received</span>
                  <div
                    className="org-summary-card__icon org-summary-card__icon--blue"
                    aria-hidden="true"
                  >
                    <Activity size={17} />
                  </div>
                </div>
                <div className="org-summary-card__value">
                  {computedPerformance.deliveriesReceivedToday ?? '—'}
                </div>
                <p className="org-summary-card__meta">
                  Completed: <strong>{computedPerformance.deliveriesCompletedToday ?? '—'}</strong> · Failed:{' '}
                  <strong>{computedPerformance.failedDeliveriesToday ?? 0}</strong>
                </p>
              </article>

              <article className="org-summary-card">
                <div className="org-summary-card__top">
                  <span className="org-summary-card__label">Completion Rate</span>
                  <div
                    className="org-summary-card__icon org-summary-card__icon--green"
                    aria-hidden="true"
                  >
                    <BarChart3 size={17} />
                  </div>
                </div>
                <div className="org-summary-card__value">
                  {computedPerformance.completionRatePercent !== null
                    ? `${computedPerformance.completionRatePercent}%`
                    : '—'}
                </div>
                <p className="org-summary-card__meta">
                  Pending deliveries:{' '}
                  <strong>{computedPerformance.pendingDeliveries ?? '—'}</strong>
                </p>
              </article>

              <article className="org-summary-card">
                <div className="org-summary-card__top">
                  <span className="org-summary-card__label">Avg Delivery Duration</span>
                  <div
                    className="org-summary-card__icon org-summary-card__icon--indigo"
                    aria-hidden="true"
                  >
                    <Compass size={17} />
                  </div>
                </div>
                <div className="org-summary-card__value">
                  {computedPerformance.averageDeliveryDurationMinutes !== null
                    ? `${computedPerformance.averageDeliveryDurationMinutes} min`
                    : '—'}
                </div>
                <p className="org-summary-card__meta">
                  Period: <strong>{computedPerformance.periodLabel}</strong>
                </p>
              </article>
            </div>
          ) : (
            <div
              className="org-analytics-unavailable"
              role="status"
              data-testid="branch-analytics-unavailable"
            >
              <div className="org-analytics-unavailable__info">
                <Info size={18} className="org-analytics-unavailable__icon" aria-hidden="true" />
                <div>
                  <h4 className="org-analytics-unavailable__title">
                    Branch Analytics Endpoint Not Yet Exposed
                  </h4>
                  <p className="org-analytics-unavailable__desc">
                    {performanceError ||
                      `Live delivery volume and completion rate metrics will appear here once GET /api/v1/organization/branches/${branch.id}/performance-summary is available in the backend. No synthetic or fabricated statistics are displayed.`}
                  </p>
                </div>
              </div>
              {onRetryPerformance && (
                <button
                  type="button"
                  className="org-btn org-btn--secondary org-btn--sm"
                  onClick={onRetryPerformance}
                >
                  <RefreshCw size={13} aria-hidden="true" />
                  <span>Check Endpoint</span>
                </button>
              )}
            </div>
          )}
        </section>

        {/* Card F: Stationed Branch Dispatchers */}
        <section
          className="org-details-card org-details-card--full"
          aria-labelledby="org-details-dispatchers-heading"
          data-testid="branch-dispatchers-section"
        >
          <div className="org-details-card__header flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="org-details-card__icon" aria-hidden="true">
                <Headphones size={18} strokeWidth={2.1} />
              </div>
              <div>
                <h3 id="org-details-dispatchers-heading" className="org-details-card__title">
                  Stationed Branch Dispatchers ({dispatchers.length})
                </h3>
                <p className="org-details-card__subtitle">
                  Dispatchers stationed at {branch.name} managing local assignments and courier oversight.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/organization/dispatchers">
                View All Dispatchers
              </Link>
            </Button>
          </div>

          {isLoadingDispatchers ? (
            <div className="org-state-box" role="status" aria-live="polite">
              <span className="org-spinner" aria-hidden="true" />
              <p className="org-state-box__title">Loading branch dispatchers...</p>
            </div>
          ) : dispatchers.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Users size={28} className="mx-auto mb-2 text-slate-400" />
              <p className="text-sm font-medium">No dispatchers assigned to this branch yet.</p>
            </div>
          ) : (
            <div className="org-table-wrapper">
              <table className="org-table">
                <thead>
                  <tr>
                    <th>Dispatcher</th>
                    <th>Shift Status</th>
                    <th>Couriers Supervised</th>
                    <th>Contact Channels</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatchers.map((d) => (
                    <tr key={d.id} className="org-table__row">
                      <td>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <UserCheck size={14} className="text-blue-600" />
                          <span>{d.name}</span>
                        </div>
                        <div className="text-xs text-slate-500">{d.id}</div>
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            d.shiftStatus === 'ON_DUTY'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : d.shiftStatus === 'ON_BREAK'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {d.shiftStatus === 'ON_DUTY'
                            ? 'On Duty'
                            : d.shiftStatus === 'ON_BREAK'
                            ? 'On Break'
                            : 'Off Duty'}
                        </span>
                      </td>
                      <td>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {d.activeCouriersSupervised}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-col text-xs text-slate-600 dark:text-slate-300 gap-0.5">
                          <span className="flex items-center gap-1">
                            <Phone size={11} className="text-slate-400" /> {d.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail size={11} className="text-slate-400" /> {d.email}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Card G: Branch Users (Merchants & Customers) */}
        <section
          className="org-details-card org-details-card--full"
          aria-labelledby="org-details-users-heading"
          data-testid="branch-users-section"
        >
          <div className="org-details-card__header flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="org-details-card__icon" aria-hidden="true">
                <Users size={18} strokeWidth={2.1} />
              </div>
              <div>
                <h3 id="org-details-users-heading" className="org-details-card__title">
                  Branch Users — Merchants &amp; Customers ({users.length})
                </h3>
                <p className="org-details-card__subtitle">
                  Merchants and customer accounts registered and served under {branch.name}.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/organization/users">
                View All Branch Users
              </Link>
            </Button>
          </div>

          {isLoadingUsers ? (
            <div className="org-state-box" role="status" aria-live="polite">
              <span className="org-spinner" aria-hidden="true" />
              <p className="org-state-box__title">Loading branch users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Users size={28} className="mx-auto mb-2 text-slate-400" />
              <p className="text-sm font-medium">No merchants or customers linked to this branch yet.</p>
            </div>
          ) : (
            <div className="org-table-wrapper">
              <table className="org-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>User Type</th>
                    <th>City / District</th>
                    <th>Total Orders</th>
                    <th>Status</th>
                    <th>Contact Channels</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="org-table__row">
                      <td>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          {u.userType === 'MERCHANT' ? (
                            <Store size={14} className="text-purple-600" />
                          ) : (
                            <ShoppingBag size={14} className="text-blue-600" />
                          )}
                          <span>{u.name}</span>
                        </div>
                        <div className="text-xs text-slate-500">{u.id}</div>
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.userType === 'MERCHANT'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {u.userType === 'MERCHANT' ? 'Merchant' : 'Customer'}
                        </span>
                      </td>
                      <td className="text-xs text-slate-600 dark:text-slate-300">
                        {u.city}, {u.district}
                      </td>
                      <td>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {u.totalOrders}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-col text-xs text-slate-600 dark:text-slate-300 gap-0.5">
                          <span className="flex items-center gap-1">
                            <Phone size={11} className="text-slate-400" /> {u.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail size={11} className="text-slate-400" /> {u.email}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
