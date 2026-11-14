'use client';

import Link from 'next/link';
import { memo, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Inbox,
  Info,
  MapPin,
  Package,
  RefreshCw,
  Search,
  Sparkles,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import type {
  BranchDeliveryQueueStatus,
  BranchDeliveryRequestItem,
} from '@/types/organization.types';
import { MOCK_DELIVERY_ASSIGNED_COURIERS } from '@/api/mock/branch-dashboard.mock';

export interface BranchRecentDeliveryActivityProps {
  branchId: number | null;
  branchName: string | null;
  requests: BranchDeliveryRequestItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  isPreviewMode?: boolean;
}

type ActivityStatusFilter = 'ALL' | BranchDeliveryQueueStatus;

function getStatusBadgeConfig(status: BranchDeliveryQueueStatus) {
  switch (status) {
    case 'UNASSIGNED':
      return {
        label: 'Unassigned',
        className: 'bg-amber-50 text-amber-800 border-amber-200',
        dotClass: 'bg-amber-500',
      };
    case 'READY_FOR_PICKUP':
      return {
        label: 'Ready for Pickup',
        className: 'bg-sky-50 text-sky-800 border-sky-200',
        dotClass: 'bg-sky-500',
      };
    case 'ASSIGNED':
      return {
        label: 'Assigned',
        className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dotClass: 'bg-emerald-500',
      };
    default:
      return {
        label: String(status),
        className: 'bg-slate-100 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-500',
      };
  }
}

/**
 * Section D — Recent Delivery Activity (Interactive Development Preview)
 * Member 04 — Branch Manager Dashboard UI
 *
 * Provides:
 * - Search deliveries by Delivery ID (`orderCode`), location, or customer.
 * - Delivery status filter buttons (All, Unassigned, Ready for Pickup, Assigned) with counts.
 * - Interactive View Details modal showing full delivery payload, timeline, and assignment.
 * - Direct navigation to Courier Assignment (`/organization/console/assign?deliveryId=...`).
 * - Seamless support for both live backend responses and development preview mode.
 */
function BranchRecentDeliveryActivity({
  branchId,
  branchName,
  requests,
  isLoading,
  error,
  onRetry,
  isPreviewMode = false,
}: BranchRecentDeliveryActivityProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ActivityStatusFilter>('ALL');
  const [selectedDelivery, setSelectedDelivery] = useState<BranchDeliveryRequestItem | null>(null);

  // Compute status counts for filter badges
  const statusCounts = useMemo(() => {
    return {
      ALL: requests.length,
      UNASSIGNED: requests.filter((r) => r.assignmentStatus === 'UNASSIGNED').length,
      READY_FOR_PICKUP: requests.filter((r) => r.assignmentStatus === 'READY_FOR_PICKUP').length,
      ASSIGNED: requests.filter((r) => r.assignmentStatus === 'ASSIGNED').length,
    };
  }, [requests]);

  // Filter requests based on search term and status filter
  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      // Status filter
      if (statusFilter !== 'ALL' && item.assignmentStatus !== statusFilter) {
        return false;
      }

      // Search term (Delivery ID, customer name, pickup, dropoff)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const codeMatch = item.orderCode?.toLowerCase().includes(query);
        const idMatch = item.id?.toLowerCase().includes(query);
        const customerMatch = item.customerName?.toLowerCase().includes(query);
        const pickupMatch = item.pickupLocation?.toLowerCase().includes(query);
        const dropoffMatch = item.dropoffLocation?.toLowerCase().includes(query);
        return Boolean(codeMatch || idMatch || customerMatch || pickupMatch || dropoffMatch);
      }

      return true;
    });
  }, [requests, statusFilter, searchTerm]);

  // Limit display to top 8 items in the dashboard overview table
  const displayedItems = filteredRequests.slice(0, 8);

  return (
    <section
      className="org-directory-card org-bm-card"
      aria-labelledby="org-bm-recent-deliveries-heading"
      data-testid="branch-recent-delivery-activity"
    >
      <div className="org-directory-card__header">
        <div className="org-directory-card__title-group">
          <div className="org-dashboard-card__title-row">
            <h2
              id="org-bm-recent-deliveries-heading"
              className="org-directory-card__title"
            >
              Recent Delivery Activity
            </h2>
            {isPreviewMode && (
              <span className="org-dashboard-badge org-dashboard-badge--preview">
                Demonstration Data
              </span>
            )}
            {!error && !isLoading && (
              <span className="org-dashboard-badge org-dashboard-badge--contract">
                {filteredRequests.length} of {requests.length}{' '}
                {requests.length === 1 ? 'request' : 'requests'}
              </span>
            )}
          </div>
          <p className="org-directory-card__subtitle">
            Live delivery requests routed to{' '}
            {branchName ? <strong>{branchName}</strong> : 'your assigned branch'}. Filter by dispatch status, search by delivery ID, or inspect details.
          </p>
        </div>

        <div className="org-dashboard-card__header-actions">
          <Link
            href="/organization/console/requests"
            className="org-dashboard-card__view-all"
            aria-label="Open full Delivery Request Queue"
          >
            <span>Open Delivery Request Queue</span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Interactive Controls: Search & Status Filters */}
      {!isLoading && !error && requests.length > 0 && (
        <div className="org-bm-activity-controls" role="search" aria-label="Filter deliveries">
          <div className="org-bm-search-input-wrap">
            <Search size={14} className="org-bm-search-icon" aria-hidden="true" />
            <input
              type="text"
              className="org-bm-search-input"
              placeholder="Search by delivery ID (e.g. SD-CMB-8401) or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search deliveries by delivery ID, customer, or location"
            />
            {searchTerm && (
              <button
                type="button"
                className="org-bm-search-clear"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search query"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="org-bm-filter-pills" role="tablist" aria-label="Delivery status filters">
            <button
              type="button"
              className={`org-bm-filter-pill ${statusFilter === 'ALL' ? 'org-bm-filter-pill--active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
              role="tab"
              aria-selected={statusFilter === 'ALL'}
            >
              <span>All</span>
              <span className="org-bm-filter-pill__count">{statusCounts.ALL}</span>
            </button>

            <button
              type="button"
              className={`org-bm-filter-pill ${
                statusFilter === 'UNASSIGNED' ? 'org-bm-filter-pill--active org-bm-filter-pill--amber' : ''
              }`}
              onClick={() => setStatusFilter('UNASSIGNED')}
              role="tab"
              aria-selected={statusFilter === 'UNASSIGNED'}
            >
              <span>Unassigned</span>
              <span className="org-bm-filter-pill__count">{statusCounts.UNASSIGNED}</span>
            </button>

            <button
              type="button"
              className={`org-bm-filter-pill ${
                statusFilter === 'READY_FOR_PICKUP' ? 'org-bm-filter-pill--active org-bm-filter-pill--sky' : ''
              }`}
              onClick={() => setStatusFilter('READY_FOR_PICKUP')}
              role="tab"
              aria-selected={statusFilter === 'READY_FOR_PICKUP'}
            >
              <span>Ready for Pickup</span>
              <span className="org-bm-filter-pill__count">{statusCounts.READY_FOR_PICKUP}</span>
            </button>

            <button
              type="button"
              className={`org-bm-filter-pill ${
                statusFilter === 'ASSIGNED' ? 'org-bm-filter-pill--active org-bm-filter-pill--emerald' : ''
              }`}
              onClick={() => setStatusFilter('ASSIGNED')}
              role="tab"
              aria-selected={statusFilter === 'ASSIGNED'}
            >
              <span>Assigned</span>
              <span className="org-bm-filter-pill__count">{statusCounts.ASSIGNED}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="org-state-box" role="status" aria-live="polite">
          <div className="org-spinner" aria-hidden="true" />
          <p className="org-state-box__title">
            Loading recent branch delivery activity...
          </p>
          <p className="org-state-box__desc">
            Fetching branch-routed delivery requests from{' '}
            <code className="org-inline-code">
              GET /api/v1/organization/branches/{branchId ?? '{branchId}'}/delivery-requests
            </code>
          </p>
        </div>
      ) : error ? (
        <div className="org-state-box org-dashboard-unavailable" role="status">
          <div className="org-state-box__icon" aria-hidden="true">
            <Inbox size={22} />
          </div>
          <h3 className="org-state-box__title">
            Branch Delivery Queue Endpoint Pending
          </h3>
          <p className="org-state-box__desc">{error}</p>
          <div className="org-dashboard-contract-note">
            <Info
              size={15}
              className="org-dashboard-contract-note__icon"
              aria-hidden="true"
            />
            <span>
              <strong>Integration Boundary Ready:</strong> No fake delivery records
              are fabricated on the frontend. Once Order &amp; Dispatch Services
              expose{' '}
              <code className="org-inline-code">
                GET /api/v1/organization/branches/&#123;branchId&#125;/delivery-requests
              </code>
              , recent branch delivery activity will populate here automatically.
            </span>
          </div>
          <div className="org-state-box__actions">
            <button
              type="button"
              className="org-btn org-btn--secondary"
              onClick={onRetry}
            >
              <RefreshCw size={14} aria-hidden="true" />
              <span>Retry Queue Sync</span>
            </button>
            <Link
              href="/organization/console/requests"
              className="org-btn org-btn--primary"
            >
              <span>Open Delivery Request Queue</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : requests.length === 0 ? (
        <div className="org-state-box" role="status">
          <div className="org-state-box__icon" aria-hidden="true">
            <Inbox size={22} />
          </div>
          <h3 className="org-state-box__title">
            No Recent Delivery Requests
          </h3>
          <p className="org-state-box__desc">
            There are currently no incoming or active delivery requests routed to{' '}
            {branchName || 'this branch'}. New orders resolved to this branch&apos;s
            service area will appear here automatically.
          </p>
          <div className="org-state-box__actions">
            <Link
              href="/organization/console/requests"
              className="org-btn org-btn--secondary"
            >
              <span>Go to Delivery Request Queue</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="org-state-box org-state-box--no-match" role="status">
          <Search size={22} className="text-slate-400" aria-hidden="true" />
          <h3 className="org-state-box__title">No Deliveries Matching Filter</h3>
          <p className="org-state-box__desc">
            No requests matched your query &ldquo;{searchTerm}&rdquo; with status &ldquo;{statusFilter}&rdquo;.
          </p>
          <button
            type="button"
            className="org-btn org-btn--secondary"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('ALL');
            }}
          >
            <span>Reset Search &amp; Filters</span>
          </button>
        </div>
      ) : (
        <div className="org-table-wrapper">
          <table
            className="org-table"
            aria-label="Recent branch delivery activity table"
          >
            <thead>
              <tr>
                <th scope="col">Delivery ID</th>
                <th scope="col">Pickup Location</th>
                <th scope="col">Drop-Off Location</th>
                <th scope="col">Status</th>
                <th scope="col">Request Time</th>
                <th scope="col" className="org-table__th--actions">
                  Assignment &amp; Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedItems.map((item) => {
                const badge = getStatusBadgeConfig(item.assignmentStatus);
                const isUnassigned = item.assignmentStatus === 'UNASSIGNED';
                const assignedCourier =
                  MOCK_DELIVERY_ASSIGNED_COURIERS[item.id] ||
                  (item.assignmentStatus === 'ASSIGNED' ? 'Assigned Courier' : null);

                const assignUrl = `/organization/console/assign?deliveryId=${encodeURIComponent(
                  item.orderCode || item.id
                )}${branchId ? `&branchId=${branchId}` : ''}`;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    onClick={() => setSelectedDelivery(item)}
                    title="Click to view full delivery details"
                  >
                    <td data-label="Delivery ID">
                      <div className="org-branch-name-cell">
                        <span className="org-branch-code font-mono font-bold text-blue-700">
                          {item.orderCode}
                        </span>
                        {item.customerName && (
                          <span className="org-branch-coords font-medium text-slate-700">
                            {item.customerName}
                          </span>
                        )}
                        {item.parcelSummary && (
                          <span className="text-[11px] text-slate-500">
                            {item.parcelSummary}
                          </span>
                        )}
                      </div>
                    </td>

                    <td data-label="Pickup Location">
                      <span className="org-bm-location-cell">
                        <MapPin
                          size={13}
                          className="text-blue-600 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="line-clamp-1">{item.pickupLocation}</span>
                      </span>
                    </td>

                    <td data-label="Drop-Off Location">
                      <span className="org-bm-location-cell">
                        <MapPin
                          size={13}
                          className="text-slate-400 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="line-clamp-1">{item.dropoffLocation}</span>
                      </span>
                    </td>

                    <td data-label="Status">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${badge.dotClass}`}
                            aria-hidden="true"
                          />
                          <span>{badge.label}</span>
                        </span>
                        {assignedCourier && (
                          <span className="block text-[11px] font-medium text-slate-600">
                            {assignedCourier}
                          </span>
                        )}
                      </div>
                    </td>

                    <td data-label="Request Time">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 whitespace-nowrap">
                        <Clock size={12} aria-hidden="true" />
                        <span>{item.requestTime}</span>
                      </span>
                    </td>

                    <td
                      data-label="Actions"
                      className="org-table__td--actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="org-row-actions">
                        <button
                          type="button"
                          className="org-action-btn"
                          onClick={() => setSelectedDelivery(item)}
                          title={`View details for ${item.orderCode}`}
                        >
                          <Eye size={13} aria-hidden="true" />
                          <span>Details</span>
                        </button>

                        {isUnassigned ? (
                          <Link
                            href={assignUrl}
                            className="org-action-btn org-action-btn--primary"
                            title={`Assign courier to ${item.orderCode}`}
                          >
                            <UserPlus size={13} aria-hidden="true" />
                            <span>Assign</span>
                          </Link>
                        ) : (
                          <Link
                            href={assignUrl}
                            className="org-action-btn"
                            title={`Inspect assignment for ${item.orderCode}`}
                          >
                            <span>Inspect</span>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Expandable Delivery Record Details Modal Dialog */}
      {selectedDelivery && (
        <div
          className="org-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delivery-modal-title"
          onClick={() => setSelectedDelivery(null)}
        >
          <div
            className="org-modal-box max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="org-modal-header">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-blue-600" aria-hidden="true" />
                <h3 id="delivery-modal-title" className="text-base font-bold text-slate-900">
                  Delivery Details · {selectedDelivery.orderCode}
                </h3>
              </div>
              <button
                type="button"
                className="org-modal-close"
                onClick={() => setSelectedDelivery(null)}
                aria-label="Close delivery details modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="org-modal-body space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase">Status</span>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        getStatusBadgeConfig(selectedDelivery.assignmentStatus).className
                      }`}
                    >
                      <span>{getStatusBadgeConfig(selectedDelivery.assignmentStatus).label}</span>
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500 font-semibold uppercase">Requested</span>
                  <p className="text-xs font-semibold text-slate-800 mt-1">
                    {selectedDelivery.requestTime}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-600 block mb-1">
                    CUSTOMER &amp; PARCEL
                  </span>
                  <p className="text-sm font-bold text-slate-900">
                    {selectedDelivery.customerName || 'General Customer'}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {selectedDelivery.parcelSummary || 'Standard package'}
                  </p>
                  {selectedDelivery.deliveryFeeLabel && (
                    <p className="text-xs font-semibold text-blue-700 mt-1">
                      Delivery Fee: {selectedDelivery.deliveryFeeLabel} ({selectedDelivery.deliveryTypeLabel || 'Standard'})
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin size={15} className="text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase">Pickup Location</span>
                      <p className="text-xs text-slate-900 font-medium">{selectedDelivery.pickupLocation}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase">Drop-Off Destination</span>
                      <p className="text-xs text-slate-900 font-medium">{selectedDelivery.dropoffLocation}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-100">
                  <span className="text-xs font-bold text-blue-900 block mb-0.5">
                    COURIER ASSIGNMENT
                  </span>
                  <p className="text-xs text-slate-700">
                    {MOCK_DELIVERY_ASSIGNED_COURIERS[selectedDelivery.id] ? (
                      <>
                        Assigned Courier:{' '}
                        <strong>{MOCK_DELIVERY_ASSIGNED_COURIERS[selectedDelivery.id]}</strong>
                      </>
                    ) : selectedDelivery.assignmentStatus === 'UNASSIGNED' ? (
                      <span className="text-amber-800 font-medium">
                        Awaiting courier assignment. Eligible couriers available in Colombo Central Branch roster.
                      </span>
                    ) : (
                      'Assigned to branch courier'
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="org-modal-footer flex items-center justify-between gap-3">
              <button
                type="button"
                className="org-btn org-btn--secondary"
                onClick={() => setSelectedDelivery(null)}
              >
                <span>Close</span>
              </button>

              <Link
                href={`/organization/console/assign?deliveryId=${encodeURIComponent(
                  selectedDelivery.orderCode || selectedDelivery.id
                )}${branchId ? `&branchId=${branchId}` : ''}`}
                className="org-btn org-btn--primary"
                onClick={() => setSelectedDelivery(null)}
              >
                <UserPlus size={14} aria-hidden="true" />
                <span>Go to Courier Assignment</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default memo(BranchRecentDeliveryActivity);
