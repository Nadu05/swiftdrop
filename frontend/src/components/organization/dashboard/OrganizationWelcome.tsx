'use client';

import Link from 'next/link';
import { memo } from 'react';
import { Building2, Plus, RefreshCw, ShieldCheck } from 'lucide-react';

export interface OrganizationWelcomeProps {
  lastUpdatedLabel?: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

function OrganizationWelcome({
  isLoading,
  isRefreshing,
  onRefresh,
}: OrganizationWelcomeProps) {
  return (
    <section
      className="org-welcome-banner"
      aria-labelledby="org-admin-welcome-heading"
    >
      <div className="org-welcome-banner__titles">
        <div className="org-welcome-banner__eyebrow-row">
          <span className="org-welcome-banner__eyebrow">
            SwiftDrop Head Office
          </span>
          <span className="org-welcome-banner__role-pill">
            <ShieldCheck size={12} aria-hidden="true" />
            <span>Organization Admin</span>
          </span>
        </div>

        <h1 id="org-admin-welcome-heading" className="org-page-header__title">
          Organization Administration &amp; Network Overview
        </h1>

        <p className="org-page-header__subtitle">
          Manage regional delivery hubs across Sri Lanka, configure circular service-area
          coverage radii, and monitor branch-level operational throughput from one central
          workspace.
        </p>
      </div>

      <div className="org-welcome-banner__actions org-page-header__actions">
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
    </section>
  );
}

export default memo(OrganizationWelcome);
