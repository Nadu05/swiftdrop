'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Building2,
  Calendar,
  ChartColumn,
  CheckCircle2,
  ClipboardList,
  Clock,
  ExternalLink,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  ShieldCheck,
  Truck,
  Users,
  XCircle,
} from 'lucide-react';
import { getCustomerOrders } from '@/api/services/orders.api';
import {
  dispatchApi,
  type CourierProfileDto,
  type DeliveryJobDto,
  type PickupTaskDto,
  type ReadyForTransferParcelDto,
  type TransferManifestDto,
} from '@/api/services/dispatch.api';
import type { OrderResponse } from '@/types/order.types';
import { isOrderAuthorizedForBranch } from '@/lib/auth/branch-admin-permissions';
import { useBranchAdminContext } from './useBranchAdminContext';
import BranchScopeBanner from './BranchScopeBanner';

function isToday(isoDate?: string | null): boolean {
  if (!isoDate) return false;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatDateTime(isoString?: string | null): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function getOrderStatusBadgeClass(status: string): string {
  const s = (status || '').toUpperCase();
  if (s === 'DELIVERED' || s === 'COMPLETED') {
    return 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]';
  }
  if (
    s === 'IN_TRANSIT' ||
    s === 'OUT_FOR_DELIVERY' ||
    s === 'PICKED_UP' ||
    s === 'ASSIGNED' ||
    s === 'ACCEPTED'
  ) {
    return 'bg-[#EAF3FF] text-[#1677E8] border-[#BFDBFE]';
  }
  if (s === 'DELIVERY_FAILED' || s === 'FAILED' || s === 'CANCELLED') {
    return 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]';
  }
  return 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]';
}

