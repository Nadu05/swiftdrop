'use client';

import { memo } from 'react';
import {
  Building2,
  Clock,
  MapPin,
  RefreshCw,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import type { BranchResponse } from '@/types/organization.types';
import { Badge } from '@/components/ui/badge';

export interface BranchManagerWelcomeProps {
  branch: BranchResponse | null;
  availableBranches?: BranchResponse[];
  canSwitchAssignedBranch?: boolean;
  onSelectAssignedBranch?: (branchId: number) => void;
  managerDisplayName?: string | null;
  lastUpdatedLabel: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  isPreviewMode?: boolean;
}

/**
 * Section A — Branch Welcome / Branch Identity Header (Interactive Development Preview)
 * Member 04 — Branch Manager Dashboard UI
 *
 * Displays:
 * - Welcome message for the logged-in Branch Manager
 * - Assigned branch name, branch code, physical address/city, and operating status
 * - Clearly labels `Development Preview` when mock preview mode is active
 * - Last synchronized timestamp and interactive Refresh action
 */
function BranchManagerWelcome({
  branch,
  availableBranches = [],
  canSwitchAssignedBranch = false,
  onSelectAssignedBranch,
  managerDisplayName,
  lastUpdatedLabel,
  isLoading,
  isRefreshing,
  onRefresh,
  isPreviewMode = false,
}: BranchManagerWelcomeProps) {
  const isActive = branch?.status === 'ACTIVE';

  return (
    <section
      className="org-bm-welcome"
      aria-labelledby="org-bm-welcome-heading"
      data-testid="branch-manager-welcome"
    >
      <div className="org-bm-welcome__top">
        <div className="org-bm-welcome__titles">
          <div className="org-bm-welcome__eyebrow-row">
            <span className="org-bm-welcome__eyebrow">
              Branch Console / Daily Operations
            </span>

            <span
              className="org-bm-welcome__role-pill"
              title={
                managerDisplayName
                  ? `Authenticated Branch Manager: ${managerDisplayName}`
                  : 'Authentication integration deferred (Member 01 Identity Service)'
              }
            >
              <UserCheck size={13} aria-hidden="true" />
              <span>
                {managerDisplayName
                  ? `Welcome, ${managerDisplayName}`
                  : 'Welcome, Branch Manager'}
              </span>
            </span>

            {!managerDisplayName && !isPreviewMode && (
              <span
                className="org-bm-welcome__auth-deferred"
                title="TODO (Member 01): Connect authenticated Branch Manager identity and branch claim once Identity Service is merged."
              >
                <ShieldAlert size={12} aria-hidden="true" />
                <span>Auth Context Pending</span>
              </span>
            )}
          </div>

          <h1 id="org-bm-welcome-heading" className="org-page-header__title">
            {isLoading
              ? 'Loading Branch Operations...'
              : branch
                ? `${branch.name} — Branch Manager Dashboard`
                : 'Branch Manager Dashboard'}
          </h1>

          <p className="org-page-header__subtitle">
            Single-branch operational command center for incoming delivery requests,
            courier availability, dispatch assignments, and daily hub performance.
          </p>
        </div>

        <div className="org-page-header__actions">
          {canSwitchAssignedBranch &&
            availableBranches.length > 1 &&
            onSelectAssignedBranch && (
              <div className="org-bm-welcome__branch-switcher">
                <label
                  htmlFor="org-bm-authorized-branch-select"
                  className="org-sr-only"
                >
                  Authorized branch context
                </label>
                <select
                  id="org-bm-authorized-branch-select"
                  className="org-console-branch-pill org-console-branch-pill--select"
                  value={branch?.id ?? ''}
                  onChange={(e) => onSelectAssignedBranch(Number(e.target.value))}
                  aria-label="Authorized branch context"
                >
                  {availableBranches.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

          {lastUpdatedLabel && (
            <span
              className="org-timestamp-badge"
              title="Last synchronized with backend services"
            >
              <Clock size={14} aria-hidden="true" />
              <span>Synced {lastUpdatedLabel}</span>
            </span>
          )}

          <button
            type="button"
            className="org-btn org-btn--primary"
            onClick={onRefresh}
            disabled={isLoading || isRefreshing}
            aria-label="Refresh branch manager dashboard"
          >
            <RefreshCw
              size={15}
              className={isRefreshing ? 'org-icon--spinning' : undefined}
              aria-hidden="true"
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Branch Identity Bar */}
      {branch && (
        <div className="org-bm-identity-bar">
          <div className="org-bm-identity-bar__left">
            <div className="org-bm-identity-bar__icon" aria-hidden="true">
              <Building2 size={20} />
            </div>
            <div>
              <div className="org-bm-identity-bar__name-row">
                <strong className="org-bm-identity-bar__name">{branch.name}</strong>
                <span className="org-branch-code">{branch.code}</span>
                <span
                  className={`org-status-badge ${
                    isActive ? 'org-status-badge--active' : 'org-status-badge--inactive'
                  }`}
                >
                  <span className="org-status-badge__dot" aria-hidden="true" />
                  <span>{branch.status}</span>
                </span>
              </div>
              <div className="org-bm-identity-bar__meta">
                <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                  <MapPin size={12} className="text-slate-400" aria-hidden="true" />
                  <span>
                    {branch.addressLine1}
                    {branch.addressLine2 ? `, ${branch.addressLine2}` : ''}, {branch.city}
                  </span>
                </span>
                {branch.phone && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-600 font-mono">{branch.phone}</span>
                  </>
                )}
                {branch.email && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-600">{branch.email}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="org-bm-identity-bar__right">
            <span
              className="org-bm-scope-pill"
              title="Operational actions and dispatches are strictly isolated to this branch."
            >
              Single-Branch Scope: {branch.code}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

export default memo(BranchManagerWelcome);
