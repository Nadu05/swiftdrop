'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  Package,
  Clock,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Store,
  Building2,
  Users,
  RefreshCw,
  ArrowUpRight,
  Activity,
  ChartColumn,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getCustomerOrders } from '@/api/services/orders.api';
import { getAdminStats } from '@/api/services/admin.api';
import {
  fetchMerchantApprovalSummaryMetrics,
  getBranches,
} from '@/api/services/organization.api';
import {
  normalizeRoleName,
  resolvePrimaryRole,
  ROLE_LABELS,
} from '@/lib/auth/role-resolver';
import type { DeliveryOrder } from '@/types/order.types';
import type { AdminDashboardStats } from '@/types/admin.types';
import type {
  BranchResponse,
  MerchantApprovalSummaryResponse,
} from '@/types/organization.types';

const PENDING_DISPATCH_STATUSES = new Set([
  'CREATED',
  'CONFIRMED',
  'BOOKED',
  'PENDING_ASSIGNMENT',
  'PICKUP_ASSIGNED',
]);

const IN_TRANSIT_STATUSES = new Set([
  'COURIER_ASSIGNED',
  'PICKED_UP',
  'AT_ORIGIN_BRANCH',
  'AT_ORIGIN_HUB',
  'IN_TRANSIT',
  'AT_DESTINATION_BRANCH',
  'AT_DESTINATION_HUB',
  'OUT_FOR_DELIVERY',
]);