export default function BranchAdminDashboard() {
  const {
    permissions,
    effectiveBranchId,
    branch,
    allBranches,
    serviceAreas,
    isLoadingBranch,
    branchError,
    selectBranchForInspection,
    refreshBranchContext,
  } = useBranchAdminContext();

  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [pickupTasks, setPickupTasks] = useState<PickupTaskDto[]>([]);
  const [deliveryJobs, setDeliveryJobs] = useState<DeliveryJobDto[]>([]);
  const [couriers, setCouriers] = useState<CourierProfileDto[]>([]);
  const [manifests, setManifests] = useState<TransferManifestDto[]>([]);
  const [readyParcels, setReadyParcels] = useState<ReadyForTransferParcelDto[]>([]);

  const [isLoadingOps, setIsLoadingOps] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [opsError, setOpsError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadOperationalData = useCallback(
    async (manual = false) => {
      if (!effectiveBranchId) {
        setIsLoadingOps(false);
        return;
      }

      if (manual) {
        setIsRefreshing(true);
      } else {
        setIsLoadingOps(true);
      }
      setOpsError(null);

      try {
        const [
          ordersRes,
          pickupsRes,
          jobsRes,
          couriersRes,
          manifestsRes,
          readyRes,
        ] = await Promise.allSettled([
          getCustomerOrders(),
          dispatchApi.getPickupTasks({ branchId: effectiveBranchId }),
          dispatchApi.getDeliveryJobs({ branchId: effectiveBranchId }),
          dispatchApi.getCouriers(effectiveBranchId),
          dispatchApi.listTransferManifests({ branchId: effectiveBranchId }),
          dispatchApi.listReadyForTransferParcels({ originBranchId: effectiveBranchId }),
        ]);

        if (ordersRes.status === 'fulfilled') {
          // Enforce strict branch data isolation on returned orders
          const branchOrders = ordersRes.value.filter((o) =>
            isOrderAuthorizedForBranch(o, effectiveBranchId)
          );
          setOrders(branchOrders);
        } else {
          setOrders([]);
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

        if (jobsRes.status === 'fulfilled') {
          setDeliveryJobs(
            jobsRes.value.filter(
              (j) => !j.branchId || Number(j.branchId) === Number(effectiveBranchId)
            )
          );
        } else {
          setDeliveryJobs([]);
        }

        if (couriersRes.status === 'fulfilled') {
          setCouriers(
            couriersRes.value.filter(
              (c) => !c.branchId || Number(c.branchId) === Number(effectiveBranchId)
            )
          );
        } else {
          setCouriers([]);
        }

        if (manifestsRes.status === 'fulfilled') {
          setManifests(
            manifestsRes.value.filter(
              (m) =>
                Number(m.originBranchId) === Number(effectiveBranchId) ||
                Number(m.destinationBranchId) === Number(effectiveBranchId)
            )
          );
        } else {
          setManifests([]);
        }

        if (readyRes.status === 'fulfilled') {
          setReadyParcels(
            readyRes.value.filter(
              (r) => Number(r.originBranchId) === Number(effectiveBranchId)
            )
          );
        } else {
          setReadyParcels([]);
        }

        const allRejected = [
          ordersRes,
          pickupsRes,
          jobsRes,
          couriersRes,
        ].every((r) => r.status === 'rejected');

        if (allRejected) {
          const reason =
            ordersRes.status === 'rejected' && ordersRes.reason instanceof Error
              ? ordersRes.reason.message
              : 'Unable to reach Order and Dispatch microservices for branch metrics.';
          setOpsError(reason);
        } else {
          setLastUpdated(
            new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          );
        }
      } finally {
        setIsLoadingOps(false);
        setIsRefreshing(false);
      }
    },
    [effectiveBranchId]
  );

  useEffect(() => {
    loadOperationalData(false);
  }, [loadOperationalData]);

  const handleManualRefresh = useCallback(async () => {
    await Promise.all([refreshBranchContext(), loadOperationalData(true)]);
  }, [refreshBranchContext, loadOperationalData]);

  const currentFormattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date()),
    []
  );

  // Lookup map of orderId/trackingNumber -> assigned courier name from deliveryJobs & pickupTasks
  const courierByOrderMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const job of deliveryJobs) {
      if (job.courierName) {
        if (job.orderId) map.set(String(job.orderId), job.courierName);
        if (job.trackingNumber) map.set(job.trackingNumber, job.courierName);
      }
    }
    for (const task of pickupTasks) {
      if (task.assignedCourierName) {
        if (task.orderId) map.set(String(task.orderId), task.assignedCourierName);
        if (task.trackingNumber) map.set(task.trackingNumber, task.assignedCourierName);
      }
    }
    return map;
  }, [deliveryJobs, pickupTasks]);

  // ── B. Branch Performance Statistics (8 Summary Cards) ───────────────────
  const stats = useMemo(() => {
    const ordersToday = orders.filter((o) => isToday(o.createdAt)).length;
    const totalBranchOrders = orders.length;

    // Incoming parcels: destination is this branch
    const incomingOrdersCount = orders.filter(
      (o) => Number(o.destinationBranchId) === Number(effectiveBranchId)
    ).length;
    const incomingManifestParcels = manifests
      .filter((m) => Number(m.destinationBranchId) === Number(effectiveBranchId))
      .reduce((sum, m) => sum + (m.expectedParcelCount || 0), 0);
    const incomingParcels = Math.max(
      incomingOrdersCount,
      deliveryJobs.length,
      incomingManifestParcels
    );

    // Outgoing parcels: origin is this branch
    const outgoingOrdersCount = orders.filter(
      (o) => Number(o.originBranchId) === Number(effectiveBranchId)
    ).length;
    const outgoingManifestParcels = manifests
      .filter((m) => Number(m.originBranchId) === Number(effectiveBranchId))
      .reduce((sum, m) => sum + (m.expectedParcelCount || 0), 0);
    const outgoingParcels = Math.max(
      outgoingOrdersCount,
      pickupTasks.length,
      outgoingManifestParcels + readyParcels.length
    );

    // Orders awaiting processing
    const awaitingOrders = orders.filter((o) =>
      ['CREATED', 'CONFIRMED', 'PENDING_ASSIGNMENT'].includes(
        (o.status || '').toUpperCase()
      )
    ).length;
    const unassignedJobs = deliveryJobs.filter(
      (j) => (j.status || '').toUpperCase() === 'UNASSIGNED'
    ).length;
    const ordersAwaitingProcessing = Math.max(awaitingOrders, unassignedJobs);

    // Orders currently in transit
    const inTransitOrders = orders.filter((o) =>
      [
        'ASSIGNED',
        'PICKED_UP',
        'AT_ORIGIN_BRANCH',
        'IN_TRANSIT',
        'AT_DESTINATION_BRANCH',
        'OUT_FOR_DELIVERY',
      ].includes((o.status || '').toUpperCase())
    ).length;
    const inTransitJobs = deliveryJobs.filter((j) =>
      ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(
        (j.status || '').toUpperCase()
      )
    ).length;
    const ordersInTransit = Math.max(inTransitOrders, inTransitJobs);

    // Successfully delivered orders
    const deliveredOrders = orders.filter(
      (o) => (o.status || '').toUpperCase() === 'DELIVERED'
    ).length;
    const deliveredJobs = deliveryJobs.filter(
      (j) => (j.status || '').toUpperCase() === 'DELIVERED'
    ).length;
    const successfullyDelivered = Math.max(deliveredOrders, deliveredJobs);

    // Failed deliveries
    const failedOrders = orders.filter((o) =>
      ['DELIVERY_FAILED', 'FAILED'].includes((o.status || '').toUpperCase())
    ).length;
    const failedJobs = deliveryJobs.filter(
      (j) => (j.status || '').toUpperCase() === 'FAILED'
    ).length;
    const failedDeliveries = Math.max(failedOrders, failedJobs);

    // Active staff members (couriers + known branch staff actors)
    const activeCouriers = couriers.filter(
      (c) => c.status === 'AVAILABLE' || c.status === 'BUSY'
    ).length;
    const totalStaff = couriers.length > 0 ? couriers.length : activeCouriers;

    return {
      ordersToday,
      totalBranchOrders,
      incomingParcels,
      outgoingParcels,
      ordersAwaitingProcessing,
      ordersInTransit,
      successfullyDelivered,
      failedDeliveries,
      activeStaff: activeCouriers,
      totalStaff,
    };
  }, [
    orders,
    effectiveBranchId,
    manifests,
    deliveryJobs,
    pickupTasks,
    readyParcels,
    couriers,
  ]);

  // ── E. Incoming & Outgoing Parcels Breakdown ─────────────────────────────
  const parcelFlowSummary = useMemo(() => {
    const incomingManifests = manifests.filter(
      (m) => Number(m.destinationBranchId) === Number(effectiveBranchId)
    );
    const outgoingManifests = manifests.filter(
      (m) => Number(m.originBranchId) === Number(effectiveBranchId)
    );

    // Incoming:
    const arrivingFromOtherBranches =
      incomingManifests
        .filter((m) => ['ASSIGNED', 'IN_TRANSIT'].includes(m.status))
        .reduce((acc, m) => acc + (m.expectedParcelCount || 0), 0) ||
      orders.filter(
        (o) =>
          Number(o.destinationBranchId) === Number(effectiveBranchId) &&
          !o.sameBranch &&
          o.status === 'IN_TRANSIT'
      ).length;

    const awaitingBranchReceipt =
      incomingManifests.filter((m) => m.status === 'IN_TRANSIT').length +
      orders.filter(
        (o) =>
          Number(o.destinationBranchId) === Number(effectiveBranchId) &&
          ['PICKED_UP', 'IN_TRANSIT'].includes(o.status)
      ).length;

    const receivedByBranch =
      incomingManifests
        .filter((m) =>
          ['RECEIVED', 'RECEIVED_WITH_DISCREPANCY', 'COMPLETED'].includes(m.status)
        )
        .reduce((acc, m) => acc + (m.receivedParcelCount || 0), 0) +
      orders.filter(
        (o) =>
          Number(o.destinationBranchId) === Number(effectiveBranchId) &&
          ['AT_DESTINATION_BRANCH', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status)
      ).length;

    // Outgoing:
    const readyForDispatch =
      readyParcels.length +
      pickupTasks.filter((t) =>
        ['PENDING', 'ASSIGNED', 'AT_BRANCH'].includes(t.status)
      ).length;

    const handedOverToTransport =
      outgoingManifests
        .filter((m) => ['ASSIGNED', 'IN_TRANSIT'].includes(m.status))
        .reduce((acc, m) => acc + (m.expectedParcelCount || 0), 0) +
      pickupTasks.filter((t) => t.status === 'PICKED_UP').length;

    const transferredToAnotherBranch =
      outgoingManifests
        .filter((m) =>
          ['RECEIVED', 'RECEIVED_WITH_DISCREPANCY', 'COMPLETED'].includes(m.status)
        )
        .reduce((acc, m) => acc + (m.receivedParcelCount || m.expectedParcelCount || 0), 0) +
      orders.filter(
        (o) =>
          Number(o.originBranchId) === Number(effectiveBranchId) &&
          !o.sameBranch &&
          ['AT_DESTINATION_BRANCH', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status)
      ).length;

    return {
      incoming: {
        arrivingFromOtherBranches,
        awaitingBranchReceipt,
        receivedByBranch,
      },
      outgoing: {
        readyForDispatch,
        handedOverToTransport,
        transferredToAnotherBranch,
      },
    };
  }, [manifests, effectiveBranchId, orders, readyParcels, pickupTasks]);

  // ── F. Read-Only Dispatcher & Courier Summary ────────────────────────────
  const fleetSummary = useMemo(() => {
    const totalCouriers = couriers.length;
    const availableCouriers = couriers.filter((c) => c.status === 'AVAILABLE').length;
    const busyCouriers = couriers.filter((c) => c.status === 'BUSY').length;
    const offlineCouriers = couriers.filter(
      (c) => c.status === 'OFFLINE' || c.status === 'ON_BREAK'
    ).length;

    // Identify unique dispatcher actors recorded on branch manifests/tasks
    const dispatcherActors = new Set<string>();
    for (const m of manifests) {
      if (m.createdByName) dispatcherActors.add(m.createdByName);
      if (m.originHandoverByName) dispatcherActors.add(m.originHandoverByName);
      if (m.destinationReceivedByName) dispatcherActors.add(m.destinationReceivedByName);
    }

    return {
      totalCouriers,
      availableCouriers,
      busyCouriers,
      offlineCouriers,
      registeredDispatchers: dispatcherActors.size,
    };
  }, [couriers, manifests]);

  const isLoading = isLoadingBranch || isLoadingOps;

  return (
    <div className="org-page">
      {/* Global Admin Inspection Banner / Branch Scope Isolation Indicator */}
      {permissions.canManageAllBranches && (
        <BranchScopeBanner
          branch={branch}
          effectiveBranchId={effectiveBranchId}
          permissions={permissions}
          allBranches={allBranches}
          onSelectBranch={selectBranchForInspection}
          isLoading={isLoadingBranch}
        />
      )}

      {/* A. Branch Welcome Section */}
      <section
        className="mb-6 overflow-hidden rounded-2xl border border-[#1E3A63] bg-gradient-to-r from-[#0B1F38] via-[#102B50] to-[#153969] p-6 text-white shadow-md"
        aria-label="Branch Administrator Welcome Banner"
      >
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1677E8]/25 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#93C5FD] ring-1 ring-[#1677E8]/40">
                <Building2 className="h-3.5 w-3.5" />
                Branch Administration Hub
              </span>

              {branch?.code && (
                <span className="rounded-md bg-white/10 px-2.5 py-0.5 font-mono text-xs font-bold tracking-wide text-white">
                  {branch.code}
                </span>
              )}

              {branch && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    branch.status === 'ACTIVE'
                      ? 'bg-[#10B981]/20 text-[#6EE7B7] ring-1 ring-[#10B981]/40'
                      : 'bg-[#EF4444]/20 text-[#FCA5A5] ring-1 ring-[#EF4444]/40'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      branch.status === 'ACTIVE' ? 'bg-[#34D399]' : 'bg-[#F87171]'
                    }`}
                  />
                  {branch.status === 'ACTIVE' ? 'Operational (ACTIVE)' : 'INACTIVE'}
                </span>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {isLoadingBranch
                  ? 'Loading Assigned Branch...'
                  : branch
                    ? branch.name
                    : effectiveBranchId
                      ? `Branch Hub #${effectiveBranchId}`
                      : 'No Branch Assigned'}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#CBD5E1]">
                {branch ? (
                  <>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-[#60A5FA]" />
                      {branch.addressLine1}
                      {branch.addressLine2 ? `, ${branch.addressLine2}` : ''}, {branch.city}
                    </span>
                    {branch.phone && (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-4 w-4 text-[#60A5FA]" />
                        {branch.phone}
                      </span>
                    )}
                  </>
                ) : (
                  <span>
                    Scoped strictly to authenticated branch association (
                    <code>branchId: {effectiveBranchId ?? 'None'}</code>)
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-[#94A3B8]">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#60A5FA]" />
                {currentFormattedDate}
              </span>
              {lastUpdated && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#60A5FA]" />
                  Synced at {lastUpdated}
                </span>
              )}
              {serviceAreas.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#34D399]" />
                  {serviceAreas.length} Active Service{' '}
                  {serviceAreas.length === 1 ? 'Area' : 'Areas'}
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>

            <Link
              href="/organization/staff"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1677E8] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1265C5]"
            >
              <Users className="h-3.5 w-3.5" />
              Staff Management
            </Link>

            <Link
              href="/organization/orders"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-[#0B1F38]/60 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#0B1F38]"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Branch Orders
            </Link>
          </div>
        </div>
      </section>

      {/* Error State if Backend Services Fail */}
      {(branchError || opsError) && (
        <div className="org-state-box org-state-box--error mb-6" role="alert">
          <div
            className="org-state-box__icon org-state-box__icon--error"
            aria-hidden="true"
          >
            <AlertCircle size={22} />
          </div>
          <p className="org-state-box__title">
            Branch Operational Telemetry Warning
          </p>
          <p className="org-state-box__desc">{branchError || opsError}</p>
          <div className="org-state-box__actions">
            <button
              type="button"
              className="org-btn org-btn--primary"
              onClick={handleManualRefresh}
            >
              <RefreshCw size={14} aria-hidden="true" />
              <span>Retry Live API</span>
            </button>
          </div>
        </div>
      )}

      {/* B. Branch Performance Statistics (8 KPI Cards) */}
      <section aria-label="Branch performance statistics" className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#111827]">
              Branch Performance Statistics
            </h2>
            <p className="text-xs text-[#64748B]">
              Real-time operational metrics scoped to{' '}
              {branch ? `${branch.name} (${branch.code})` : `Branch #${effectiveBranchId}`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Total Orders Today */}
          <div className="rounded-xl border border-[#E5EAF0] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Total Orders Today
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#1677E8]">
                <ClipboardList className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#111827]">
              {isLoading ? '—' : stats.ordersToday}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              {isLoading
                ? 'Loading orders...'
                : `${stats.totalBranchOrders} total branch orders on record`}
            </p>
          </div>

          {/* 2. Incoming Parcels */}
          <div className="rounded-xl border border-[#E5EAF0] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Incoming Parcels
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#1677E8]">
                <ArrowDownToLine className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#111827]">
              {isLoading ? '—' : stats.incomingParcels}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Destination hub deliveries &amp; inbound manifests
            </p>
          </div>

          {/* 3. Outgoing Parcels */}
          <div className="rounded-xl border border-[#E5EAF0] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Outgoing Parcels
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#102B50]">
                <ArrowUpFromLine className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#111827]">
              {isLoading ? '—' : stats.outgoingParcels}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Origin hub pickups &amp; outbound linehaul
            </p>
          </div>

          {/* 4. Orders Awaiting Processing */}
          <div className="rounded-xl border border-[#E5EAF0] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Awaiting Processing
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFFBEB] text-[#D97706]">
                <Clock className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#111827]">
              {isLoading ? '—' : stats.ordersAwaitingProcessing}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Created, confirmed, or pending dispatch
            </p>
          </div>

          {/* 5. Orders Currently in Transit */}
          <div className="rounded-xl border border-[#E5EAF0] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Currently in Transit
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#1677E8]">
                <Truck className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#111827]">
              {isLoading ? '—' : stats.ordersInTransit}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Picked up, linehaul transit, or out for delivery
            </p>
          </div>

          {/* 6. Successfully Delivered Orders */}
          <div className="rounded-xl border border-[#E5EAF0] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Successfully Delivered
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ECFDF5] text-[#059669]">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#111827]">
              {isLoading ? '—' : stats.successfullyDelivered}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Confirmed recipient handoffs
            </p>
          </div>

          {/* 7. Failed Deliveries */}
          <div className="rounded-xl border border-[#E5EAF0] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Failed Deliveries
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FEF2F2] text-[#DC2626]">
                <XCircle className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#111827]">
              {isLoading ? '—' : stats.failedDeliveries}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Delivery exceptions or failed attempts
            </p>
          </div>

          {/* 8. Active Staff Members */}
          <div className="rounded-xl border border-[#E5EAF0] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Active Staff Members
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#102B50]">
                <Users className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#111827]">
              {isLoading ? '—' : stats.activeStaff}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              {isLoading
                ? 'Loading workforce...'
                : `${stats.totalStaff} registered branch couriers`}
            </p>
          </div>
        </div>
      </section>

      {/* E. Incoming & Outgoing Parcels Operational Overview */}
      <section aria-label="Incoming and outgoing parcels overview" className="mb-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Incoming Parcels Card */}
          <div className="rounded-xl border border-[#E5EAF0] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#1677E8]">
                  <ArrowDownToLine className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827]">
                    Incoming Parcels
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Inbound inter-branch transfers and destination hub receipts
                  </p>
                </div>
              </div>
              <Link
                href="/organization/incoming-parcels"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1677E8] hover:text-[#1265C5]"
              >
                View Incoming
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] p-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                  Arriving from Branches
                </span>
                <p className="mt-1.5 text-xl font-bold text-[#102B50]">
                  {isLoading
                    ? '—'
                    : parcelFlowSummary.incoming.arrivingFromOtherBranches}
                </p>
              </div>
              <div className="rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] p-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                  Awaiting Receipt
                </span>
                <p className="mt-1.5 text-xl font-bold text-[#D97706]">
                  {isLoading ? '—' : parcelFlowSummary.incoming.awaitingBranchReceipt}
                </p>
              </div>
              <div className="rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] p-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                  Received by Branch
                </span>
                <p className="mt-1.5 text-xl font-bold text-[#059669]">
                  {isLoading ? '—' : parcelFlowSummary.incoming.receivedByBranch}
                </p>
              </div>
            </div>
          </div>

          {/* Outgoing Parcels Card */}
          <div className="rounded-xl border border-[#E5EAF0] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#102B50]">
                  <ArrowUpFromLine className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827]">
                    Outgoing Parcels
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Origin hub staging, transport handover, and branch transfers
                  </p>
                </div>
              </div>
              <Link
                href="/organization/outgoing-parcels"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1677E8] hover:text-[#1265C5]"
              >
                View Outgoing
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] p-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                  Ready for Dispatch
                </span>
                <p className="mt-1.5 text-xl font-bold text-[#1677E8]">
                  {isLoading ? '—' : parcelFlowSummary.outgoing.readyForDispatch}
                </p>
              </div>
              <div className="rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] p-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                  Handed to Transport
                </span>
                <p className="mt-1.5 text-xl font-bold text-[#102B50]">
                  {isLoading ? '—' : parcelFlowSummary.outgoing.handedOverToTransport}
                </p>
              </div>
              <div className="rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] p-3.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                  Transferred Out
                </span>
                <p className="mt-1.5 text-xl font-bold text-[#059669]">
                  {isLoading
                    ? '—'
                    : parcelFlowSummary.outgoing.transferredToAnotherBranch}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* D. Recent Branch Orders & F. Dispatcher/Courier Overview */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent Branch Orders (2 cols) */}
        <section
          aria-label="Recent branch orders"
          className="rounded-xl border border-[#E5EAF0] bg-white p-6 shadow-sm xl:col-span-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5EAF0] pb-4">
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                Branch Order Overview
              </h3>
              <p className="text-xs text-[#64748B]">
                Recent orders originating from or destined to this branch
              </p>
            </div>
            <Link
              href="/organization/orders"
              className="inline-flex items-center gap-1 rounded-lg bg-[#EAF3FF] px-3 py-1.5 text-xs font-semibold text-[#1677E8] transition hover:bg-[#DBEAFE]"
            >
              Manage All Orders
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="py-10 text-center text-sm text-[#64748B]">
              Loading branch orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="py-10 text-center">
              <Package className="mx-auto h-8 w-8 text-[#94A3B8]" />
              <p className="mt-2 text-sm font-semibold text-[#111827]">
                No orders recorded for this branch yet
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                Orders assigned to Branch #{effectiveBranchId} will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5EAF0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    <th className="pb-2.5 pr-3">Tracking / Order ID</th>
                    <th className="pb-2.5 px-3">Customer</th>
                    <th className="pb-2.5 px-3">Route</th>
                    <th className="pb-2.5 px-3">Status</th>
                    <th className="pb-2.5 px-3">Courier</th>
                    <th className="pb-2.5 pl-3 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EAF0]">
                  {orders.slice(0, 6).map((order) => {
                    const assignedCourier =
                      courierByOrderMap.get(String(order.id)) ||
                      courierByOrderMap.get(order.trackingNumber) ||
                      'Unassigned';
                    return (
                      <tr
                        key={order.id}
                        className="transition hover:bg-[#F5F7FA]"
                      >
                        <td className="py-3 pr-3 font-mono font-semibold text-[#1677E8]">
                          <Link
                            href={`/bookings/${order.id}`}
                            className="inline-flex items-center gap-1 hover:underline"
                          >
                            {order.trackingNumber}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-[#111827]">
                            {order.dropoffContactName || order.pickupContactName}
                          </div>
                          <div className="text-[11px] text-[#64748B]">
                            {order.customerEmail}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-[#111827]">
                          <div className="truncate max-w-[180px]">
                            {order.pickupAddress} → {order.dropoffAddress}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getOrderStatusBadgeClass(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#64748B]">
                          {assignedCourier}
                        </td>
                        <td className="py-3 pl-3 text-right text-[#64748B]">
                          {formatDateTime(order.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* F. Dispatcher & Courier Overview (Read-only summary) */}
        <section
          aria-label="Dispatcher and courier overview"
          className="rounded-xl border border-[#E5EAF0] bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-4">
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                Courier &amp; Dispatcher Summary
              </h3>
              <p className="text-xs text-[#64748B]">
                Read-only branch workforce status
              </p>
            </div>
            <Link
              href="/organization/couriers"
              className="text-xs font-semibold text-[#1677E8] hover:text-[#1265C5]"
            >
              Details →
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] p-3">
              <span className="text-[11px] font-semibold uppercase text-[#64748B]">
                Registered Couriers
              </span>
              <p className="mt-1 text-xl font-bold text-[#111827]">
                {isLoading ? '—' : fleetSummary.totalCouriers}
              </p>
            </div>
            <div className="rounded-lg border border-[#E5EAF0] bg-[#ECFDF5] p-3">
              <span className="text-[11px] font-semibold uppercase text-[#047857]">
                Available
              </span>
              <p className="mt-1 text-xl font-bold text-[#047857]">
                {isLoading ? '—' : fleetSummary.availableCouriers}
              </p>
            </div>
            <div className="rounded-lg border border-[#E5EAF0] bg-[#EAF3FF] p-3">
              <span className="text-[11px] font-semibold uppercase text-[#1677E8]">
                Busy / On Route
              </span>
              <p className="mt-1 text-xl font-bold text-[#1677E8]">
                {isLoading ? '—' : fleetSummary.busyCouriers}
              </p>
            </div>
            <div className="rounded-lg border border-[#E5EAF0] bg-[#F8FAFC] p-3">
              <span className="text-[11px] font-semibold uppercase text-[#64748B]">
                Offline / Break
              </span>
              <p className="mt-1 text-xl font-bold text-[#475569]">
                {isLoading ? '—' : fleetSummary.offlineCouriers}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] px-3.5 py-2.5 text-xs">
            <span className="font-medium text-[#111827]">
              Active Dispatchers Identified
            </span>
            <span className="font-bold text-[#102B50]">
              {isLoading ? '—' : fleetSummary.registeredDispatchers}
            </span>
          </div>

          <div className="mt-4 rounded-lg border border-[#DBEAFE] bg-[#EAF3FF]/60 p-3 text-xs text-[#1E3A8A]">
            <p className="font-semibold text-[#102B50]">
              Operational Role Boundary
            </p>
            <p className="mt-0.5 leading-relaxed text-[#475569]">
              Courier selection, eligibility review, and delivery assignment are
              managed exclusively in the Dispatcher module.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/organization/reports"
              className="inline-flex items-center justify-between rounded-lg border border-[#E5EAF0] px-3.5 py-2 text-xs font-semibold text-[#111827] transition hover:bg-[#F5F7FA]"
            >
              <span className="inline-flex items-center gap-2">
                <ChartColumn className="h-4 w-4 text-[#1677E8]" />
                Branch Reports &amp; Analytics
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-[#64748B]" />
            </Link>
            <Link
              href="/organization/activity"
              className="inline-flex items-center justify-between rounded-lg border border-[#E5EAF0] px-3.5 py-2 text-xs font-semibold text-[#111827] transition hover:bg-[#F5F7FA]"
            >
              <span className="inline-flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#1677E8]" />
                Branch Activity Log
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-[#64748B]" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
