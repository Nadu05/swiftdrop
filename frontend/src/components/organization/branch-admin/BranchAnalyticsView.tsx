'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChartColumn,
  CheckCircle2,
  Info,
  RefreshCw,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { getCustomerOrders } from '@/api/services/orders.api';
import {
  dispatchApi,
  type DeliveryExceptionDto,
  type DeliveryJobDto,
  type PickupTaskDto,
  type TransferManifestDto,
} from '@/api/services/dispatch.api';
import type { OrderResponse } from '@/types/order.types';
import { isOrderAuthorizedForBranch } from '@/lib/auth/branch-admin-permissions';
import { useBranchAdminContext } from './useBranchAdminContext';
import BranchScopeBanner from './BranchScopeBanner';

export default function BranchAnalyticsView() {
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
  const [exceptions, setExceptions] = useState<DeliveryExceptionDto[]>([]);
  const [manifests, setManifests] = useState<TransferManifestDto[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalyticsData = useCallback(
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
        const [ordersRes, jobsRes, pickupsRes, excRes, manifestsRes] =
          await Promise.allSettled([
            getCustomerOrders(),
            dispatchApi.getDeliveryJobs({ branchId: effectiveBranchId }),
            dispatchApi.getPickupTasks({ branchId: effectiveBranchId }),
            dispatchApi.getExceptions({ branchId: effectiveBranchId }),
            dispatchApi.listTransferManifests({ branchId: effectiveBranchId }),
          ]);

        if (ordersRes.status === 'fulfilled') {
          setOrders(
            ordersRes.value.filter((o) =>
              isOrderAuthorizedForBranch(o, effectiveBranchId)
            )
          );
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

        if (excRes.status === 'fulfilled') {
          setExceptions(
            excRes.value.filter(
              (e) => !e.branchId || Number(e.branchId) === Number(effectiveBranchId)
            )
          );
        } else {
          setExceptions([]);
        }

        if (manifestsRes.status === 'fulfilled') {
          setManifests(manifestsRes.value);
        } else {
          setManifests([]);
        }

        if (ordersRes.status === 'rejected' && jobsRes.status === 'rejected') {
          setError(
            ordersRes.reason instanceof Error
              ? ordersRes.reason.message
              : 'Unable to load branch operational records for analytics.'
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
    loadAnalyticsData(false);
  }, [loadAnalyticsData]);

  // ── Compute Real Analytics from Live Backend Data ────────────────────────
  const analytics = useMemo(() => {
    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(
      (o) => (o.status || '').toUpperCase() === 'DELIVERED'
    ).length;
    const deliveredJobs = deliveryJobs.filter(
      (j) => (j.status || '').toUpperCase() === 'DELIVERED'
    ).length;
    const deliveredCount = Math.max(deliveredOrders, deliveredJobs);

    const failedOrders = orders.filter((o) =>
      ['DELIVERY_FAILED', 'FAILED'].includes((o.status || '').toUpperCase())
    ).length;
    const failedJobs = deliveryJobs.filter(
      (j) => (j.status || '').toUpperCase() === 'FAILED'
    ).length;
    const failedCount = Math.max(failedOrders, failedJobs, exceptions.length);

    const terminalTotal = deliveredCount + failedCount;
    const deliverySuccessRate =
      terminalTotal > 0
        ? Math.round((deliveredCount / terminalTotal) * 1000) / 10
        : totalOrders > 0
          ? Math.round((deliveredCount / totalOrders) * 1000) / 10
          : null;

    // Incoming vs Outgoing
    const incomingCount =
      orders.filter(
        (o) => Number(o.destinationBranchId) === Number(effectiveBranchId)
      ).length || deliveryJobs.length;
    const outgoingCount =
      orders.filter(
        (o) => Number(o.originBranchId) === Number(effectiveBranchId)
      ).length || pickupTasks.length;

    // Order Status Distribution
    const statusMap = new Map<string, number>();
    for (const o of orders) {
      const st = (o.status || 'UNKNOWN').toUpperCase();
      statusMap.set(st, (statusMap.get(st) || 0) + 1);
    }
    if (orders.length === 0) {
      for (const j of deliveryJobs) {
        const st = (j.status || 'UNKNOWN').toUpperCase();
        statusMap.set(st, (statusMap.get(st) || 0) + 1);
      }
    }

    const statusDistribution = Array.from(statusMap.entries())
      .map(([status, count]) => ({
        status,
        count,
        pct:
          totalOrders > 0
            ? Math.round((count / totalOrders) * 100)
            : deliveryJobs.length > 0
              ? Math.round((count / deliveryJobs.length) * 100)
              : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Daily Order Volume (grouped by YYYY-MM-DD from real createdAt timestamps)
    const dailyMap = new Map<string, number>();
    for (const o of orders) {
      if (!o.createdAt) continue;
      const day = o.createdAt.slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
    }
    const dailyVolumes = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10);

    const maxDailyCount = dailyVolumes.reduce(
      (max, item) => Math.max(max, item.count),
      1
    );

    return {
      totalOrders,
      deliveredCount,
      failedCount,
      deliverySuccessRate,
      incomingCount,
      outgoingCount,
      statusDistribution,
      dailyVolumes,
      maxDailyCount,
      inboundManifestCount: manifests.filter(
        (m) => Number(m.destinationBranchId) === Number(effectiveBranchId)
      ).length,
      outboundManifestCount: manifests.filter(
        (m) => Number(m.originBranchId) === Number(effectiveBranchId)
      ).length,
    };
  }, [orders, deliveryJobs, pickupTasks, exceptions, manifests, effectiveBranchId]);

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
            Branch Administration / Performance &amp; Telemetry
          </p>
          <h1 className="org-page-header__title">Branch Reports &amp; Analytics</h1>
          <p className="org-page-header__subtitle">
            Operational analytics for{' '}
            {branch ? `${branch.name} (${branch.code})` : `Branch #${effectiveBranchId}`}{' '}
            derived from live branch orders, pickup tasks, and delivery jobs.
          </p>
        </div>

        <div className="org-page-header__actions">
          <button
            type="button"
            className="org-btn org-btn--secondary"
            onClick={() => loadAnalyticsData(true)}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? 'org-icon--spinning' : ''}
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Analytics'}</span>
          </button>
        </div>
      </header>

      {/* Top Analytics KPI Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#E5EAF0] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Total Branch Volume
            </span>
            <ChartColumn className="h-4 w-4 text-[#1677E8]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#111827]">
            {isLoading ? '—' : analytics.totalOrders}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">
            Total branch-scoped orders recorded
          </p>
        </div>

        <div className="rounded-xl border border-[#E5EAF0] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Delivery Success Rate
            </span>
            <TrendingUp className="h-4 w-4 text-[#059669]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#059669]">
            {isLoading
              ? '—'
              : analytics.deliverySuccessRate !== null
                ? `${analytics.deliverySuccessRate}%`
                : 'N/A'}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">
            {analytics.deliveredCount} delivered orders
          </p>
        </div>

        <div className="rounded-xl border border-[#E5EAF0] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Failed Deliveries
            </span>
            <XCircle className="h-4 w-4 text-[#DC2626]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#DC2626]">
            {isLoading ? '—' : analytics.failedCount}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">
            {exceptions.length} dispatch exception records
          </p>
        </div>

        <div className="rounded-xl border border-[#E5EAF0] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Incoming vs Outgoing
            </span>
            <CheckCircle2 className="h-4 w-4 text-[#102B50]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#102B50]">
            {isLoading
              ? '—'
              : `${analytics.incomingCount} In / ${analytics.outgoingCount} Out`}
          </p>
          <p className="mt-1 text-xs text-[#64748B]">
            {analytics.inboundManifestCount} inbound ·{' '}
            {analytics.outboundManifestCount} outbound manifests
          </p>
        </div>
      </div>

      {error && (
        <div className="org-state-box org-state-box--error mb-6" role="alert">
          <div className="org-state-box__icon org-state-box__icon--error">
            <AlertCircle size={22} />
          </div>
          <h3 className="org-state-box__title">Unable to load branch analytics</h3>
          <p className="org-state-box__desc">{error}</p>
        </div>
      )}

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 1. Daily Order Volume */}
        <section className="rounded-xl border border-[#E5EAF0] bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-[#111827]">
            Daily Order Volume
          </h2>
          <p className="text-xs text-[#64748B]">
            Branch order intake grouped by creation date (from live Order Service
            records)
          </p>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-[#64748B]">
              Computing daily order volume...
            </div>
          ) : analytics.dailyVolumes.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#64748B]">
              No dated order records available for Branch #{effectiveBranchId}.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {analytics.dailyVolumes.map((item) => {
                const widthPct = Math.max(
                  8,
                  Math.round((item.count / analytics.maxDailyCount) * 100)
                );
                return (
                  <div key={item.date} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-medium text-[#475569]">
                        {item.date}
                      </span>
                      <span className="font-bold text-[#102B50]">
                        {item.count} {item.count === 1 ? 'order' : 'orders'}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F5F7FA]">
                      <div
                        className="h-full rounded-full bg-[#1677E8]"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 2. Order Status Distribution */}
        <section className="rounded-xl border border-[#E5EAF0] bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-[#111827]">
            Order Status Distribution
          </h2>
          <p className="text-xs text-[#64748B]">
            Breakdown of current parcel lifecycle statuses for Branch #
            {effectiveBranchId}
          </p>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-[#64748B]">
              Computing status distribution...
            </div>
          ) : analytics.statusDistribution.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#64748B]">
              No branch orders available to compute status distribution.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {analytics.statusDistribution.map((item) => (
                <div key={item.status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#111827]">
                      {item.status}
                    </span>
                    <span className="text-[#64748B]">
                      <strong className="text-[#102B50]">{item.count}</strong> (
                      {item.pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F5F7FA]">
                    <div
                      className="h-full rounded-full bg-[#102B50]"
                      style={{ width: `${Math.max(4, item.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 3. Incoming vs Outgoing Parcels Comparison */}
        <section className="rounded-xl border border-[#E5EAF0] bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-base font-bold text-[#111827]">
            Incoming versus Outgoing Parcels Balance
          </h2>
          <p className="text-xs text-[#64748B]">
            Comparison of inbound destination parcels against outbound origin
            parcels at this hub
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#1677E8]">
                  <ArrowDownToLine className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-[#64748B]">
                    Incoming Parcels (Destination Hub)
                  </p>
                  <p className="text-xl font-bold text-[#111827]">
                    {isLoading ? '—' : analytics.incomingCount}
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-[#64748B]">
                {analytics.inboundManifestCount} manifests
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#102B50]">
                  <ArrowUpFromLine className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-[#64748B]">
                    Outgoing Parcels (Origin Hub)
                  </p>
                  <p className="text-xl font-bold text-[#111827]">
                    {isLoading ? '—' : analytics.outgoingCount}
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-[#64748B]">
                {analytics.outboundManifestCount} manifests
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Documented Backend Analytics Integration Point */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#DCE5F2] bg-white p-4 text-xs text-[#475569] shadow-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1677E8]" />
        <div>
          <span className="font-semibold text-[#102B50]">
            Backend Analytics Aggregation Contract:
          </span>{' '}
          Metrics above are computed directly from live branch-scoped responses (
          <code>GET /api/v1/orders</code>,{' '}
          <code>GET /api/v1/dispatch/delivery-jobs?branchId={effectiveBranchId}</code>,{' '}
          <code>GET /api/v1/dispatch/pickup-tasks?branchId={effectiveBranchId}</code>, and{' '}
          <code>GET /api/v1/dispatch/exceptions?branchId={effectiveBranchId}</code>). When
          historical time-series aggregation is added to the backend (e.g.{' '}
          <code>
            GET /api/v1/organization/branches/{effectiveBranchId ?? '{branchId}'}/analytics
          </code>
          ), this view is structured to bind directly to the server-side time series without
          UI changes.
        </div>
      </div>
    </div>
  );
}
