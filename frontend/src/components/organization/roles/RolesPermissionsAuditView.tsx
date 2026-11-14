'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  Building2,
  FileClock,
  Info,
  Mail,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  useOrganizationAuditEvents,
  useOrganizationStaffAccounts,
} from '@/hooks/api/use-organization';
import type { RolePermissionMatrixRow } from '@/types/organization.types';

export type RolesAuditTab = 'role-permissions' | 'staff-accounts' | 'audit-log';

/**
 * Project-defined access control policy matrix specified in
 * Figma Screen 35 (Admin / Roles, Permissions and Audit Log).
 */
export const PROJECT_PERMISSION_MATRIX: readonly RolePermissionMatrixRow[] = [
  {
    id: 'review-merchant-applications',
    capability: 'Review merchant applications',
    scopes: ['Head Office: yes', 'Branch: no', 'Merchant: no'],
    summaryText:
      'Review merchant applications | Head Office: yes | Branch: no | Merchant: no',
  },
  {
    id: 'assign-couriers',
    capability: 'Assign couriers',
    scopes: ['Head Office: all branches', 'Branch: own branch only'],
    summaryText:
      'Assign couriers | Head Office: all branches | Branch: own branch only',
  },
  {
    id: 'manage-products-and-orders',
    capability: 'Manage products and orders',
    scopes: ['Merchant: own business', 'Courier: no'],
    summaryText:
      'Manage products and orders | Merchant: own business | Courier: no',
  },
  {
    id: 'manage-users-and-roles',
    capability: 'Manage users and roles',
    scopes: ['Head Office: all', 'Branch: own staff'],
    summaryText:
      'Manage users and roles | Head Office: all | Branch: own staff',
  },
];

/**
 * Screen 35 — Admin / Roles, Permissions and Audit Log
 * Member 04 — Organization Admin UI Implementation
 */
