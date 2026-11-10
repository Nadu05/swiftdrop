'use client';

import Link from 'next/link';
import { memo, useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Eye,
  MapPin,
  Pencil,
  Phone,
  Plus,
} from 'lucide-react';
import type { BranchResponse, BranchStatusFilter } from '@/types/organization.types';

export interface BranchStatusOverviewProps {
  branches: BranchResponse[];
  isLoading: boolean;
  isMockMode: boolean;
}

function BranchStatusOverview({
  branches,
  isLoading,
  isMockMode,
}: BranchStatusOverviewProps) {
  const [statusFilter, setStatusFilter] = useState<BranchStatusFilter>('ALL');

  const counts = useMemo(() => {
    const active = branches.filter((b) => b.status === 'ACTIVE').length;
    const inactive = branches.filter((b) => b.status === 'INACTIVE').length;
    return {
      all: branches.length,
      active,
      inactive,
    };
  }, [branches]);

  const filteredBranches = useMemo(() => {
    if (statusFilter === 'ALL') return branches;
    return branches.filter((b) => b.status === statusFilter);
  }, [branches, statusFilter]);

  return (
    <section
      className="org-directory-card org-dashboard-card"
      aria-labelledby="org-branch-status-overview-heading"
    >
      <div className="org-directory-card__header">
        <div className="org-directory-card__title-group">
          <div className="org-dashboard-card__title-row">
            <h2
              id="org-branch-status-overview-heading"
              className="org-directory-card__title"
            >
              Branch Status Overview
            </h2>
            {isMockMode && (
              <span className="org-mock-pill">Isolated Dev Mock Data</span>
            )}
          </div>
          <p className="org-directory-card__subtitle">
            Live operational readiness of registered SwiftDrop branches. Click any branch to
            inspect full details or manage activation status.
          </p>
        </div>

        <div className="org-dashboard-card__header-actions">
          <div
            className="org-filters__status-group"
            role="group"
            aria-label="Filter branch status overview"
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

          <Link
            href="/organization/branches"
            className="org-dashboard-card__view-all"
            aria-label="View all branches in the Branch Directory"
          >
            <span>View all branches</span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="org-state-box" role="status" aria-live="polite">
          <div className="org-spinner" aria-hidden="true" />
          <p className="org-state-box__title">Loading branch status overview...</p>
          <p className="org-state-box__desc">
            Fetching registered branches from{' '}
            <code className="org-inline-code">GET /api/v1/organization/branches</code>
          </p>
        </div>
      ) : branches.length === 0 ? (
        <div className="org-state-box">
          <div className="org-state-box__icon" aria-hidden="true">
            <Building2 size={22} />
          </div>
          <p className="org-state-box__title">No branches registered yet</p>
          <p className="org-state-box__desc">
            Create your first organization branch to begin configuring delivery service areas
            and routing customer orders.
          </p>
          <div className="org-state-box__actions">
            <Link
              href="/organization/branches/create"
              className="org-btn org-btn--primary"
            >
              <Plus size={15} aria-hidden="true" />
              <span>Create First Branch</span>
            </Link>
          </div>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="org-state-box">
          <div className="org-state-box__icon" aria-hidden="true">
            <Building2 size={22} />
          </div>
          <p className="org-state-box__title">
            No {statusFilter.toLowerCase()} branches found
          </p>
          <p className="org-state-box__desc">
            There are currently no branches with status{' '}
            <code className="org-inline-code">{statusFilter}</code>.
          </p>
          <div className="org-state-box__actions">
            <button
              type="button"
              className="org-btn org-btn--secondary"
              onClick={() => setStatusFilter('ALL')}
            >
              Show All Branches
            </button>
          </div>
        </div>
      ) : (
        <div className="org-table-wrapper">
          <table
            className="org-table"
            aria-label="Organization branch status overview table"
          >
            <thead>
              <tr>
                <th scope="col">Branch</th>
                <th scope="col">Code</th>
                <th scope="col">City &amp; Location</th>
                <th scope="col">Contact</th>
                <th scope="col">Status</th>
                <th scope="col" className="org-table__th--actions">
                  Quick Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBranches.map((branch) => {
                const isActive = branch.status === 'ACTIVE';
                return (
                  <tr key={branch.id}>
                    <td>
                      <div className="org-branch-name-cell">
                        <Link
                          href={`/organization/branches/${branch.id}`}
                          className="org-branch-name org-branch-name--link"
                        >
                          {branch.name}
                        </Link>
                        <span className="org-branch-coords">
                          {branch.latitude.toFixed(4)}° N, {branch.longitude.toFixed(4)}° E
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="org-branch-code">{branch.code}</span>
                    </td>
                    <td>
                      <div className="org-branch-address">
                        <span className="org-branch-city">
                          <MapPin
                            size={13}
                            className="org-branch-city__icon"
                            aria-hidden="true"
                          />
                          <span>{branch.city}</span>
                        </span>
                        <span className="org-branch-address__line2">
                          {branch.addressLine1}
                          {branch.addressLine2 ? `, ${branch.addressLine2}` : ''}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="org-branch-contact">
                        <span className="org-branch-contact__item org-branch-contact__phone">
                          <Phone size={12} aria-hidden="true" />
                          <span>{branch.phone}</span>
                        </span>
                        {branch.email ? (
                          <span className="org-branch-contact__item org-branch-contact__email">
                            {branch.email}
                          </span>
                        ) : (
                          <span className="org-branch-contact__muted">No email</span>
                        )}
                      </div>
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
                          href={`/organization/branches/${branch.id}`}
                          className="org-action-btn"
                          title={`View details for ${branch.name}`}
                        >
                          <Eye size={13} aria-hidden="true" />
                          <span>View Details</span>
                        </Link>
                        <Link
                          href={`/organization/branches/${branch.id}/edit`}
                          className="org-action-btn"
                          title={`Edit ${branch.name}`}
                        >
                          <Pencil size={13} aria-hidden="true" />
                          <span>Edit</span>
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

export default memo(BranchStatusOverview);

