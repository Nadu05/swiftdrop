'use client';

import Link from 'next/link';
import { memo, useMemo, useState } from 'react';
import {
  AlertCircle,
  Compass,
  Eye,
  Info,
  Radar,
  RefreshCw,
} from 'lucide-react';
import type { ServiceAreaResponse, ServiceAreaStatus } from '@/types/organization.types';

export interface ServiceAreaOverviewProps {
  serviceAreas: ServiceAreaResponse[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

type ServiceAreaFilter = 'ALL' | ServiceAreaStatus;

/**
 * Displays service-area records returned by Member 03's backend (`ServiceAreaController`).
 *
 * Confirmed Backend Contract:
 * - Endpoint: GET /api/v1/organization/service-areas?status={ACTIVE|INACTIVE}
 * - Response DTO: ServiceAreaResponse[]
 *
 * IMPORTANT BOUNDARY:
 * This component strictly displays the `ServiceAreaResponse` fields returned by
 * `organization-service`. It does NOT compute geographic eligibility, Haversine
 * distances, or nearest-branch selection on the frontend (owned by Member 03).
 */
function ServiceAreaOverview({
  serviceAreas,
  isLoading,
  error,
  onRetry,
}: ServiceAreaOverviewProps) {
  const [statusFilter, setStatusFilter] = useState<ServiceAreaFilter>('ALL');

  const counts = useMemo(() => {
    const active = serviceAreas.filter((sa) => sa.status === 'ACTIVE').length;
    const inactive = serviceAreas.filter((sa) => sa.status === 'INACTIVE').length;
    return {
      all: serviceAreas.length,
      active,
      inactive,
    };
  }, [serviceAreas]);

  const filteredAreas = useMemo(() => {
    if (statusFilter === 'ALL') return serviceAreas;
    return serviceAreas.filter((sa) => sa.status === statusFilter);
  }, [serviceAreas, statusFilter]);

  return (
    <section
      className="org-directory-card org-dashboard-card"
      aria-labelledby="org-service-area-overview-heading"
    >
      <div className="org-directory-card__header">
        <div className="org-directory-card__title-group">
          <div className="org-dashboard-card__title-row">
            <h2
              id="org-service-area-overview-heading"
              className="org-directory-card__title"
            >
              Service-Area Coverage Overview
            </h2>
            <span className="org-dashboard-badge org-dashboard-badge--contract">
              Member 03 API Contract
            </span>
          </div>
          <p className="org-directory-card__subtitle">
            Geographic delivery radius definitions (<code className="org-inline-code">ServiceAreaResponse</code>)
            configured per branch in <code className="org-inline-code">organization-service</code>.
            Eligibility and nearest-branch resolution are evaluated server-side.
          </p>
        </div>

        {!error && serviceAreas.length > 0 && (
          <div
            className="org-filters__status-group"
            role="group"
            aria-label="Filter service areas by status"
          >
            <button
              type="button"
              className={`org-filters__status-pill${
                statusFilter === 'ALL' ? ' org-filters__status-pill--active' : ''
              }`}
              onClick={() => setStatusFilter('ALL')}
              aria-pressed={statusFilter === 'ALL'}
            >
              <span>All</span>
              <span className="org-filters__status-count">{counts.all}</span>
            </button>
            <button
              type="button"
              className={`org-filters__status-pill${
                statusFilter === 'ACTIVE' ? ' org-filters__status-pill--active' : ''
              }`}
              onClick={() => setStatusFilter('ACTIVE')}
              aria-pressed={statusFilter === 'ACTIVE'}
            >
              <span>Active</span>
              <span className="org-filters__status-count">{counts.active}</span>
            </button>
            <button
              type="button"
              className={`org-filters__status-pill${
                statusFilter === 'INACTIVE' ? ' org-filters__status-pill--active' : ''
              }`}
              onClick={() => setStatusFilter('INACTIVE')}
              aria-pressed={statusFilter === 'INACTIVE'}
            >
              <span>Inactive</span>
              <span className="org-filters__status-count">{counts.inactive}</span>
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="org-state-box" role="status" aria-live="polite">
          <div className="org-spinner" aria-hidden="true" />
          <p className="org-state-box__title">Loading service-area definitions...</p>
          <p className="org-state-box__desc">
            Querying{' '}
            <code className="org-inline-code">GET /api/v1/organization/service-areas</code>
          </p>
        </div>
      ) : error ? (
        /*
         * TODO (Backend Dependency — Member 03 ServiceAreaController):
         * If the service-area endpoint is unreachable or not running, display a clean
         * unavailable state documenting the expected backend endpoint contract without
         * inventing geographic calculations on the frontend.
         */
        <div className="org-state-box org-dashboard-unavailable" role="status">
          <div className="org-state-box__icon" aria-hidden="true">
            <AlertCircle size={22} />
          </div>
          <p className="org-state-box__title">
            Service-Area Backend Endpoint Unavailable
          </p>
          <p className="org-state-box__desc">{error}</p>
          <div className="org-dashboard-contract-note">
            <Info size={15} className="org-dashboard-contract-note__icon" aria-hidden="true" />
            <span>
              Expected Member 03 backend contract:{' '}
              <code className="org-inline-code">GET /api/v1/organization/service-areas</code>{' '}
              returning <code className="org-inline-code">ServiceAreaResponse[]</code>.
              Geographic coverage and nearest-branch resolution are handled exclusively by the
              backend.
            </span>
          </div>
          <div className="org-state-box__actions">
            <button
              type="button"
              className="org-btn org-btn--secondary"
              onClick={onRetry}
            >
              <RefreshCw size={14} aria-hidden="true" />
              <span>Retry Service-Area Sync</span>
            </button>
          </div>
        </div>
      ) : serviceAreas.length === 0 ? (
        <div className="org-state-box">
          <div className="org-state-box__icon" aria-hidden="true">
            <Radar size={22} />
          </div>
          <p className="org-state-box__title">No service areas configured</p>
          <p className="org-state-box__desc">
            No service-area records were returned by{' '}
            <code className="org-inline-code">GET /api/v1/organization/service-areas</code>.
            Once service areas are registered for active branches, their center coordinates and
            maximum delivery radii will appear here.
          </p>
        </div>
      ) : filteredAreas.length === 0 ? (
        <div className="org-state-box">
          <div className="org-state-box__icon" aria-hidden="true">
            <Radar size={22} />
          </div>
          <p className="org-state-box__title">
            No {statusFilter.toLowerCase()} service areas found
          </p>
          <p className="org-state-box__desc">
            No service areas match the status filter{' '}
            <code className="org-inline-code">{statusFilter}</code>.
          </p>
          <div className="org-state-box__actions">
            <button
              type="button"
              className="org-btn org-btn--secondary"
              onClick={() => setStatusFilter('ALL')}
            >
              Show All Service Areas
            </button>
          </div>
        </div>
      ) : (
        <div className="org-table-wrapper">
          <table
            className="org-table"
            aria-label="Organization service-area coverage table"
          >
            <thead>
              <tr>
                <th scope="col">Service Area</th>
                <th scope="col">Assigned Branch</th>
                <th scope="col">Center Coordinates</th>
                <th scope="col">Max Radius</th>
                <th scope="col">Status</th>
                <th scope="col" className="org-table__th--actions">
                  Branch Details
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAreas.map((area) => {
                const isActive = area.status === 'ACTIVE';
                return (
                  <tr key={area.id}>
                    <td>
                      <div className="org-branch-name-cell">
                        <span className="org-branch-name">{area.areaName}</span>
                        <span className="org-branch-coords">Area ID #{area.id}</span>
                      </div>
                    </td>
                    <td>
                      <div className="org-service-area__branch-cell">
                        <span className="org-branch-code">{area.branchCode}</span>
                        <Link
                          href={`/organization/branches/${area.branchId}`}
                          className="org-branch-name org-branch-name--link"
                        >
                          {area.branchName}
                        </Link>
                      </div>
                    </td>
                    <td>
                      <span className="org-service-area__coords">
                        <Compass size={13} aria-hidden="true" />
                        <span>
                          {area.centerLatitude.toFixed(4)}° N,{' '}
                          {area.centerLongitude.toFixed(4)}° E
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className="org-service-area__radius-pill">
                        {area.maxRadiusKm} km
                      </span>
                    </td>
                    <td>
                      <span
                        className={`org-status-badge ${
                          isActive
                            ? 'org-status-badge--active'
                            : 'org-status-badge--inactive'
                        }`}
                      >
                        <span className="org-status-badge__dot" aria-hidden="true" />
                        <span>{isActive ? 'Active' : 'Inactive'}</span>
                      </span>
                    </td>
                    <td className="org-table__td--actions">
                      <div className="org-row-actions">
                        <Link
                          href={`/organization/branches/${area.branchId}`}
                          className="org-action-btn"
                          title={`Inspect branch ${area.branchName}`}
                        >
                          <Eye size={13} aria-hidden="true" />
                          <span>Inspect Branch</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default memo(ServiceAreaOverview);

