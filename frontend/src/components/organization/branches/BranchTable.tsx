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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
            <Button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              onClick={onRetry}
            >
              <RefreshCw size={15} aria-hidden="true" />
              <span>Retry Connection</span>
            </Button>
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
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/organization/branches/create">
                <span>Create First Branch</span>
              </Link>
            </Button>
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
            <Button
              type="button"
              variant="outline"
              onClick={onResetFilters}
            >
              <span>Clear Search &amp; Filters</span>
            </Button>
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
                    </td>

                    {/* Available Actions */}
                    <td data-label="Actions" className="org-table__td--actions">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                        >
                          <Link
                            href={`/organization/branches/${branch.id}`}
                            aria-label={`View details for ${branch.name}`}
                            title="View branch details"
                          >
                            <Eye size={14} className="mr-1" aria-hidden="true" />
                            <span>View</span>
                          </Link>
                        </Button>

                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                        >
                          <Link
                            href={`/organization/branches/${branch.id}/edit`}
                            aria-label={`Edit ${branch.name}`}
                            title="Edit branch"
                          >
                            <Pencil size={14} className="mr-1" aria-hidden="true" />
                            <span>Edit</span>
                          </Link>
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onToggleStatus(branch)}
                          className={`h-8 px-2.5 text-xs ${
                            isActive
                              ? 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40'
                              : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          }`}
                          aria-label={`${isActive ? 'Deactivate' : 'Activate'} ${branch.name}`}
                          title={isActive ? 'Deactivate branch' : 'Activate branch'}
                        >
                          <Power size={13} className="mr-1" aria-hidden="true" />
                          <span>{isActive ? 'Deactivate' : 'Activate'}</span>
                        </Button>
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
