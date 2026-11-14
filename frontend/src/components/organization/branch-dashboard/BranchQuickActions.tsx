'use client';

import Link from 'next/link';
import { memo } from 'react';
import {
  ArrowRight,
  Building2,
  ClipboardList,
  RefreshCw,
  Truck,
  UserPlus,
} from 'lucide-react';
import type { BranchDeliveryRequestItem } from '@/types/organization.types';

export interface BranchQuickActionsProps {
  branchId: number | null;
  firstUnassignedDelivery: BranchDeliveryRequestItem | null;
  canAccessHeadOffice?: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

/**
 * Section G — Role-Aware Quick Actions
 * Member 04 — Branch Manager Dashboard UI
 *
 * Provides fast operational shortcuts restricted strictly to actions permitted
 * for the Branch Manager role:
 * - Open Delivery Request Queue
 * - Open Courier Roster
 * - Review an Unassigned Delivery
 * - Open Branch Details (Read-Only Branch Information section, or Head Office branch page only if authorized)
 * - Refresh Dashboard
 *
 * Head Office administrative actions (such as creating, editing, or deactivating branches)
 * are intentionally excluded for Branch Managers.
 */
function BranchQuickActions({
  branchId,
  firstUnassignedDelivery,
  canAccessHeadOffice = false,
  isLoading,
  isRefreshing,
  onRefresh,
}: BranchQuickActionsProps) {
  const assignHref = firstUnassignedDelivery
    ? `/organization/console/assign?deliveryId=${encodeURIComponent(
        firstUnassignedDelivery.orderCode || firstUnassignedDelivery.id
      )}${branchId ? `&branchId=${branchId}` : ''}`
    : branchId
      ? `/organization/console/assign?branchId=${branchId}`
      : '/organization/console/assign';

  const branchDetailsHref =
    canAccessHeadOffice && branchId
      ? `/organization/branches/${branchId}`
      : '#branch-information';

  return (
    <section
      className="org-directory-card org-bm-quick-actions"
      aria-labelledby="org-bm-quick-actions-heading"
    >
      <div className="org-directory-card__header">
        <div className="org-directory-card__title-group">
          <div className="org-dashboard-card__title-row">
            <h2
              id="org-bm-quick-actions-heading"
              className="org-directory-card__title"
            >
              Quick Actions
            </h2>
            <span className="org-dashboard-badge org-dashboard-badge--contract">
              Branch Manager Scope
            </span>
          </div>
          <p className="org-directory-card__subtitle">
            Direct operational shortcuts for your assigned branch workflow.
          </p>
        </div>
      </div>

      <div className="org-bm-quick-actions__grid">
        {/* 1. Open Delivery Request Queue */}
        <Link
          href="/organization/console/requests"
          className="org-bm-quick-action-tile"
        >
          <div
            className="org-bm-quick-action-tile__icon bg-blue-50 text-blue-600"
            aria-hidden="true"
          >
            <ClipboardList size={18} />
          </div>
          <div className="org-bm-quick-action-tile__content">
            <span className="org-bm-quick-action-tile__title">
              Open Delivery Request Queue
            </span>
            <span className="org-bm-quick-action-tile__desc">
              Inspect incoming branch-routed requests
            </span>
          </div>
          <ArrowRight
            size={15}
            className="org-bm-quick-action-tile__arrow"
            aria-hidden="true"
          />
        </Link>

        {/* 2. Review an Unassigned Delivery */}
        <Link
          href={assignHref}
          className="org-bm-quick-action-tile org-bm-quick-action-tile--highlight"
        >
          <div
            className="org-bm-quick-action-tile__icon bg-amber-50 text-amber-600"
            aria-hidden="true"
          >
            <UserPlus size={18} />
          </div>
          <div className="org-bm-quick-action-tile__content">
            <span className="org-bm-quick-action-tile__title">
              Review an Unassigned Delivery
            </span>
            <span className="org-bm-quick-action-tile__desc">
              {firstUnassignedDelivery
                ? `Next in queue: ${firstUnassignedDelivery.orderCode}`
                : 'Open courier assignment workspace'}
            </span>
          </div>
          <ArrowRight
            size={15}
            className="org-bm-quick-action-tile__arrow"
            aria-hidden="true"
          />
        </Link>

        {/* 3. Open Courier Roster */}
        <Link
          href="/organization/console/couriers"
          className="org-bm-quick-action-tile"
        >
          <div
            className="org-bm-quick-action-tile__icon bg-emerald-50 text-emerald-600"
            aria-hidden="true"
          >
            <Truck size={18} />
          </div>
          <div className="org-bm-quick-action-tile__content">
            <span className="org-bm-quick-action-tile__title">
              Open Courier Roster
            </span>
            <span className="org-bm-quick-action-tile__desc">
              View branch couriers, availability &amp; active jobs
            </span>
          </div>
          <ArrowRight
            size={15}
            className="org-bm-quick-action-tile__arrow"
            aria-hidden="true"
          />
        </Link>

        {/* 4. Open Branch Details / Information */}
        <Link
          href={branchDetailsHref}
          className="org-bm-quick-action-tile"
        >
          <div
            className="org-bm-quick-action-tile__icon bg-indigo-50 text-indigo-600"
            aria-hidden="true"
          >
            <Building2 size={18} />
          </div>
          <div className="org-bm-quick-action-tile__content">
            <span className="org-bm-quick-action-tile__title">
              Open Branch Details
            </span>
            <span className="org-bm-quick-action-tile__desc">
              {canAccessHeadOffice
                ? 'Inspect full branch record in directory'
                : 'View read-only branch & service-area profile'}
            </span>
          </div>
          <ArrowRight
            size={15}
            className="org-bm-quick-action-tile__arrow"
            aria-hidden="true"
          />
        </Link>

        {/* 5. Refresh Dashboard */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading || isRefreshing}
          className="org-bm-quick-action-tile org-bm-quick-action-tile--button"
        >
          <div
            className="org-bm-quick-action-tile__icon bg-slate-100 text-slate-700"
            aria-hidden="true"
          >
            <RefreshCw
              size={18}
              className={isRefreshing ? 'org-icon--spinning' : undefined}
            />
          </div>
          <div className="org-bm-quick-action-tile__content">
            <span className="org-bm-quick-action-tile__title">
              {isRefreshing ? 'Refreshing Dashboard...' : 'Refresh Dashboard'}
            </span>
            <span className="org-bm-quick-action-tile__desc">
              Re-synchronize branch queue, roster &amp; status
            </span>
          </div>
        </button>
      </div>
    </section>
  );
}

export default memo(BranchQuickActions);

