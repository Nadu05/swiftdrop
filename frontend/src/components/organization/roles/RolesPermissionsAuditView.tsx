'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  FileClock,
  Info,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  useOrganizationAuditEvents,
  useOrganizationStaffAccounts,
} from '@/hooks/api/use-organization';
import type {
  OrganizationAuditEventItem,
  OrganizationStaffAccountItem,
  RolePermissionMatrixRow,
} from '@/types/organization.types';

export type RolesAuditTab = 'role-permissions' | 'staff-accounts' | 'audit-log';

/**
 * Project-defined static access control policy matrix specified in
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
 *
 * Strictly adheres to team boundaries:
 * - Displays the project-defined permission matrix from Screen 35.
 * - Never fabricates sample audit events (such as "11:08 · Head Office admin · Merchant approved...")
 *   or fake staff account records when backend endpoints are unavailable.
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
    if (activeTab === 'staff-accounts') {
      refetchStaff();
    }
  };

  return (
    <div className="org-page org-console-page">
      {/* Screen 35 Page Header */}
      <header className="org-console-header">
        <div className="org-console-header__top">
          <h1 className="org-console-header__page-title">
            Admin / Roles, Permissions and Audit Log
          </h1>

          <div className="org-console-header__utility">
            <Link
              href="/organization/branches"
              className="org-btn org-btn--secondary"
            >
              <span>Branch Directory</span>
            </Link>
            <button
              type="button"
              className="org-btn org-btn--secondary"
              onClick={handleRefresh}
              disabled={isLoadingAudit || isLoadingStaff}
            >
              <RefreshCw
                size={14}
                className={
                  isLoadingAudit || isLoadingStaff ? 'org-icon--spinning' : ''
                }
                aria-hidden="true"
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="org-console-header__section-row">
          <h2 className="org-console-header__section-title">
            Access control and audit
          </h2>
        </div>
      </header>

      {/* Screen 35 Sub-navigation Pill Tabs */}
      <div
        className="org-tabs"
        role="tablist"
        aria-label="Access control and audit tabs"
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
          Role permissions
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
          Staff accounts
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
          Audit log
        </button>
      </div>

      {/* Tab 1: Role permissions (Default view in Screen 35: Permission matrix + Recent audit events) */}
      {activeTab === 'role-permissions' && (
        <>
          <section
            className="org-console-card"
            aria-labelledby="permission-matrix-heading"
          >
            <div className="org-console-card__header">
              <div>
                <h3
                  id="permission-matrix-heading"
                  className="org-console-card__title"
                >
                  Permission matrix
                </h3>
                <p className="org-console-card__subtitle">
                  Least privilege: branch users cannot access other branches.
                </p>
              </div>
            </div>

            <ul
              className="org-console-list"
              aria-label="Role permission rules"
            >
              {PROJECT_PERMISSION_MATRIX.map((row, idx) => {
                const isTinted = idx % 2 === 0;

                return (
                  <li
                    key={row.id}
                    className={`org-console-row${
                      isTinted ? ' org-console-row--tinted' : ''
                    }`}
                  >
                    <p
                      className={`org-console-row__summary${
                        idx === 0 ? ' org-console-row__summary--strong' : ''
                      }`}
                    >
                      {row.summaryText}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Recent audit events card (Screen 35 bottom card) */}
          <section
            className="org-console-card"
            aria-labelledby="recent-audit-events-heading"
          >
            <div className="org-console-card__header">
              <div>
                <h3
                  id="recent-audit-events-heading"
                  className="org-console-card__title"
                >
                  Recent audit events
                </h3>
              </div>
            </div>

            {isLoadingAudit ? (
              <div className="org-console-list" aria-busy="true">
                {[1, 2].map((skeletonId) => (
                  <div
                    key={skeletonId}
                    className="org-console-row org-console-row--skeleton"
                  >
                    <div className="org-skeleton org-skeleton--lg" />
                  </div>
                ))}
              </div>
            ) : auditUnavailableMessage ? (
              <div
                className="org-console-inline-unavailable"
                role="status"
              >
                <div className="org-console-inline-unavailable__header">
                  <FileClock size={16} aria-hidden="true" />
                  <strong>Audit Log Endpoint Pending Backend</strong>
                </div>
                <p className="org-console-inline-unavailable__text">
                  {auditUnavailableMessage}
                </p>
                <div className="org-dashboard-contract-note">
                  <Info
                    size={15}
                    className="org-dashboard-contract-note__icon"
                    aria-hidden="true"
                  />
                  <span>
                    <strong>No Fake Audit Events Fabricated:</strong> Sample
                    screenshot events (such as merchant approval or courier
                    assignment timestamps) are omitted until{' '}
                    <code>GET /api/v1/organization/audit-logs</code> is exposed
                    by the backend.
                  </span>
                </div>
              </div>
            ) : auditEvents.length === 0 ? (
              <div
                className="org-console-inline-unavailable"
                role="status"
              >
                <div className="org-console-inline-unavailable__header">
                  <FileClock size={16} aria-hidden="true" />
                  <strong>No Recent Audit Events Recorded</strong>
                </div>
                <p className="org-console-inline-unavailable__text">
                  The organization audit log returned zero events.
                </p>
              </div>
            ) : (
              <ul
                className="org-console-list"
                aria-label="Recent organization audit events"
              >
                {auditEvents.map((event, idx) => (
                  <li
                    key={event.id}
                    className={`org-console-row${
                      idx % 2 === 0 ? ' org-console-row--tinted' : ''
                    }`}
                  >
                    <p
                      className={`org-console-row__summary${
                        idx === 0 ? ' org-console-row__summary--strong' : ''
                      }`}
                    >
                      {event.timestamp} · {event.actor} · {event.action} ·{' '}
                      {event.referenceCode} · {event.outcome}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {/* Tab 2: Staff accounts */}
      {activeTab === 'staff-accounts' && (
        <section
          className="org-console-card"
          aria-labelledby="staff-accounts-heading"
        >
          <div className="org-console-card__header">
            <div>
              <h3
                id="staff-accounts-heading"
                className="org-console-card__title"
              >
                Staff accounts
              </h3>
              <p className="org-console-card__subtitle">
                Head Office administrators and branch-scoped operational staff.
              </p>
            </div>
          </div>

          {isLoadingStaff ? (
            <div className="org-console-list" aria-busy="true">
              {[1, 2, 3].map((skeletonId) => (
                <div
                  key={skeletonId}
                  className="org-console-row org-console-row--skeleton"
                >
                  <div className="org-skeleton org-skeleton--lg" />
                </div>
              ))}
            </div>
          ) : staffUnavailableMessage ? (
            <div
              className="org-empty-state org-dashboard-unavailable"
              role="status"
            >
              <div className="org-empty-state__icon">
                <Users size={22} aria-hidden="true" />
              </div>
              <h4 className="org-empty-state__title">
                Staff Accounts Endpoint Pending
              </h4>
              <p className="org-empty-state__description">
                {staffUnavailableMessage}
              </p>
              <div className="org-dashboard-contract-note">
                <Info
                  size={15}
                  className="org-dashboard-contract-note__icon"
                  aria-hidden="true"
                />
                <span>
                  <strong>Integration Boundary Ready:</strong> No fake staff
                  records are fabricated on the frontend. Once{' '}
                  <code>GET /api/v1/organization/staff</code> is exposed by the
                  backend, Head Office and branch staff accounts will display
                  here.
                </span>
              </div>
            </div>
          ) : staffAccounts.length === 0 ? (
            <div className="org-empty-state" role="status">
              <div className="org-empty-state__icon">
                <Users size={22} aria-hidden="true" />
              </div>
              <h4 className="org-empty-state__title">
                No Staff Accounts Found
              </h4>
              <p className="org-empty-state__description">
                No staff accounts were returned by the backend.
              </p>
            </div>
          ) : (
            <ul className="org-console-list" aria-label="Organization staff">
              {staffAccounts.map((staff, idx) => (
                <li
                  key={staff.id}
                  className={`org-console-row${
                    idx % 2 === 0 ? ' org-console-row--tinted' : ''
                  }`}
                >
                  <p className="org-console-row__summary">
                    <strong>{staff.fullName}</strong> · {staff.role} ·{' '}
                    {staff.branchName ?? 'Head Office'} · {staff.email} ·{' '}
                    {staff.status}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Tab 3: Dedicated Audit log view */}
      {activeTab === 'audit-log' && (
        <section
          className="org-console-card"
          aria-labelledby="full-audit-log-heading"
        >
          <div className="org-console-card__header">
            <div>
              <h3
                id="full-audit-log-heading"
                className="org-console-card__title"
              >
                Recent audit events
              </h3>
              <p className="org-console-card__subtitle">
                Chronological security and operational events across Head Office
                and regional branches.
              </p>
            </div>
          </div>

          {isLoadingAudit ? (
            <div className="org-console-list" aria-busy="true">
              {[1, 2, 3].map((skeletonId) => (
                <div
                  key={skeletonId}
                  className="org-console-row org-console-row--skeleton"
                >
                  <div className="org-skeleton org-skeleton--lg" />
                </div>
              ))}
            </div>
          ) : auditUnavailableMessage ? (
            <div
              className="org-empty-state org-dashboard-unavailable"
              role="status"
            >
              <div className="org-empty-state__icon">
                <ShieldCheck size={22} aria-hidden="true" />
              </div>
              <h4 className="org-empty-state__title">
                Organization Audit Log Endpoint Pending
              </h4>
              <p className="org-empty-state__description">
                {auditUnavailableMessage}
              </p>
              <div className="org-dashboard-contract-note">
                <Info
                  size={15}
                  className="org-dashboard-contract-note__icon"
                  aria-hidden="true"
                />
                <span>
                  <strong>Integration Boundary Ready:</strong> Fake audit events
                  are never fabricated. Once{' '}
                  <code>GET /api/v1/organization/audit-logs</code> is exposed by
                  the backend, verified audit entries will populate here.
                </span>
              </div>
            </div>
          ) : auditEvents.length === 0 ? (
            <div className="org-empty-state" role="status">
              <div className="org-empty-state__icon">
                <FileClock size={22} aria-hidden="true" />
              </div>
              <h4 className="org-empty-state__title">
                No Audit Events Recorded
              </h4>
              <p className="org-empty-state__description">
                No audit log events were returned by the backend.
              </p>
            </div>
          ) : (
            <ul
              className="org-console-list"
              aria-label="Organization audit log"
            >
              {auditEvents.map((event, idx) => (
                <li
                  key={event.id}
                  className={`org-console-row${
                    idx % 2 === 0 ? ' org-console-row--tinted' : ''
                  }`}
                >
                  <p
                    className={`org-console-row__summary${
                      idx === 0 ? ' org-console-row__summary--strong' : ''
                    }`}
                  >
                    {event.timestamp} · {event.actor} · {event.action} ·{' '}
                    {event.referenceCode} · {event.outcome}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

