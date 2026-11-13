'use client';

import Link from 'next/link';
import {
  Building2,
  Calendar,
  Compass,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Power,
} from 'lucide-react';
import type { BranchResponse } from '@/types/organization.types';

export interface BranchDetailsProps {
  branch: BranchResponse;
  onRequestStatusToggle: (branch: BranchResponse) => void;
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
 * Displays the complete backend `BranchResponse` DTO in organized cards.
 * Member 04 — Organization Admin UI (Phase 3: Branch Details)
 */
export default function BranchDetails({
  branch,
  onRequestStatusToggle,
}: BranchDetailsProps) {
  const isActive = branch.status === 'ACTIVE';

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
            </div>
          </div>
        </div>

        <div className="org-details-hero__actions">
          <Link
            href={`/organization/branches/${branch.id}/edit`}
            className="org-btn org-btn--primary"
          >
            <Pencil size={14} aria-hidden="true" />
            <span>Edit Branch</span>
          </Link>

          <button
            type="button"
            className={`org-btn ${
              isActive ? 'org-btn--danger-outline' : 'org-btn--success-outline'
            }`}
            onClick={() => onRequestStatusToggle(branch)}
          >
            <Power size={14} aria-hidden="true" />
            <span>{isActive ? 'Deactivate Branch' : 'Activate Branch'}</span>
          </button>
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
              <dt className="org-details-list__term">City</dt>
              <dd className="org-details-list__desc">
                <span className="org-branch-city">
                  <MapPin size={13} className="org-branch-city__icon" aria-hidden="true" />
                  <span>{branch.city}</span>
                </span>
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
      </div>
    </div>
  );
}

