'use client';

import Link from 'next/link';
import { memo } from 'react';
import {
  AlertCircle,
  Building2,
  Compass,
  Info,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Radar,
  RefreshCw,
} from 'lucide-react';
import type {
  BranchResponse,
  ServiceAreaResponse,
} from '@/types/organization.types';

export interface BranchInfoServiceAreaSectionProps {
  branch: BranchResponse;
  serviceAreas: ServiceAreaResponse[];
  isLoadingServiceAreas: boolean;
  serviceAreasError: string | null;
  onRetryServiceAreas: () => void;
  canEditBranchConfig?: boolean;
  isPreviewMode?: boolean;
}

/**
 * Section F — Branch Information / Service Area (Read-Only for Branch Managers)
 * Member 04 — Branch Manager Dashboard UI
 *
 * Displays:
 * - Branch physical address and city
 * - Branch contact phone and email
 * - Geographic coordinates (latitude / longitude)
 * - Associated service-area records (`ServiceAreaResponse[]`) and their operational status
 *
 * Strictly read-only for Branch Managers unless `canEditBranchConfig` is explicitly granted.
 */
function BranchInfoServiceAreaSection({
  branch,
  serviceAreas,
  isLoadingServiceAreas,
  serviceAreasError,
  onRetryServiceAreas,
  canEditBranchConfig = false,
  isPreviewMode = false,
}: BranchInfoServiceAreaSectionProps) {
  return (
    <section
      id="branch-information"
      className="org-directory-card org-bm-card"
      aria-labelledby="org-bm-branch-info-heading"
      data-testid="branch-info-service-area-section"
    >
      <div className="org-directory-card__header">
        <div className="org-directory-card__title-group">
          <div className="org-dashboard-card__title-row">
            <h2
              id="org-bm-branch-info-heading"
              className="org-directory-card__title"
            >
              Branch Information &amp; Service Area Coverage
            </h2>
            {isPreviewMode && (
              <span className="org-dashboard-badge org-dashboard-badge--preview">
                Demonstration Profile
              </span>
            )}
            {!canEditBranchConfig && (
              <span
                className="org-bm-readonly-badge"
                title="Branch configuration and service areas are managed by Head Office."
              >
                <Lock size={11} aria-hidden="true" />
                <span>Read-Only for Branch Manager</span>
              </span>
            )}
          </div>
          <p className="org-directory-card__subtitle">
            Registered hub location, contact channels, and server-side geographic
            service-area radii configured in{' '}
            <code className="org-inline-code">organization-service</code>.
          </p>
        </div>

        {canEditBranchConfig && (
          <div className="org-dashboard-card__header-actions">
            <Link
              href={`/organization/branches/${branch.id}/edit`}
              className="org-btn org-btn--secondary"
            >
              <Pencil size={13} aria-hidden="true" />
              <span>Edit Branch</span>
            </Link>
          </div>
        )}
      </div>

      <div className="org-bm-info-layout">
        {/* Left Sub-card: Compact Branch Profile */}
        <div className="org-bm-info-panel">
          <div className="org-bm-info-panel__header">
            <Building2
              size={16}
              className="text-blue-600 shrink-0"
              aria-hidden="true"
            />
            <h3 className="org-bm-info-panel__title">
              Branch Profile ({branch.code})
            </h3>
          </div>

          <dl className="org-details-list">
            <div className="org-details-list__item">
              <dt className="org-details-list__term">Branch Address</dt>
              <dd className="org-details-list__desc org-details-list__desc--strong">
                {branch.addressLine1}
                {branch.addressLine2 ? `, ${branch.addressLine2}` : ''}
              </dd>
            </div>

            <div className="org-details-list__item">
              <dt className="org-details-list__term">Municipality / City</dt>
              <dd className="org-details-list__desc">
                <span className="org-branch-city">
                  <MapPin
                    size={13}
                    className="org-branch-city__icon"
                    aria-hidden="true"
                  />
                  <span>{branch.city}</span>
                </span>
              </dd>
            </div>

            <div className="org-details-list__item">
              <dt className="org-details-list__term">Contact Phone</dt>
              <dd className="org-details-list__desc">
                <a
                  href={`tel:${branch.phone}`}
                  className="org-branch-contact__item org-branch-contact__link"
                >
                  <Phone size={13} aria-hidden="true" />
                  <span className="org-branch-contact__phone">
                    {branch.phone}
                  </span>
                </a>
              </dd>
            </div>

            <div className="org-details-list__item">
              <dt className="org-details-list__term">Contact Email</dt>
              <dd className="org-details-list__desc">
                {branch.email ? (
                  <a
                    href={`mailto:${branch.email}`}
                    className="org-branch-contact__item org-branch-contact__link"
                  >
                    <Mail size={13} aria-hidden="true" />
                    <span>{branch.email}</span>
                  </a>
                ) : (
                  <span className="org-text-muted">—</span>
                )}
              </dd>
            </div>

            <div className="org-details-list__item">
              <dt className="org-details-list__term">GPS Coordinates</dt>
              <dd className="org-details-list__desc">
                <span className="org-branch-coords">
                  <Compass
                    size={13}
                    className="org-branch-coords__icon"
                    aria-hidden="true"
                  />
                  <span className="font-mono">
                    {branch.latitude.toFixed(4)}, {branch.longitude.toFixed(4)}
                  </span>
                </span>
              </dd>
            </div>

            <div className="org-details-list__item">
              <dt className="org-details-list__term">Operating Status</dt>
              <dd className="org-details-list__desc">
                <span
                  className={`org-status-badge ${
                    branch.status === 'ACTIVE'
                      ? 'org-status-badge--active'
                      : 'org-status-badge--inactive'
                  }`}
                >
                  <span className="org-status-badge__dot" aria-hidden="true" />
                  <span>{branch.status}</span>
                </span>
              </dd>
            </div>
          </dl>
        </div>

        {/* Right Sub-card: Service Areas Table */}
        <div className="org-bm-info-panel">
          <div className="org-bm-info-panel__header">
            <Radar
              size={16}
              className="text-blue-600 shrink-0"
              aria-hidden="true"
            />
            <h3 className="org-bm-info-panel__title">
              Service Area Coverage ({serviceAreas.length}{' '}
              {serviceAreas.length === 1 ? 'zone' : 'zones'})
            </h3>
          </div>

          {isLoadingServiceAreas ? (
            <div className="org-state-box" role="status" aria-live="polite">
              <div className="org-spinner" aria-hidden="true" />
              <p className="org-state-box__title">
                Loading service areas...
              </p>
            </div>
          ) : serviceAreasError ? (
            <div className="org-state-box org-dashboard-unavailable" role="status">
              <div className="org-state-box__icon" aria-hidden="true">
                <AlertCircle size={22} />
              </div>
              <h4 className="org-state-box__title">
                Service Area Endpoint Pending
              </h4>
              <p className="org-state-box__desc">{serviceAreasError}</p>
              <div className="org-state-box__actions">
                <button
                  type="button"
                  className="org-btn org-btn--secondary"
                  onClick={onRetryServiceAreas}
                >
                  <RefreshCw size={13} aria-hidden="true" />
                  <span>Retry Service Areas</span>
                </button>
              </div>
            </div>
          ) : serviceAreas.length === 0 ? (
            <div className="org-state-box" role="status">
              <div className="org-state-box__icon" aria-hidden="true">
                <Radar size={22} />
              </div>
              <h4 className="org-state-box__title">
                No Service Areas Registered for {branch.name}
              </h4>
              <p className="org-state-box__desc">
                This branch has no active service-area radii configured in the
                backend yet. Orders will not be automatically resolved to this
                branch until a service area is established by Head Office.
              </p>
            </div>
          ) : (
            <div className="org-table-wrapper">
              <table
                className="org-table"
                aria-label="Branch service areas table"
              >
                <thead>
                  <tr>
                    <th scope="col">Area / Zone Name</th>
                    <th scope="col">Max Radius</th>
                    <th scope="col">Coverage Coordinates</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceAreas.map((area) => (
                    <tr key={area.id}>
                      <td data-label="Area Name">
                        <strong className="font-semibold text-slate-900">
                          {area.areaName}
                        </strong>
                      </td>
                      <td data-label="Max Radius">
                        <span className="font-semibold text-blue-700">
                          {area.maxRadiusKm} km
                        </span>
                      </td>
                      <td data-label="Coordinates">
                        <span className="font-mono text-xs text-slate-600">
                          {area.centerLatitude.toFixed(4)},{' '}
                          {area.centerLongitude.toFixed(4)}
                        </span>
                      </td>
                      <td data-label="Status">
                        <span
                          className={`org-status-badge ${
                            area.status === 'ACTIVE'
                              ? 'org-status-badge--active'
                              : 'org-status-badge--inactive'
                          }`}
                        >
                          <span
                            className="org-status-badge__dot"
                            aria-hidden="true"
                          />
                          <span>{area.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default memo(BranchInfoServiceAreaSection);
