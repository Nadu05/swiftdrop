'use client';

import Link from 'next/link';
import { memo } from 'react';
import { Building2, Clock, Plus, RefreshCw } from 'lucide-react';

export interface OrganizationWelcomeProps {
  lastUpdatedLabel: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

function OrganizationWelcome({
  lastUpdatedLabel,
  isLoading,
  isRefreshing,
  onRefresh,
}: OrganizationWelcomeProps) {
  return (
    <div className="org-page-header">
      <div className="org-page-header__titles">
        <p className="org-page-header__eyebrow">Admin / Head Office Operations</p>
        <h1 className="org-page-header__title">Organization Admin Dashboard</h1>
        <p className="org-page-header__subtitle">
          Head Office overview of organization branches, operational status, and service-area
          coverage across the SwiftDrop delivery network.
        </p>
      </div>

      <div className="org-page-header__actions">
        {lastUpdatedLabel && (
          <span className="org-timestamp-badge" title="Last synchronized with backend">
            <Clock size={14} aria-hidden="true" />
            <span>Synced {lastUpdatedLabel}</span>
          </span>
        )}

        <button
          type="button"
          className="org-btn org-btn--secondary"
          onClick={onRefresh}
          disabled={isLoading || isRefreshing}
          aria-label="Refresh organization dashboard data"
        >
          <RefreshCw
            size={15}
            className={isRefreshing ? 'org-icon--spinning' : undefined}
            aria-hidden="true"
          />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>

        <Link
          href="/organization/branches"
          className="org-btn org-btn--secondary"
          aria-label="Open Branch Directory"
        >
          <Building2 size={15} aria-hidden="true" />
          <span>Branch Directory</span>
        </Link>

        <Link
          href="/organization/branches/create"
          className="org-btn org-btn--primary org-btn--add-branch"
          aria-label="Create a new branch"
        >
          <Plus size={16} aria-hidden="true" />
          <span>Add branch</span>
        </Link>
      </div>
    </div>
  );
}

export default memo(OrganizationWelcome);

