'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  RefreshCw,
  Search,
  SearchX,
  Truck,
} from 'lucide-react';
import { getCustomerOrders } from '@/api/services/orders.api';
import {
  dispatchApi,
  type DeliveryJobDto,
  type PickupTaskDto,
} from '@/api/services/dispatch.api';
import type { OrderResponse } from '@/types/order.types';
import { isOrderAuthorizedForBranch } from '@/lib/auth/branch-admin-permissions';
import { useBranchAdminContext } from './useBranchAdminContext';
import BranchScopeBanner from './BranchScopeBanner';
import OrderDispatchActionModal from './OrderDispatchActionModal';

interface BranchOrderRow {
  id: number | string;
  trackingNumber: string;
  customerName: string;
  customerContact: string;
  pickupLocation: string;
  destinationLocation: string;
  originBranchId: number;
  destinationBranchId: number;
  direction: 'INCOMING' | 'OUTGOING' | 'INTRA_BRANCH';
  status: string;
  createdAt: string;
  assignedCourier: string | null;
}

const PAGE_SIZE = 10;

const ORDER_STATUS_OPTIONS = [
  'ALL',
  'CREATED',
  'CONFIRMED',
  'PENDING_ASSIGNMENT',
  'ASSIGNED',
  'PICKED_UP',
  'AT_ORIGIN_BRANCH',
  'IN_TRANSIT',
  'AT_DESTINATION_BRANCH',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'DELIVERY_FAILED',
  'CANCELLED',
] as const;

type DateFilterPreset = 'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'CUSTOM';

function formatDateTime(isoString?: string | null): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function getStatusBadgeStyle(status: string): string {
  const s = (status || '').toUpperCase();
  if (s === 'DELIVERED' || s === 'COMPLETED') {
    return 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]';
  }
  if (
    s === 'IN_TRANSIT' ||
    s === 'OUT_FOR_DELIVERY' ||
    s === 'PICKED_UP' ||
    s === 'ASSIGNED' ||
    s === 'AT_ORIGIN_BRANCH' ||
    s === 'AT_DESTINATION_BRANCH'
  ) {
    return 'bg-[#EAF3FF] text-[#1677E8] border-[#BFDBFE]';
  }
  if (s === 'DELIVERY_FAILED' || s === 'FAILED' || s === 'CANCELLED') {
    return 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]';
  }
  return 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]';
}

