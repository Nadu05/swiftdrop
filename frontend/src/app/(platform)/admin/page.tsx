'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Building2,
  Store,
  Package,
  ShieldCheck,
  Activity,
  Terminal,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  UserCheck,
  UserX,
} from 'lucide-react';
import AdminGuard from '@/components/auth/AdminGuard';
import { useAdminStats } from '@/hooks/api/use-admin';
import {
  getBranches,
  fetchMerchantApprovalSummaryMetrics,
} from '@/api/services/organization.api';
import { getCustomerOrders } from '@/api/services/orders.api';
import type { BranchResponse, MerchantApprovalSummaryResponse } from '@/types/organization.types';
import type { OrderResponse } from '@/types/order.types';

function SystemAdminDashboardContent() {
  // 1. Total Users & Role Breakdown from Identity Service
  const {
    data: userStats,
    isLoading: usersLoading,
    isError: usersError,
    refetch: refetchUsers,
  } = useAdminStats();

  // 2. Total Branches from Organization Service
  const {
    data: branches = [],
    isLoading: branchesLoading,
    isError: branchesError,
    refetch: refetchBranches,
  } = useQuery<BranchResponse[]>({
    queryKey: ['admin-dashboard', 'branches'],
    queryFn: () => getBranches(),
    retry: false,
  });

  // 3. Total Merchants & Approval Queue from Organization Service
  const {
    data: merchantSummary,
    isLoading: merchantsLoading,
    isError: merchantsError,
    refetch: refetchMerchants,
  } = useQuery<MerchantApprovalSummaryResponse>({
    queryKey: ['admin-dashboard', 'merchant-summary'],
    queryFn: () => fetchMerchantApprovalSummaryMetrics(),
    retry: false,
  });

  // 4. Total Deliveries from Order Service
  const {
    data: orders = [],
    isLoading: ordersLoading,
    isError: ordersError,
    refetch: refetchOrders,
  } = useQuery<OrderResponse[]>({
    queryKey: ['admin-dashboard', 'orders'],
    queryFn: () => getCustomerOrders(),
    retry: false,
  });

  const handleRefreshAll = () => {
    refetchUsers();
    refetchBranches();
    refetchMerchants();
    refetchOrders();
  };

  const activeBranchesCount = branches.filter((b) => b.status === 'ACTIVE').length;
  const deliveredOrdersCount = orders.filter((o) => o.status === 'DELIVERED').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#131c38] via-[#0e172e] to-[#091022] border border-blue-500/25 p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400">
            <ShieldCheck className="h-4 w-4" />
            <span>Head Office &amp; System Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            System Administration Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Centralized platform telemetry across Identity, Organization, Order, Dispatch, and Notification microservices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRefreshAll}
            className="sd-btn sd-btn--secondary-dark"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh All Services</span>
          </button>
          <Link
            href="/health"
            className="sd-btn sd-btn--primary"
          >
            <Activity className="h-4 w-4" />
            <span>Service Health Matrix</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Cards required by Phase 5.6 (Distinguishing Unavailable from 0) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="sd-stat-card sd-stat-card--dark">
          <div className="sd-stat-card__header">
            <span>Total Users</span>
            <Users className="h-4 w-4 text-sky-400" />
          </div>
          <div className="sd-stat-card__value">
            {usersLoading
              ? '…'
              : usersError || !userStats
              ? 'Unavailable'
              : userStats.totalUsers}
          </div>
          <div className="sd-stat-card__subtext">
            {usersError || !userStats
              ? 'Identity Service unreachable'
              : `${userStats.activeUsers} active · ${userStats.suspendedUsers} suspended`}
          </div>
        </div>

        {/* Total Branches */}
        <div className="sd-stat-card sd-stat-card--dark">
          <div className="sd-stat-card__header">
            <span>Total Branches</span>
            <Building2 className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="sd-stat-card__value text-cyan-400">
            {branchesLoading
              ? '…'
              : branchesError
              ? 'Unavailable'
              : branches.length}
          </div>
          <div className="sd-stat-card__subtext">
            {branchesError
              ? 'Organization Service unreachable'
              : `${activeBranchesCount} active sorting hubs`}
          </div>
        </div>

        {/* Total Merchants */}
        <div className="sd-stat-card sd-stat-card--dark">
          <div className="sd-stat-card__header">
            <span>Total Merchants</span>
            <Store className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="sd-stat-card__value text-indigo-400">
            {merchantsLoading
              ? '…'
              : merchantsError || !merchantSummary
              ? 'Unavailable'
              : merchantSummary.approvedThisMonth}
          </div>
          <div className="sd-stat-card__subtext">
            {merchantsError || !merchantSummary
              ? 'Organization Service unreachable'
              : `${merchantSummary.pendingReview} pending · ${merchantSummary.totalSubmissions} total`}
          </div>
        </div>

        {/* Total Deliveries */}
        <div className="sd-stat-card sd-stat-card--dark">
          <div className="sd-stat-card__header">
            <span>Total Deliveries</span>
            <Package className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="sd-stat-card__value text-emerald-400">
            {ordersLoading ? '…' : ordersError ? 'Unavailable' : orders.length}
          </div>
          <div className="sd-stat-card__subtext">
            {ordersError
              ? 'Order Service unreachable'
              : `${deliveredOrdersCount} completed deliveries`}
          </div>
        </div>
      </div>

      {/* System Operational Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Role Breakdown & Account Governance */}
        <div className="lg:col-span-6 rounded-2xl bg-[#0c1829] border border-white/10 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">
                Identity &amp; Role Distribution
              </h2>
              <p className="text-xs text-slate-400">
                Live user accounts by canonical role from Identity Service
              </p>
            </div>
            <Link
              href="/admin/users"
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
            >
              <span>Manage Users</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {usersError ? (
            <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Identity Service `/api/v1/admin/stats` is currently unreachable.</span>
            </div>
          ) : usersLoading || !userStats ? (
            <div className="text-xs text-slate-400 py-6">Loading role distribution…</div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Active</span>
                  </div>
                  <div className="text-xl font-extrabold text-white mt-1">
                    {userStats.activeUsers}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Suspended</span>
                  </div>
                  <div className="text-xl font-extrabold text-white mt-1">
                    {userStats.suspendedUsers}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5">
                  <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                    <UserX className="h-3.5 w-3.5" />
                    <span>Deactivated</span>
                  </div>
                  <div className="text-xl font-extrabold text-white mt-1">
                    {userStats.deactivatedUsers}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {Object.entries(userStats.usersByRole || {}).map(([role, count]) => {
                  const pct =
                    userStats.totalUsers > 0
                      ? Math.round((Number(count) / userStats.totalUsers) * 100)
                      : 0;
                  return (
                    <div key={role} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold text-slate-200">
                          {role}
                        </span>
                        <span className="text-slate-400">
                          <strong className="text-white">{count}</strong> ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-sky-400"
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Right: System Operational Modules & Branch/Merchant Governance */}
        <div className="lg:col-span-6 space-y-6">
          {/* Administrative Quick Modules */}
          <div className="rounded-2xl bg-[#0c1829] border border-white/10 p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">
                System Operational Governance
              </h2>
              <p className="text-xs text-slate-400">
                Direct administration consoles for users, roles, branches, merchants, and diagnostics
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <Link
                href="/admin/users"
                className="p-4 rounded-xl bg-slate-950/70 border border-white/10 hover:border-sky-400/40 transition-all flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white">User Directory</div>
                  <div className="text-slate-400 mt-0.5">Manage statuses &amp; roles</div>
                </div>
                <Users className="h-4 w-4 text-sky-400 shrink-0" />
              </Link>

              <Link
                href="/admin/roles"
                className="p-4 rounded-xl bg-slate-950/70 border border-white/10 hover:border-sky-400/40 transition-all flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white">Platform Roles</div>
                  <div className="text-slate-400 mt-0.5">Canonical RBAC matrix</div>
                </div>
                <Layers className="h-4 w-4 text-indigo-400 shrink-0" />
              </Link>

              <Link
                href="/organization/branches"
                className="p-4 rounded-xl bg-slate-950/70 border border-white/10 hover:border-cyan-400/40 transition-all flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white">Branch Network</div>
                  <div className="text-slate-400 mt-0.5">Sorting hubs &amp; coverage</div>
                </div>
                <Building2 className="h-4 w-4 text-cyan-400 shrink-0" />
              </Link>

              <Link
                href="/organization/merchants"
                className="p-4 rounded-xl bg-slate-950/70 border border-white/10 hover:border-emerald-400/40 transition-all flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white">Merchant Approvals</div>
                  <div className="text-slate-400 mt-0.5">Onboarding review queue</div>
                </div>
                <Store className="h-4 w-4 text-emerald-400 shrink-0" />
              </Link>

              <Link
                href="/health"
                className="p-4 rounded-xl bg-slate-950/70 border border-white/10 hover:border-amber-400/40 transition-all flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white">Microservice Health</div>
                  <div className="text-slate-400 mt-0.5">Gateway &amp; service probes</div>
                </div>
                <Activity className="h-4 w-4 text-amber-400 shrink-0" />
              </Link>

              <Link
                href="/api-tester"
                className="p-4 rounded-xl bg-slate-950/70 border border-white/10 hover:border-purple-400/40 transition-all flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white">API Diagnostics</div>
                  <div className="text-slate-400 mt-0.5">Test gateway endpoints</div>
                </div>
                <Terminal className="h-4 w-4 text-purple-400 shrink-0" />
              </Link>
            </div>
          </div>

          {/* Active Branch Directory Snapshot */}
          <div className="rounded-2xl bg-[#0c1829] border border-white/10 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Regional Branch Hubs</h3>
              <Link
                href="/organization/branches"
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
              >
                View All &rarr;
              </Link>
            </div>

            {branchesError ? (
              <div className="text-xs text-amber-300">
                Branch directory unavailable (Organization Service offline).
              </div>
            ) : branchesLoading ? (
              <div className="text-xs text-slate-400">Loading branches…</div>
            ) : branches.length === 0 ? (
              <div className="text-xs text-slate-400">No branches configured.</div>
            ) : (
              <div className="divide-y divide-white/5 text-xs">
                {branches.slice(0, 4).map((b) => (
                  <div
                    key={b.id}
                    className="py-2.5 flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-mono font-bold text-cyan-400 mr-2">
                        {b.code}
                      </span>
                      <span className="font-semibold text-white">{b.name}</span>
                      <span className="text-slate-400 ml-2">({b.city})</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  return (
    <AdminGuard>
      <SystemAdminDashboardContent />
    </AdminGuard>
  );
}
