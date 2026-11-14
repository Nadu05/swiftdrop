'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Store,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  Search,
  RefreshCw,
  ArrowUpRight,
  Compass,
  FileText,
  ShieldAlert,
  Building2,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getCustomerOrders } from '@/api/services/orders.api';
import { fetchMyMerchantApplications } from '@/api/services/organization.api';
import type { OrderResponse } from '@/types/order.types';
import type { MerchantApplicationResponse } from '@/types/organization.types';

const ACTIVE_ORDER_STATUSES = [
  'BOOKED',
  'PENDING_ASSIGNMENT',
  'COURIER_ASSIGNED',
  'PICKED_UP',
  'IN_TRANSIT',
  'AT_ORIGIN_HUB',
  'AT_DESTINATION_HUB',
  'OUT_FOR_DELIVERY',
];

export default function MerchantDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // 1. Check merchant onboarding application status from Organization Service
  const {
    data: applications = [],
    isLoading: appsLoading,
    isError: appsError,
    refetch: refetchApps,
  } = useQuery<MerchantApplicationResponse[]>({
    queryKey: ['merchant', 'applications', 'my', user?.userId],
    queryFn: () => fetchMyMerchantApplications(),
    enabled: !!user?.userId,
    retry: false,
  });

  // 2. Fetch merchant's shipment orders from Order Service
  const {
    data: orders = [],
    isLoading: ordersLoading,
    isError: ordersError,
    error: ordersErrorObj,
    refetch: refetchOrders,
  } = useQuery<OrderResponse[]>({
    queryKey: ['merchant', 'orders', user?.userId],
    queryFn: () => getCustomerOrders(),
    enabled: !!user?.userId,
    retry: false,
  });

  // Determine if the merchant has a pending or rejected onboarding application
  const latestApp = applications[0] || null;
  const isPendingApproval =
    latestApp &&
    latestApp.status === 'PENDING' &&
    !applications.some((a) => a.status === 'APPROVED');
  const isRejectedApproval =
    latestApp &&
    latestApp.status === 'REJECTED' &&
    !applications.some((a) => a.status === 'APPROVED');

  // Compute shipment metrics from real Order Service data
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const pendingDeliveries = orders.filter((o) =>
      ACTIVE_ORDER_STATUSES.includes(o.status)
    ).length;
    const completedDeliveries = orders.filter((o) => o.status === 'DELIVERED').length;
    const failedOrCancelled = orders.filter((o) =>
      ['FAILED', 'DELIVERY_FAILED', 'CANCELLED', 'RETURNED_TO_SENDER'].includes(o.status)
    ).length;

    return {
      totalOrders,
      pendingDeliveries,
      completedDeliveries,
      failedOrCancelled,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && ACTIVE_ORDER_STATUSES.includes(order.status)) ||
        (statusFilter === 'COMPLETED' && order.status === 'DELIVERED') ||
        order.status === statusFilter;

      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesStatus;
      return (
        matchesStatus &&
        (order.trackingNumber?.toLowerCase().includes(q) ||
          order.dropoffContactName?.toLowerCase().includes(q) ||
          order.dropoffCity?.toLowerCase().includes(q) ||
          order.parcelDescription?.toLowerCase().includes(q))
      );
    });
  }, [orders, statusFilter, searchQuery]);

  // Phase 4 requirement: If a merchant account is pending approval, present the
  // onboarding/approval status view instead of granting full operational access.
  if (!appsLoading && (isPendingApproval || isRejectedApproval)) {
    return (
      <div className="max-w-3xl mx-auto py-8 space-y-6">
        <div
          className={`rounded-2xl border p-8 shadow-xl ${
            isPendingApproval
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-rose-500/10 border-rose-500/30'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-xl ${
                isPendingApproval
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {isPendingApproval ? (
                <Clock className="h-7 w-7" />
              ) : (
                <ShieldAlert className="h-7 w-7" />
              )}
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Merchant Onboarding Status
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    isPendingApproval
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {latestApp.status}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-white">
                {isPendingApproval
                  ? 'Your Merchant Application is Under Review'
                  : 'Merchant Application Requires Attention'}
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                {isPendingApproval
                  ? 'Head Office Administration is currently verifying your business registration and operating branch details. Full merchant shipment dispatch will unlock automatically once approved.'
                  : `Your merchant application (${latestApp.id}) was not approved. Reason: ${
                      latestApp.rejectionReason || 'Please contact Head Office support.'
                    }`}
              </p>

              <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Application Code</span>
                  <span className="font-mono font-bold text-white">{latestApp.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Business Name</span>
                  <span className="font-bold text-white">{latestApp.businessName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Category</span>
                  <span className="text-slate-200">{latestApp.categoryLabel || latestApp.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Submitted Date</span>
                  <span className="text-slate-200">{latestApp.submittedAt}</span>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => refetchApps()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Refresh Approval Status</span>
                </button>
                <Link
                  href="/tracking"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-slate-200 hover:bg-white/5 text-xs font-semibold"
                >
                  <Compass className="h-3.5 w-3.5" />
                  <span>Track Existing Parcels</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#111e3b] via-[#0d1830] to-[#0a1326] border border-indigo-500/25 p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
            <Store className="h-4 w-4" />
            <span>Merchant Partner Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Welcome back, {user?.fullName || 'Merchant Partner'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Manage outbound merchant shipments, monitor pending and completed deliveries, and create new dispatch orders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              refetchOrders();
              refetchApps();
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-slate-900/70 hover:bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync Shipments</span>
          </button>
          <Link
            href="/book"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create New Order</span>
          </Link>
        </div>
      </div>

      {/* Approved Organization Badge (if present) */}
      {latestApp && latestApp.status === 'APPROVED' && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2.5 text-emerald-300">
            <Building2 className="h-4 w-4 shrink-0" />
            <span>
              Verified Merchant Organization:{' '}
              <strong className="text-white">{latestApp.businessName}</strong> ({latestApp.id})
            </span>
          </div>
          <span className="font-semibold text-emerald-400">APPROVED PARTNER</span>
        </div>
      )}

      {appsError && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-4 py-2.5 text-xs text-amber-300">
          Organization Service merchant profile status is temporarily unreachable; displaying live Order Service shipments.
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-[#0c1829] border border-white/10 p-5 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Total Orders</span>
            <div className="text-3xl font-extrabold text-white mt-2">
              {ordersLoading ? '…' : ordersError ? 'Unavailable' : metrics.totalOrders}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              All booked merchant parcels
            </span>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/15 text-indigo-400">
            <Package className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl bg-[#0c1829] border border-white/10 p-5 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Pending Deliveries</span>
            <div className="text-3xl font-extrabold text-amber-400 mt-2">
              {ordersLoading ? '…' : ordersError ? 'Unavailable' : metrics.pendingDeliveries}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              In transit or awaiting pickup
            </span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl bg-[#0c1829] border border-white/10 p-5 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Completed Deliveries</span>
            <div className="text-3xl font-extrabold text-emerald-400 mt-2">
              {ordersLoading ? '…' : ordersError ? 'Unavailable' : metrics.completedDeliveries}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Verified proof of delivery
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl bg-[#0c1829] border border-white/10 p-5 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Exceptions / RTS</span>
            <div className="text-3xl font-extrabold text-rose-400 mt-2">
              {ordersLoading ? '…' : ordersError ? 'Unavailable' : metrics.failedOrCancelled}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Failed, cancelled, or returned
            </span>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/15 text-rose-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Order Creation Shortcuts & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/book"
          className="p-5 rounded-2xl bg-[#0c1829] border border-indigo-500/25 hover:border-indigo-400/50 transition-all flex items-center justify-between group"
        >
          <div>
            <div className="text-sm font-bold text-white group-hover:text-indigo-300">
              Dispatch New Shipment
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Calculate rates and book a courier pickup
            </div>
          </div>
          <PlusCircle className="h-5 w-5 text-indigo-400 shrink-0" />
        </Link>

        <Link
          href="/bookings"
          className="p-5 rounded-2xl bg-[#0c1829] border border-white/10 hover:border-sky-400/40 transition-all flex items-center justify-between group"
        >
          <div>
            <div className="text-sm font-bold text-white group-hover:text-sky-300">
              Full Shipment Ledger &amp; Receipts
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Download commercial receipts and view POD details
            </div>
          </div>
          <FileText className="h-5 w-5 text-sky-400 shrink-0" />
        </Link>

        <Link
          href="/tracking"
          className="p-5 rounded-2xl bg-[#0c1829] border border-white/10 hover:border-emerald-400/40 transition-all flex items-center justify-between group"
        >
          <div>
            <div className="text-sm font-bold text-white group-hover:text-emerald-300">
              Live Milestone Tracker
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Monitor real-time hub scans and delivery events
            </div>
          </div>
          <Compass className="h-5 w-5 text-emerald-400 shrink-0" />
        </Link>
      </div>

      {/* Shipment Management Table */}
      <div className="rounded-2xl bg-[#0c1829] border border-white/10 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white">Shipment Management Overview</h2>
            <p className="text-xs text-slate-400">
              Real-time feed of your merchant orders from the SwiftDrop Order Service
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tracking #, recipient, city…"
                className="pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending / Active</option>
              <option value="COMPLETED">Completed (Delivered)</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {ordersError ? (
          <div className="p-8 text-center space-y-2">
            <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto" />
            <div className="text-sm font-bold text-white">Order Service Unavailable</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {(ordersErrorObj as Error)?.message ||
                'Could not fetch merchant orders from the backend Order Service.'}
            </p>
          </div>
        ) : ordersLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Loading merchant shipments from Order Service…
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <Package className="h-9 w-9 text-slate-500 mx-auto" />
            <div className="text-sm font-bold text-white">No shipments found</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {orders.length === 0
                ? 'You have not created any merchant delivery orders yet. Click "Create New Order" to dispatch your first parcel.'
                : 'No shipments match your current search or status filter.'}
            </p>
            {orders.length === 0 && (
              <Link
                href="/book"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Create First Shipment</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Tracking #</th>
                  <th className="py-3.5 px-4">Recipient &amp; Destination</th>
                  <th className="py-3.5 px-4">Parcel</th>
                  <th className="py-3.5 px-4">Charge</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOrders.slice(0, 15).map((order) => (
                  <tr key={order.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">
                      {order.trackingNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">
                        {order.dropoffContactName || 'Recipient'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {order.dropoffCity || order.dropoffAddress || '—'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div>{order.parcelDescription || order.parcelSize || 'Parcel'}</div>
                      <div className="text-[11px] text-slate-500">
                        {order.weightKg ?? 0} kg &bull; {order.pickupMethod || 'STANDARD'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {order.currency || 'LKR'}{' '}
                      {Number(order.deliveryFee ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          order.status === 'DELIVERED'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : ['CANCELLED', 'FAILED', 'RETURNED_TO_SENDER'].includes(order.status)
                            ? 'bg-rose-500/15 text-rose-400'
                            : 'bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Link
                        href={`/tracking?trackingNumber=${encodeURIComponent(
                          order.trackingNumber
                        )}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 font-semibold"
                      >
                        <span>Track</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                      <Link
                        href={`/bookings/${order.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 font-semibold"
                      >
                        <span>Details</span>
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