export default function RolesPermissionsAuditView() {
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<RolesAuditTab>(() => {
    if (
      initialTabParam === 'staff-accounts' ||
      initialTabParam === 'audit-log' ||
      initialTabParam === 'role-permissions'
    ) {
      return initialTabParam;
    }
    return 'role-permissions';
  });

  const {
    data: staffAccounts = [],
    isLoading: isLoadingStaff,
    error: rawStaffError,
    refetch: refetchStaff,
  } = useOrganizationStaffAccounts();

  const {
    data: auditEvents = [],
    isLoading: isLoadingAudit,
    error: rawAuditError,
    refetch: refetchAudit,
  } = useOrganizationAuditEvents();

  const staffUnavailableMessage = rawStaffError
    ? rawStaffError instanceof Error
      ? rawStaffError.message
      : 'Organization staff accounts endpoint is not yet available from the backend.'
    : null;

  const auditUnavailableMessage = rawAuditError
    ? rawAuditError instanceof Error
      ? rawAuditError.message
      : 'Organization audit log endpoint is not yet available from the backend.'
    : null;

  const handleRefresh = () => {
    refetchAudit();
    refetchStaff();
  };

  return (
    <div className="org-page">
      {/* Screen 35 Page Header */}
      <header className="org-page-header">
        <div className="org-page-header__titles">
          <p className="org-page-header__eyebrow">
            Admin / Access Control &amp; Security Audit
          </p>
          <h1 className="org-page-header__title">
            Roles, Permissions &amp; Audit Log
          </h1>
          <p className="org-page-header__subtitle">
            Manage role-based access boundaries, inspect Head Office and regional staff
            accounts, and review chronological administrative audit events.
          </p>
        </div>

        <div className="org-page-header__actions">
          <button
            type="button"
            className="org-btn org-btn--secondary"
            onClick={handleRefresh}
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>Refresh</span>
          </button>

          <Link
            href="/organization/branches"
            className="org-btn org-btn--primary"
          >
            <Building2 size={15} aria-hidden="true" />
            <span>Branch Directory</span>
          </Link>
        </div>
      </header>

      {/* Screen 35 Sub-navigation Pills */}
      <div
        className="org-tabs"
        role="tablist"
        aria-label="Roles, staff accounts, and audit log tabs"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'role-permissions'}
          className={`org-tabs__pill${
            activeTab === 'role-permissions' ? ' org-tabs__pill--active' : ''
          }`}
          onClick={() => setActiveTab('role-permissions')}
        >
          <span>Role permissions</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'staff-accounts'}
          className={`org-tabs__pill${
            activeTab === 'staff-accounts' ? ' org-tabs__pill--active' : ''
          }`}
          onClick={() => setActiveTab('staff-accounts')}
        >
          <span>Staff accounts ({staffAccounts.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'audit-log'}
          className={`org-tabs__pill${
            activeTab === 'audit-log' ? ' org-tabs__pill--active' : ''
          }`}
          onClick={() => setActiveTab('audit-log')}
        >
          <span>Audit log ({auditEvents.length})</span>
        </button>
      </div>

      {/* Tab 1: Role permissions */}
      {activeTab === 'role-permissions' && (
        <>
          <section
            className="org-directory-card"
            aria-labelledby="permission-matrix-heading"
          >
            <div className="org-directory-card__header">
              <div className="org-directory-card__title-group">
                <h2
                  id="permission-matrix-heading"
                  className="org-directory-card__title"
                >
                  Role &amp; Permission Policy Matrix
                </h2>
                <p className="org-directory-card__subtitle">
                  Least-privilege isolation: Head Office manages all branches; branch-level
                  users are scoped strictly to their assigned branch.
                </p>
              </div>
            </div>

            <div className="org-table-wrapper">
              <table className="org-table" aria-label="Role permission rules">
                <thead>
                  <tr>
                    <th scope="col">Capability</th>
                    <th scope="col">Role &amp; Scope Rules</th>
                    <th scope="col">Policy Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {PROJECT_PERMISSION_MATRIX.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="org-branch-name">{row.capability}</span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          {row.scopes.map((scope) => {
                            const isAllowed =
                              !scope.toLowerCase().endsWith(': no');
                            return (
                              <span
                                key={scope}
                                className={`org-status-badge ${
                                  isAllowed
                                    ? 'org-status-badge--active'
                                    : 'org-status-badge--inactive'
                                }`}
                              >
                                <span
                                  className="org-status-badge__dot"
                                  aria-hidden="true"
                                />
                                <span>{scope}</span>
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td>
                        <span className="text-xs text-slate-600 font-medium">
                          {row.summaryText}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recent audit events card (Screen 35 bottom card) */}
          <section
            className="org-directory-card"
            aria-labelledby="recent-audit-events-heading"
          >
            <div className="org-directory-card__header">
              <div className="org-directory-card__title-group">
                <h2
                  id="recent-audit-events-heading"
                  className="org-directory-card__title"
                >
                  Recent Administrative Audit Events
                </h2>
                <p className="org-directory-card__subtitle">
                  Latest configuration and status changes across the SwiftDrop network.
                </p>
              </div>
            </div>

            {isLoadingAudit ? (
              <div className="org-state-box" role="status">
                <span className="org-spinner" aria-hidden="true" />
                <p className="org-state-box__title">Loading recent audit events...</p>
              </div>
            ) : auditUnavailableMessage ? (
              <div className="org-state-box" role="status">
                <div className="org-state-box__icon" aria-hidden="true">
                  <FileClock size={20} />
                </div>
                <p className="org-state-box__title">Audit Log Endpoint Pending</p>
                <p className="org-state-box__desc">{auditUnavailableMessage}</p>
              </div>
            ) : (
              <div className="org-table-wrapper">
                <table
                  className="org-table"
                  aria-label="Recent organization audit events"
                >
                  <thead>
                    <tr>
                      <th scope="col">Event ID</th>
                      <th scope="col">Time</th>
                      <th scope="col">Actor</th>
                      <th scope="col">Action</th>
                      <th scope="col">Target Reference</th>
                      <th scope="col">Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditEvents.map((event) => {
                      const isInactiveOutcome = event.outcome === 'INACTIVE';
                      return (
                        <tr key={event.id}>
                          <td>
                            <span className="org-branch-code">{event.id}</span>
                          </td>
                          <td>
                            <span className="org-coords-mono">{event.timestamp}</span>
                          </td>
                          <td>
                            <span className="org-branch-name">{event.actor}</span>
                          </td>
                          <td>{event.action}</td>
                          <td>
                            <span className="org-coords-mono">
                              {event.referenceCode}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`org-status-badge ${
                                isInactiveOutcome
                                  ? 'org-status-badge--inactive'
                                  : 'org-status-badge--active'
                              }`}
                            >
                              <span
                                className="org-status-badge__dot"
                                aria-hidden="true"
                              />
                              <span>{event.outcome}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* Tab 2: Staff accounts */}
      {activeTab === 'staff-accounts' && (
        <section
          className="org-directory-card"
          aria-labelledby="staff-accounts-heading"
        >
          <div className="org-directory-card__header">
            <div className="org-directory-card__title-group">
              <h2
                id="staff-accounts-heading"
                className="org-directory-card__title"
              >
                Organization &amp; Regional Staff Accounts
              </h2>
              <p className="org-directory-card__subtitle">
                Head Office administrators and regional hub coordinators registered in
                SwiftDrop.
              </p>
            </div>
          </div>

          {isLoadingStaff ? (
            <div className="org-state-box" role="status">
              <span className="org-spinner" aria-hidden="true" />
              <p className="org-state-box__title">Loading staff directory...</p>
            </div>
          ) : staffUnavailableMessage ? (
            <div className="org-state-box" role="status">
              <div className="org-state-box__icon" aria-hidden="true">
                <Users size={22} />
              </div>
              <h3 className="org-state-box__title">Staff Accounts Endpoint Pending</h3>
              <p className="org-state-box__desc">{staffUnavailableMessage}</p>
            </div>
          ) : (
            <div className="org-table-wrapper">
              <table className="org-table" aria-label="Organization staff">
                <thead>
                  <tr>
                    <th scope="col">Staff ID</th>
                    <th scope="col">Full Name</th>
                    <th scope="col">Role</th>
                    <th scope="col">Assigned Branch / Hub</th>
                    <th scope="col">Email</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {staffAccounts.map((staff) => {
                    const isStaffActive = staff.status === 'ACTIVE';
                    return (
                      <tr key={staff.id}>
                        <td>
                          <span className="org-branch-code">{staff.id}</span>
                        </td>
                        <td>
                          <span className="org-branch-name">{staff.fullName}</span>
                        </td>
                        <td>{staff.role}</td>
                        <td>
                          <span className="org-branch-city">
                            <Building2
                              size={13}
                              className="org-branch-city__icon"
                              aria-hidden="true"
                            />
                            <span>{staff.branchName ?? 'Head Office'}</span>
                          </span>
                        </td>
                        <td>
                          <a
                            href={`mailto:${staff.email}`}
                            className="org-branch-contact__item org-branch-contact__email"
                          >
                            <Mail size={12} aria-hidden="true" />
                            <span>{staff.email}</span>
                          </a>
                        </td>
                        <td>
                          <span
                            className={`org-status-badge ${
                              isStaffActive
                                ? 'org-status-badge--active'
                                : 'org-status-badge--inactive'
                            }`}
                          >
                            <span
                              className="org-status-badge__dot"
                              aria-hidden="true"
                            />
                            <span>{staff.status}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Tab 3: Dedicated Audit log view */}
      {activeTab === 'audit-log' && (
        <section
          className="org-directory-card"
          aria-labelledby="full-audit-log-heading"
        >
          <div className="org-directory-card__header">
            <div className="org-directory-card__title-group">
              <h2
                id="full-audit-log-heading"
                className="org-directory-card__title"
              >
                Chronological Security &amp; Configuration Audit Log
              </h2>
              <p className="org-directory-card__subtitle">
                Complete record of Head Office administrative actions, branch status updates,
                and service-area coverage changes.
              </p>
            </div>
          </div>

          {isLoadingAudit ? (
            <div className="org-state-box" role="status">
              <span className="org-spinner" aria-hidden="true" />
              <p className="org-state-box__title">Loading audit log...</p>
            </div>
          ) : auditUnavailableMessage ? (
            <div className="org-state-box" role="status">
              <div className="org-state-box__icon" aria-hidden="true">
                <ShieldCheck size={22} />
              </div>
              <h3 className="org-state-box__title">
                Organization Audit Log Endpoint Pending
              </h3>
              <p className="org-state-box__desc">{auditUnavailableMessage}</p>
              <div className="org-dashboard-contract-note">
                <Info
                  size={15}
                  className="org-dashboard-contract-note__icon"
                  aria-hidden="true"
                />
                <span>
                  Connected to <code>GET /api/v1/organization/audit-logs</code>.
                </span>
              </div>
            </div>
          ) : (
            <div className="org-table-wrapper">
              <table className="org-table" aria-label="Organization audit log">
                <thead>
                  <tr>
                    <th scope="col">Event ID</th>
                    <th scope="col">Timestamp</th>
                    <th scope="col">Actor</th>
                    <th scope="col">Action Performed</th>
                    <th scope="col">Reference</th>
                    <th scope="col">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {auditEvents.map((event) => {
                    const isInactiveOutcome = event.outcome === 'INACTIVE';
                    return (
                      <tr key={event.id}>
                        <td>
                          <span className="org-branch-code">{event.id}</span>
                        </td>
                        <td>
                          <span className="org-coords-mono">{event.timestamp}</span>
                        </td>
                        <td>
                          <span className="org-branch-name">{event.actor}</span>
                        </td>
                        <td>{event.action}</td>
                        <td>
                          <span className="org-coords-mono">
                            {event.referenceCode}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`org-status-badge ${
                              isInactiveOutcome
                                ? 'org-status-badge--inactive'
                                : 'org-status-badge--active'
                            }`}
                          >
                            <span
                              className="org-status-badge__dot"
                              aria-hidden="true"
                            />
                            <span>{event.outcome}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
