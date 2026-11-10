'use client';

import Link from 'next/link';
import {
  AlertCircle,
  Building2,
  Eye,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Power,
  RefreshCw,
  SearchX,
} from 'lucide-react';
import type { BranchResponse } from '@/types/organization.types';

export interface BranchTableProps {
  branches: BranchResponse[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  hasActiveFilters: boolean;
  onRetry: () => void;
  onResetFilters: () => void;
  onToggleStatus: (branch: BranchResponse) => void;
}

export default function BranchTable({
  branches,
  totalCount,
  isLoading,
  error,
  hasActiveFilters,
  onRetry,
  onResetFilters,
  onToggleStatus,
}: BranchTableProps) {
  return (
    <section className="org-directory-card" aria-labelledby="org-directory-card-heading">
      <div className="org-directory-card__header">
        <div className="org-directory-card__title-group">
          <h2 id="org-directory-card-heading" className="org-directory-card__title">
            Branch directory
          </h2>
          <p className="org-directory-card__subtitle">
            Head Office sees all branches; branch users are restricted to their own branch.
          </p>
        </div>
      </div>

      {/* 1. Loading State */}
      {isLoading ? (
        <div className="org-state-box" role="status" aria-live="polite">
          <span className="org-spinner" aria-hidden="true" />
          <p className="org-state-box__title">Loading organization branch directory...</p>
          <p className="org-state-box__desc">
            Fetching branch records from Organization Service via API Gateway.
          </p>
        </div>
      ) : error ? (
        /* 2. API Error State */
        <div className="org-state-box org-state-box--error" role="alert">
          <div className="org-state-box__icon org-state-box__icon--error" aria-hidden="true">
            <AlertCircle size={22} />
          </div>
          <h3 className="org-state-box__title">Unable to load branch directory</h3>
          <p className="org-state-box__desc">{error}</p>
          <div className="org-state-box__actions">
            <button
              type="button"
              className="org-btn org-btn--primary"
              onClick={onRetry}
            >
              <RefreshCw size={15} aria-hidden="true" />
              <span>Retry Connection</span>
            </button>
          </div>
        </div>
      ) : totalCount === 0 ? (
        /* 3. Empty Branch List State (No records in database) */
        <div className="org-state-box" role="status">
          <div className="org-state-box__icon" aria-hidden="true">
            <Building2 size={22} />
          </div>
          <h3 className="org-state-box__title">No branches registered yet</h3>
          <p className="org-state-box__desc">
            There are currently no branches in the Organization Service database. Click Add
            branch to register the first organization branch.
          </p>
          <div className="org-state-box__actions">
            <Link href="/organization/branches/create" className="org-btn org-btn--primary">
              <span>Create First Branch</span>
            </Link>
          </div>
        </div>
      ) : branches.length === 0 && hasActiveFilters ? (
        /* 4. Search / Filter Results Empty State */
        <div className="org-state-box" role="status">
          <div className="org-state-box__icon" aria-hidden="true">
            <SearchX size={22} />
          </div>
          <h3 className="org-state-box__title">No matching branches found</h3>
          <p className="org-state-box__desc">
            No branches match your current search query or status filter. Try adjusting your
            search terms or clearing the active filters.
          </p>
          <div className="org-state-box__actions">
            <button
              type="button"
              className="org-btn org-btn--secondary"
              onClick={onResetFilters}
            >
              <span>Clear Search &amp; Filters</span>
            </button>
          </div>
        </div>
      ) : (
        /* 5. Populated Branch Directory Table */
        <div className="org-table-wrapper">
          <table className="org-table" aria-label="Organization branches directory">
            <thead>
              <tr>
                <th scope="col">Branch Code</th>
                <th scope="col">Branch Name</th>
                <th scope="col">City</th>
                <th scope="col">Address</th>
                <th scope="col">Contact Information</th>
                <th scope="col">Status</th>
                <th scope="col" className="org-table__th--actions">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => {
                const isActive = branch.status === 'ACTIVE';

                return (
                  <tr key={branch.id} className="org-table__row">
                    {/* Branch Code */}
                    <td data-label="Branch Code">
                      <span className="org-branch-code">{branch.code}</span>
                    </td>

                    {/* Branch Name */}
                    <td data-label="Branch Name">
                      <div className="org-branch-name-cell">
                        <Link
                          href={`/organization/branches/${branch.id}`}
                          className="org-branch-name org-branch-name--link"
                        >
                          {branch.name}
                        </Link>
                        <span className="org-branch-coords">
                          ID #{branch.id} · {branch.latitude.toFixed(4)}, {branch.longitude.toFixed(4)}
                        </span>
                      </div>
                    </td>

                    {/* City */}
                    <td data-label="City">
                      <span className="org-branch-city">
                        <MapPin size={13} className="org-branch-city__icon" aria-hidden="true" />
                        <span>{branch.city}</span>
                      </span>
                    </td>

                    {/* Address */}
                    <td data-label="Address">
                      <div className="org-branch-address">
                        <span className="org-branch-address__line1">{branch.addressLine1}</span>
                        {branch.addressLine2 && (
                          <span className="org-branch-address__line2">{branch.addressLine2}</span>
                        )}
                      </div>
                    </td>

                    {/* Contact Information */}
                    <td data-label="Contact Information">
                      <div className="org-branch-contact">
                        <a
                          href={`tel:${branch.phone}`}
                          className="org-branch-contact__item org-branch-contact__link"
                          aria-label={`Call ${branch.name} at ${branch.phone}`}
                        >
                          <Phone size={12} aria-hidden="true" />
                          <span className="org-branch-contact__phone">{branch.phone}</span>
                        </a>
                        {branch.email ? (
                          <a
                            href={`mailto:${branch.email}`}
                            className="org-branch-contact__item org-branch-contact__email"
                            aria-label={`Email ${branch.name} at ${branch.email}`}
                          >
                            <Mail size={12} aria-hidden="true" />
                            <span>{branch.email}</span>
                          </a>
                        ) : (
                          <span className="org-branch-contact__muted">No email on file</span>
                        )}
                      </div>
                    </td>

                    {/* Branch Status */}
                    <td data-label="Status">
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

                    {/* Available Actions */}
                    <td data-label="Actions" className="org-table__td--actions">
                      <div className="org-row-actions">
                        <Link
                          href={`/organization/branches/${branch.id}`}
                          className="org-action-btn"
                          aria-label={`View details for ${branch.name}`}
                          title="View branch details"
                        >
                          <Eye size={14} aria-hidden="true" />
                          <span>View</span>
                        </Link>

                        <Link
                          href={`/organization/branches/${branch.id}/edit`}
                          className="org-action-btn"
                          aria-label={`Edit ${branch.name}`}
                          title="Edit branch"
                        >
                          <Pencil size={14} aria-hidden="true" />
                          <span>Edit</span>
                        </Link>

                        <button
                          type="button"
                          className={`org-action-btn ${
                            isActive
                              ? 'org-action-btn--deactivate'
                              : 'org-action-btn--activate'
                          }`}
                          onClick={() => onToggleStatus(branch)}
                          aria-label={`${isActive ? 'Deactivate' : 'Activate'} ${branch.name}`}
                          title={isActive ? 'Deactivate branch' : 'Activate branch'}
                        >
                          <Power size={14} aria-hidden="true" />
                          <span>{isActive ? 'Deactivate' : 'Activate'}</span>
                        </button>
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