const FAILED_OR_EXCEPTION_STATUSES = new Set([
  'DELIVERY_FAILED',
  'FAILED',
  'CANCELLED',
  'PENDING_DISPATCHER_DECISION',
  'RETURN_TO_SENDER',
  'RETURNED_TO_SENDER',
]);

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getOrderStatusBadge(status: string): string {
  const s = (status || '').toUpperCase();
  if (s === 'DELIVERED') return 'bg-emerald-500/15 text-emerald-400';
  if (FAILED_OR_EXCEPTION_STATUSES.has(s)) return 'bg-rose-500/15 text-rose-400';
  if (PENDING_DISPATCH_STATUSES.has(s)) return 'bg-sky-500/15 text-sky-400';
  return 'bg-amber-500/15 text-amber-300';
}

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);

  const primaryRole = resolvePrimaryRole(user, activeRole);
  const userRoles = (user?.roles || []).map(normalizeRoleName);

  // 1. Live orders from Order Service (role-scoped globally for ADMIN)
  const ordersQuery = useQuery<DeliveryOrder[]>({
    queryKey: ['admin', 'orders', user?.userId],
    queryFn: () => getCustomerOrders(),
    enabled: !!user?.userId,
    retry: false,
  });

  // 2. Live merchant approval queue metrics from Organization Service
  const merchantSummaryQuery = useQuery<MerchantApprovalSummaryResponse>({
    queryKey: ['admin', 'merchant-summary', user?.userId],
    queryFn: () => fetchMerchantApprovalSummaryMetrics(),
    enabled: !!user?.userId,
    retry: false,
  });

  // 3. Live user & RBAC stats from Identity Service
  const identityStatsQuery = useQuery<AdminDashboardStats>({
    queryKey: ['admin', 'identity-stats', user?.userId],
    queryFn: () => getAdminStats(),
    enabled: !!user?.userId,
    retry: false,
  });

  // 4. Live branches directory from Organization Service
  const branchesQuery = useQuery<BranchResponse[]>({
    queryKey: ['admin', 'branches', user?.userId],
    queryFn: () => getBranches(),
    enabled: !!user?.userId,
    retry: false,
  });

  const orders = ordersQuery.data ?? [];
  const branches = branchesQuery.data ?? [];

  const orderMetrics = useMemo(() => {
    let pendingDispatch = 0;
    let inTransit = 0;
    let delivered = 0;
    let failed = 0;

    for (const order of orders) {
      const s = (order.status || '').toUpperCase();
      if (s === 'DELIVERED') {
        delivered++;
      } else if (FAILED_OR_EXCEPTION_STATUSES.has(s)) {
        failed++;
      } else if (PENDING_DISPATCH_STATUSES.has(s)) {
        pendingDispatch++;
      } else if (IN_TRANSIT_STATUSES.has(s)) {
        inTransit++;
      }
    }

    return {
      totalOrders: orders.length,
      pendingDispatch,
      inTransit,
      delivered,
      failed,
    };
  }, [orders]);

  const activeBranchesCount = useMemo(
    () => branches.filter((b) => b.status === 'ACTIVE').length,
    [branches]
  );

  const recentOrders = useMemo(() => orders.slice(0, 10), [orders]);

  const handleRefreshAll = () => {
    void ordersQuery.refetch();
    void merchantSummaryQuery.refetch();
    void identityStatsQuery.refetch();
    void branchesQuery.refetch();
  };

  const isRefreshing =
    ordersQuery.isFetching ||
    merchantSummaryQuery.isFetching ||
    identityStatsQuery.isFetching ||
    branchesQuery.isFetching;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Admin Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0f1d3a] via-[#0c1730] to-[#091225] border border-blue-500/25 p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-sky-300 text-[11px] font-bold uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5" />
              {primaryRole ? ROLE_LABELS[primaryRole] || primaryRole : 'Administrator'}
            </span>
            {userRoles.map((role) => (
              <span
                key={role}
                className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 text-[10px] font-mono font-semibold"
              >
                ROLE_{role}
              </span>
            ))}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Administration Control Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Signed in as <strong className="text-white">{user?.fullName || 'System Administrator'}</strong> ({user?.email}). Monitor live network orders, dispatch operations, merchant onboarding approvals, and platform health.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-slate-900/70 hover:bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync Live Metrics</span>
          </button>
          <Link
            href="/organization/merchants"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30"
          >
            <Store className="h-4 w-4" />
            <span>Review Merchants</span>
          </Link>
        </div>
      </div>

      {/* Primary Order & Operations KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          label="Total Orders"
          value={
            ordersQuery.isLoading
              ? '…'
              : ordersQuery.isError
              ? 'Unavailable'
              : orderMetrics.totalOrders
          }
          sub="Order Service"
          icon={Package}
          accentClass="text-sky-400"
          iconBgClass="bg-sky-500/15"
        />
        <KpiCard
          label="Pending Dispatch"
          value={
            ordersQuery.isLoading
              ? '…'
              : ordersQuery.isError
              ? 'Unavailable'
              : orderMetrics.pendingDispatch
          }
          sub="Awaiting assignment"
          icon={Clock}
          accentClass="text-amber-400"
          iconBgClass="bg-amber-500/15"
        />
        <KpiCard
          label="In Transit"
          value={
            ordersQuery.isLoading
              ? '…'
              : ordersQuery.isError
              ? 'Unavailable'
              : orderMetrics.inTransit
          }
          sub="Active network flow"
          icon={Truck}
          accentClass="text-indigo-400"
          iconBgClass="bg-indigo-500/15"
        />
        <KpiCard
          label="Delivered"
          value={
            ordersQuery.isLoading
              ? '…'
              : ordersQuery.isError
              ? 'Unavailable'
              : orderMetrics.delivered
          }
          sub="Completed POD"
          icon={CheckCircle2}
          accentClass="text-emerald-400"
          iconBgClass="bg-emerald-500/15"
        />
        <KpiCard
          label="Failed / Exceptions"
          value={
            ordersQuery.isLoading
              ? '…'
              : ordersQuery.isError
              ? 'Unavailable'
              : orderMetrics.failed
          }
          sub="Failed, cancelled, RTS"
          icon={AlertTriangle}
          accentClass="text-rose-400"
          iconBgClass="bg-rose-500/15"
        />
        <KpiCard
          label="Pending Merchants"
          value={
            merchantSummaryQuery.isLoading
              ? '…'
              : merchantSummaryQuery.isError
              ? 'Unavailable'
              : merchantSummaryQuery.data?.pendingReview ?? 0
          }
          sub="Awaiting approval"
          icon={Store}
          accentClass="text-purple-400"
          iconBgClass="bg-purple-500/15"
        />
      </div>

      {/* Platform Governance Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-[#0c1829] border border-white/10 p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Active Branches</span>
            <div className="text-2xl font-extrabold text-white mt-1">
              {branchesQuery.isLoading
                ? '…'
                : branchesQuery.isError
                ? 'Unavailable'
                : `${activeBranchesCount} / ${branches.length}`}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Organization Service hubs
            </span>
          </div>
          <Link
            href="/organization/branches"
            className="p-3 rounded-xl bg-blue-500/15 text-sky-400 hover:bg-blue-500/25"
            aria-label="Manage branches"
          >
            <Building2 className="h-5 w-5" />
          </Link>
        </div>

        <div className="rounded-2xl bg-[#0c1829] border border-white/10 p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Registered Platform Users</span>
            <div className="text-2xl font-extrabold text-white mt-1">
              {identityStatsQuery.isLoading
                ? '…'
                : identityStatsQuery.isError
                ? 'Unavailable'
                : identityStatsQuery.data?.totalUsers ?? 0}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {identityStatsQuery.data
                ? `${identityStatsQuery.data.activeUsers} active · ${identityStatsQuery.data.suspendedUsers} suspended`
                : 'Identity Service directory'}
            </span>
          </div>
          <Link
            href="/organization/staff"
            className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
            aria-label="Manage users"
          >
            <Users className="h-5 w-5" />
          </Link>
        </div>

        <div className="rounded-2xl bg-[#0c1829] border border-white/10 p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Merchant Applications</span>
            <div className="text-2xl font-extrabold text-white mt-1">
              {merchantSummaryQuery.isLoading
                ? '…'
                : merchantSummaryQuery.isError
                ? 'Unavailable'
                : merchantSummaryQuery.data?.totalSubmissions ?? 0}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {merchantSummaryQuery.data
                ? `${merchantSummaryQuery.data.approvedThisMonth} approved · ${merchantSummaryQuery.data.rejectedThisMonth} rejected`
                : 'Organization onboarding queue'}
            </span>
          </div>
          <Link
            href="/organization/merchants"
            className="p-3 rounded-xl bg-purple-500/15 text-purple-400 hover:bg-purple-500/25"
            aria-label="Review merchant applications"
          >
            <Store className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Operational Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickActionCard
          href="/organization/orders"
          title="Orders Management"
          description="Inspect and manage network-wide delivery orders"
          icon={Package}
          colorClass="text-sky-400"
        />
        <QuickActionCard
          href="/dispatcher/dashboard"
          title="Dispatch Operations"
          description="Monitor pickup assignments and courier routing"
          icon={Truck}
          colorClass="text-amber-400"
        />
        <QuickActionCard
          href="/organization/reports"
          title="Reports & Analytics"
          description="View branch throughput and operational metrics"
          icon={ChartColumn}
          colorClass="text-emerald-400"
        />
        <QuickActionCard
          href="/health"
          title="Service Health"
          description="Check live status of SwiftDrop microservices"
          icon={Activity}
          colorClass="text-indigo-400"
        />
      </div>

      {/* Recent Orders Table */}
      <div className="rounded-2xl bg-[#0c1829] border border-white/10 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">Recent Network Orders</h2>
            <p className="text-xs text-slate-400">
              Latest delivery orders fetched live from the Order Service
            </p>
          </div>
          <Link
            href="/organization/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300"
          >
            <span>Open Full Orders Ledger</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {ordersQuery.isError ? (
          <div className="p-8 text-center space-y-2">
            <AlertTriangle className="h-7 w-7 text-amber-400 mx-auto" />
            <div className="text-sm font-bold text-white">Order Service Unavailable</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {(ordersQuery.error as Error)?.message ||
                'Could not retrieve live orders from the Order Service.'}
            </p>
          </div>
        ) : ordersQuery.isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Loading live orders from Order Service…
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Package className="h-8 w-8 text-slate-600 mx-auto" />
            <div className="text-sm font-bold text-white">No orders recorded yet</div>
            <p className="text-xs text-slate-400">
              Orders submitted by customers and approved merchants will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Tracking #</th>
                  <th className="py-3.5 px-4">Source</th>
                  <th className="py-3.5 px-4">Recipient &amp; City</th>
                  <th className="py-3.5 px-4">Fee</th>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Track</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 font-mono font-bold text-sky-300">
                      {order.trackingNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {order.orderSourceType || 'CUSTOMER'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">
                        {order.dropoffContactName || '—'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {order.dropoffCity || order.dropoffAddress || '—'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {order.currency || 'LKR'}{' '}
                      {Number(order.deliveryFee ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getOrderStatusBadge(
                          order.status
                        )}`}
                      >
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/tracking?trackingNumber=${encodeURIComponent(
                          order.trackingNumber
                        )}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/15 text-sky-300 hover:bg-blue-500/25 font-semibold"
                      >
                        <span>Track</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accentClass,
  iconBgClass,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  accentClass: string;
  iconBgClass: string;
}) {
  return (
    <div className="rounded-2xl bg-[#0c1829] border border-white/10 p-4 flex items-start justify-between gap-2">
      <div className="min-w-0">
        <span className="text-[11px] font-semibold text-slate-400 block truncate">
          {label}
        </span>
        <div className={`text-2xl font-extrabold mt-1.5 ${accentClass}`}>
          {value}
        </div>
        <span className="text-[10px] text-slate-500 mt-1 block truncate">
          {sub}
        </span>
      </div>
      <div className={`p-2.5 rounded-xl shrink-0 ${iconBgClass} ${accentClass}`}>
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );
}

function QuickActionCard({
  href,
  title,
  description,
  icon: Icon,
  colorClass,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <Link
      href={href}
      className="p-4 rounded-2xl bg-[#0c1829] border border-white/10 hover:border-blue-400/40 transition-all flex items-start justify-between gap-3 group"
    >
      <div>
        <div className="text-sm font-bold text-white group-hover:text-sky-300">
          {title}
        </div>
        <div className="text-xs text-slate-400 mt-1">{description}</div>
      </div>
      <Icon className={`h-5 w-5 shrink-0 ${colorClass}`} />
    </Link>
  );
}