export default function BranchOrdersOverview() {
  const router = useRouter();
  const {
    permissions,
    effectiveBranchId,
    branch,
    allBranches,
    isLoadingBranch,
    selectBranchForInspection,
  } = useBranchAdminContext();

  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [deliveryJobs, setDeliveryJobs] = useState<DeliveryJobDto[]>([]);
  const [pickupTasks, setPickupTasks] = useState<PickupTaskDto[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | string | null>(
    null
  );

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [directionFilter, setDirectionFilter] = useState<
    'ALL' | 'INCOMING' | 'OUTGOING' | 'INTRA_BRANCH'
  >('ALL');
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const loadOrdersData = useCallback(
    async (manual = false) => {
      if (!effectiveBranchId) {
        setIsLoading(false);
        return;
      }

      if (manual) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const [ordersRes, jobsRes, pickupsRes] = await Promise.allSettled([
          getCustomerOrders(),
          dispatchApi.getDeliveryJobs({ branchId: effectiveBranchId }),
          dispatchApi.getPickupTasks({ branchId: effectiveBranchId }),
        ]);

        if (ordersRes.status === 'fulfilled') {
          const scopedOrders = ordersRes.value.filter((o) =>
            isOrderAuthorizedForBranch(o, effectiveBranchId)
          );
          setOrders(scopedOrders);
        } else {
          setOrders([]);
        }

        if (jobsRes.status === 'fulfilled') {
          setDeliveryJobs(
            jobsRes.value.filter(
              (j) => !j.branchId || Number(j.branchId) === Number(effectiveBranchId)
            )
          );
        } else {
          setDeliveryJobs([]);
        }

        if (pickupsRes.status === 'fulfilled') {
          setPickupTasks(
            pickupsRes.value.filter(
              (p) =>
                !p.originBranchId ||
                Number(p.originBranchId) === Number(effectiveBranchId)
            )
          );
        } else {
          setPickupTasks([]);
        }

        if (
          ordersRes.status === 'rejected' &&
          jobsRes.status === 'rejected' &&
          pickupsRes.status === 'rejected'
        ) {
          setError(
            ordersRes.reason instanceof Error
              ? ordersRes.reason.message
              : 'Unable to load branch orders from Order Service.'
          );
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [effectiveBranchId]
  );

  useEffect(() => {
    loadOrdersData(false);
  }, [loadOrdersData]);

  // Build unified, branch-scoped order rows enriched with assigned courier info
  const branchOrderRows = useMemo<BranchOrderRow[]>(() => {
    if (!effectiveBranchId) return [];

    const courierMap = new Map<string, string>();
    for (const job of deliveryJobs) {
      if (job.courierName) {
        if (job.orderId) courierMap.set(String(job.orderId), job.courierName);
        if (job.trackingNumber) courierMap.set(job.trackingNumber, job.courierName);
      }
    }
    for (const task of pickupTasks) {
      if (task.assignedCourierName) {
        if (task.orderId && !courierMap.has(String(task.orderId))) {
          courierMap.set(String(task.orderId), task.assignedCourierName);
        }
        if (task.trackingNumber && !courierMap.has(task.trackingNumber)) {
          courierMap.set(task.trackingNumber, task.assignedCourierName);
        }
      }
    }

    const rows: BranchOrderRow[] = orders.map((o) => {
      const isOrigin = Number(o.originBranchId) === Number(effectiveBranchId);
      const isDest = Number(o.destinationBranchId) === Number(effectiveBranchId);
      const direction: BranchOrderRow['direction'] =
        isOrigin && isDest
          ? 'INTRA_BRANCH'
          : isDest
            ? 'INCOMING'
            : 'OUTGOING';

      return {
        id: o.id,
        trackingNumber: o.trackingNumber,
        customerName: o.dropoffContactName || o.pickupContactName || 'Customer',
        customerContact: o.customerEmail || o.dropoffContactPhone || o.pickupContactPhone || '',
        pickupLocation: o.pickupAddress || '',
        destinationLocation: o.dropoffAddress || '',
        originBranchId: Number(o.originBranchId ?? effectiveBranchId),
        destinationBranchId: Number(o.destinationBranchId ?? effectiveBranchId),
        direction,
        status: o.status,
        createdAt: o.createdAt,
        assignedCourier:
          o.courierName ||
          courierMap.get(String(o.id)) ||
          courierMap.get(o.trackingNumber) ||
          null,
      };
    });

    // Also include any branch delivery jobs whose order was not already in `orders`
    const existingTracking = new Set(rows.map((r) => r.trackingNumber));
    for (const job of deliveryJobs) {
      if (job.trackingNumber && !existingTracking.has(job.trackingNumber)) {
        existingTracking.add(job.trackingNumber);
        rows.push({
          id: job.orderId || job.id,
          trackingNumber: job.trackingNumber,
          customerName: job.recipient?.name || job.recipientName || job.merchantName || 'Customer',
          customerContact: job.recipient?.phone || job.recipientPhone || '',
          pickupLocation: job.pickupAddress || job.pickupCity || 'Origin Hub',
          destinationLocation:
            job.dropoffAddress ||
            job.recipient?.address ||
            job.dropoffCity ||
            'Destination',
          originBranchId: Number(job.branchId || effectiveBranchId),
          destinationBranchId: Number(job.branchId || effectiveBranchId),
          direction: 'INCOMING',
          status: job.status,
          createdAt: job.createdAt || '',
          assignedCourier: job.courierName || null,
        });
      }
    }

    return rows.sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });
  }, [orders, deliveryJobs, pickupTasks, effectiveBranchId]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = new Date();

    return branchOrderRows.filter((row) => {
      if (
        statusFilter !== 'ALL' &&
        row.status.toUpperCase() !== statusFilter.toUpperCase()
      ) {
        return false;
      }

      if (directionFilter !== 'ALL' && row.direction !== directionFilter) {
        return false;
      }

      if (datePreset !== 'ALL' && row.createdAt) {
        const created = new Date(row.createdAt);
        if (!Number.isNaN(created.getTime())) {
          if (datePreset === 'TODAY') {
            const sameDay =
              created.getFullYear() === now.getFullYear() &&
              created.getMonth() === now.getMonth() &&
              created.getDate() === now.getDate();
            if (!sameDay) return false;
          } else if (datePreset === 'LAST_7_DAYS') {
            const diffDays =
              (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays > 7) return false;
          } else if (datePreset === 'LAST_30_DAYS') {
            const diffDays =
              (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays > 30) return false;
          } else if (datePreset === 'CUSTOM') {
            if (customStartDate) {
              const start = new Date(`${customStartDate}T00:00:00`);
              if (created < start) return false;
            }
            if (customEndDate) {
              const end = new Date(`${customEndDate}T23:59:59`);
              if (created > end) return false;
            }
          }
        }
      }

      if (q.length > 0) {
        const matchesId =
          row.trackingNumber.toLowerCase().includes(q) ||
          String(row.id).toLowerCase().includes(q);
        const matchesCustomer =
          row.customerName.toLowerCase().includes(q) ||
          row.customerContact.toLowerCase().includes(q);
        const matchesPickup = row.pickupLocation.toLowerCase().includes(q);
        const matchesDest = row.destinationLocation.toLowerCase().includes(q);
        const matchesCourier = (row.assignedCourier || '')
          .toLowerCase()
          .includes(q);
        return (
          matchesId ||
          matchesCustomer ||
          matchesPickup ||
          matchesDest ||
          matchesCourier
        );
      }

      return true;
    });
  }, [
    branchOrderRows,
    statusFilter,
    directionFilter,
    datePreset,
    customStartDate,
    customEndDate,
    searchQuery,
  ]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    statusFilter,
    directionFilter,
    datePreset,
    customStartDate,
    customEndDate,
    effectiveBranchId,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, currentPage]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setDirectionFilter('ALL');
    setDatePreset('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
    setCurrentPage(1);
  };

  return (
    <div className="org-page">
      <BranchScopeBanner
        branch={branch}
        effectiveBranchId={effectiveBranchId}
        permissions={permissions}
        allBranches={allBranches}
        onSelectBranch={selectBranchForInspection}
        isLoading={isLoadingBranch}
      />

      {/* Page Heading */}
      <header className="org-page-header">
        <div className="org-page-header__titles">
          <p className="org-page-header__eyebrow">
            Branch Administration / Order Operations
          </p>
          <h1 className="org-page-header__title">Branch Order Overview</h1>
          <p className="org-page-header__subtitle">
            Monitor all orders originating from or destined to{' '}
            {branch ? `${branch.name} (${branch.code})` : `Branch #${effectiveBranchId}`}.
            Click any order to open its full booking and tracking details.
          </p>
        </div>

        <div className="org-page-header__actions">
          <button
            type="button"
            className="org-btn org-btn--secondary"
            onClick={() => loadOrdersData(true)}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? 'org-icon--spinning' : ''}
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Orders'}</span>
          </button>
        </div>
      </header>

      {/* Search, Status, Direction & Date Filters */}
      <div className="mb-6 space-y-3 rounded-xl border border-[#E5EAF0] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by tracking ID, order ID, customer, pickup, destination, or courier..."
              className="w-full rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] py-2 pl-9 pr-3 text-xs text-[#111827] placeholder-[#64748B] focus:border-[#1677E8] focus:bg-white focus:outline-none"
            />
          </div>

          <select
            aria-label="Filter by parcel status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] px-3 py-2 text-xs font-medium text-[#111827] focus:border-[#1677E8] focus:outline-none"
          >
            {ORDER_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status === 'ALL' ? 'All Parcel Statuses' : status}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by branch direction"
            value={directionFilter}
            onChange={(e) =>
              setDirectionFilter(
                e.target.value as 'ALL' | 'INCOMING' | 'OUTGOING' | 'INTRA_BRANCH'
              )
            }
            className="rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] px-3 py-2 text-xs font-medium text-[#111827] focus:border-[#1677E8] focus:outline-none"
          >
            <option value="ALL">All Branch Directions</option>
            <option value="INCOMING">Incoming (Destination Hub)</option>
            <option value="OUTGOING">Outgoing (Origin Hub)</option>
            <option value="INTRA_BRANCH">Same-Branch Local</option>
          </select>

          <select
            aria-label="Filter by date range"
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value as DateFilterPreset)}
            className="rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] px-3 py-2 text-xs font-medium text-[#111827] focus:border-[#1677E8] focus:outline-none"
          >
            <option value="ALL">All Dates</option>
            <option value="TODAY">Today</option>
            <option value="LAST_7_DAYS">Last 7 Days</option>
            <option value="LAST_30_DAYS">Last 30 Days</option>
            <option value="CUSTOM">Custom Date Range</option>
          </select>
        </div>

        {datePreset === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-3 border-t border-[#E5EAF0] pt-3 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#64748B]">
              <Calendar className="h-3.5 w-3.5" />
              Date Range:
            </span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] px-2.5 py-1.5 text-xs text-[#111827]"
            />
            <span className="text-[#64748B]">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] px-2.5 py-1.5 text-xs text-[#111827]"
            />
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-[#64748B]">
          <span>
            Showing <strong>{filteredOrders.length}</strong> of{' '}
            <strong>{branchOrderRows.length}</strong> branch orders
          </span>
          {(searchQuery ||
            statusFilter !== 'ALL' ||
            directionFilter !== 'ALL' ||
            datePreset !== 'ALL') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="font-semibold text-[#1677E8] hover:underline"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <section className="org-directory-card" aria-label="Branch orders directory">
        {isLoading ? (
          <div className="org-state-box" role="status">
            <span className="org-spinner" aria-hidden="true" />
            <p className="org-state-box__title">Loading branch orders...</p>
            <p className="org-state-box__desc">
              Fetching orders scoped to Branch #{effectiveBranchId} from Order Service.
            </p>
          </div>
        ) : error ? (
          <div className="org-state-box org-state-box--error" role="alert">
            <div className="org-state-box__icon org-state-box__icon--error">
              <AlertCircle size={22} />
            </div>
            <h3 className="org-state-box__title">Unable to load branch orders</h3>
            <p className="org-state-box__desc">{error}</p>
            <div className="org-state-box__actions">
              <button
                type="button"
                className="org-btn org-btn--primary"
                onClick={() => loadOrdersData(true)}
              >
                <RefreshCw size={14} />
                <span>Retry</span>
              </button>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="org-state-box">
            <div className="org-state-box__icon">
              {branchOrderRows.length === 0 ? (
                <ClipboardList size={22} />
              ) : (
                <SearchX size={22} />
              )}
            </div>
            <h3 className="org-state-box__title">
              {branchOrderRows.length === 0
                ? 'No orders registered for this branch'
                : 'No matching branch orders'}
            </h3>
            <p className="org-state-box__desc">
              {branchOrderRows.length === 0
                ? `Orders with originBranchId or destinationBranchId = ${effectiveBranchId} will appear here.`
                : 'Try adjusting your search query, parcel status, or date filter.'}
            </p>
          </div>
        ) : (
          <>
            <div className="org-table-wrapper">
              <table className="org-table" aria-label="Branch orders table">
                <thead>
                  <tr>
                    <th scope="col">Order / Tracking ID</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Pickup Location</th>
                    <th scope="col">Destination</th>
                    <th scope="col">Parcel Status</th>
                    <th scope="col">Created Date &amp; Time</th>
                    <th scope="col">Assigned Courier</th>
                    <th scope="col" className="org-table__th--actions">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((row) => (
                    <tr
                      key={`${row.id}-${row.trackingNumber}`}
                      onClick={() => setSelectedOrderId(row.id)}
                      className="org-table__row cursor-pointer transition hover:bg-[#F5F7FA]"
                    >
                      <td data-label="Order / Tracking ID">
                        <div className="flex flex-col gap-0.5">
                          <span className="org-branch-code">
                            {row.trackingNumber}
                          </span>
                          <span className="text-[11px] text-[#64748B]">
                            Order #{row.id} · {row.direction}
                          </span>
                        </div>
                      </td>

                      <td data-label="Customer">
                        <div className="font-semibold text-[#111827]">
                          {row.customerName}
                        </div>
                        {row.customerContact && (
                          <div className="text-[11px] text-[#64748B]">
                            {row.customerContact}
                          </div>
                        )}
                      </td>

                      <td data-label="Pickup Location">
                        <div className="max-w-[200px] truncate text-xs text-[#111827]">
                          {row.pickupLocation}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          Origin Hub #{row.originBranchId}
                        </div>
                      </td>

                      <td data-label="Destination">
                        <div className="max-w-[200px] truncate text-xs text-[#111827]">
                          {row.destinationLocation}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          Dest Hub #{row.destinationBranchId}
                        </div>
                      </td>

                      <td data-label="Parcel Status">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getStatusBadgeStyle(
                            row.status
                          )}`}
                        >
                          {row.status}
                        </span>
                      </td>

                      <td data-label="Created Date & Time">
                        <span className="text-xs text-[#475569]">
                          {formatDateTime(row.createdAt)}
                        </span>
                      </td>

                      <td data-label="Assigned Courier">
                        {row.assignedCourier ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#102B50]">
                            <Truck className="h-3.5 w-3.5 text-[#1677E8]" />
                            {row.assignedCourier}
                          </span>
                        ) : (
                          <span className="text-xs text-[#94A3B8]">
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td
                        data-label="Details"
                        className="org-table__td--actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(row.id)}
                          className="org-action-btn"
                        >
                          <Truck size={14} />
                          <span>Manage Order</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5EAF0] px-5 py-3.5 text-xs text-[#64748B]">
              <span>
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> (
                {filteredOrders.length} orders)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E5EAF0] bg-white px-3 py-1.5 font-semibold text-[#111827] disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E5EAF0] bg-white px-3 py-1.5 font-semibold text-[#111827] disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <OrderDispatchActionModal
        isOpen={selectedOrderId !== null}
        orderIdOrTracking={selectedOrderId}
        initialOrder={
          orders.find((o) => String(o.id) === String(selectedOrderId)) ?? null
        }
        effectiveBranchId={effectiveBranchId}
        allBranches={allBranches}
        onClose={() => setSelectedOrderId(null)}
        onUpdated={() => loadOrdersData(true)}
      />
    </div>
  );
}
