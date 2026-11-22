'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  Search,
  PlusCircle,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getCustomerOrders } from '@/api/services/orders.api';
import { fetchMyMerchantApplications } from '@/api/services/organization.api';
import type { DeliveryOrder } from '@/types/order.types';
import type { MerchantApplicationResponse } from '@/types/organization.types';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Orders' },
  { value: 'CREATED', label: 'Created' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PICKUP_ASSIGNED', label: 'Pickup Assigned' },
  { value: 'PICKED_UP', label: 'Picked Up' },
  { value: 'AT_ORIGIN_BRANCH', label: 'At Origin Branch' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'AT_DESTINATION_BRANCH', label: 'At Destination Branch' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'DELIVERY_FAILED', label: 'Delivery Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RETURN_TO_SENDER', label: 'Return to Sender' },
];

function getStatusStyle(status: string): string {
  if (status === 'DELIVERED') return 'bg-emerald-500/15 text-emerald-400';
  if (['CANCELLED', 'DELIVERY_FAILED', 'RETURN_TO_SENDER', 'RETURNED_TO_SENDER'].includes(status))
    return 'bg-rose-500/15 text-rose-400';
  if (['CREATED', 'CONFIRMED'].includes(status)) return 'bg-sky-500/15 text-sky-400';
  return 'bg-amber-500/15 text-amber-300';
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function MerchantOrdersPage() {
  const user = useAuthStore((s) => s.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const {
    data: applications = [],
    isLoading: appsLoading,
  } = useQuery<MerchantApplicationResponse[]>({
    queryKey: ['merchant', 'applications', 'my', user?.userId],
    queryFn: fetchMyMerchantApplications,
    enabled: !!user?.userId,
    retry: false,
  });

  const {
    data: orders = [],
    isLoading: ordersLoading,
    isError: ordersError,
    error: ordersErrorObj,
    refetch,
  } = useQuery<DeliveryOrder[]>({
    queryKey: ['merchant', 'orders', user?.userId],
    queryFn: () => getCustomerOrders(),
    enabled: !!user?.userId,
    retry: false,
  });

  const latestApp = applications[0] || null;
  const isApproved = applications.some((a) => a.status === 'APPROVED');
  const isPending = latestApp?.status === 'PENDING' && !isApproved;
  const isRejected = latestApp?.status === 'REJECTED' && !isApproved;

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchStatus = statusFilter === 'ALL' || order.status === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchStatus;
      return (
        matchStatus &&
        (order.trackingNumber?.toLowerCase().includes(q) ||
          order.dropoffContactName?.toLowerCase().includes(q) ||
          order.dropoffCity?.toLowerCase().includes(q) ||
          order.parcelDescription?.toLowerCase().includes(q) ||
          order.dropoffAddress?.toLowerCase().includes(q))
      );
    });
  }, [orders, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const paginatedOrders = filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (v: string) => { setSearchQuery(v); setPage(1); };
  const handleFilter = (v: string) => { setStatusFilter(v); setPage(1); };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">My Orders</h1>
          <p className="text-sm text-slate-400 mt-1">
            All delivery orders placed through your merchant account
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/15 bg-slate-900/70 hover:bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <Link
            href="/merchant/orders/create"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25"
          >
            <PlusCircle className="h-4 w-4" />
            New Order
          </Link>
        </div>
      </div>

      {/* Approval Status Banner */}
      {!appsLoading && (isPending || isRejected) && (
        <div
          className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${
            isPending
              ? 'bg-amber-500/10 border-amber-500/25'
              : 'bg-rose-500/10 border-rose-500/25'
          }`}
        >
          {isPending ? (
            <Clock className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
          )}
          <div>
            <p
              className={`text-xs font-bold ${
                isPending ? 'text-amber-300' : 'text-rose-300'
              }`}
            >
              {isPending
                ? 'Merchant Application Pending Review'
                : 'Merchant Application Rejected'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {isPending
                ? 'Your merchant application is under review. Order creation will be enabled once approved.'
                : `Reason: ${latestApp?.rejectionReason || 'Please contact support.'}`}
            </p>
          </div>
        </div>
      )}

      {/* Stats Row */}
      {!ordersLoading && !ordersError && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: orders.length, icon: Package, color: 'text-indigo-400', bg: 'bg-indigo-500/15' },
            { label: 'Active', value: orders.filter(o => !['DELIVERED','CANCELLED','DELIVERY_FAILED','RETURN_TO_SENDER','RETURNED_TO_SENDER'].includes(o.status)).length, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/15' },
            { label: 'Delivered', value: orders.filter(o => o.status === 'DELIVERED').length, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
            { label: 'Exceptions', value: orders.filter(o => ['CANCELLED','DELIVERY_FAILED','RETURN_TO_SENDER','RETURNED_TO_SENDER'].includes(o.status)).length, icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/15' },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-xl bg-[#0c1829] border border-white/10 p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div>
                  <div className={`text-xl font-extrabold ${stat.color}`}>{stat.value}</div>
                  <div className="text-[11px] text-slate-400">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table Card */}
      <div className="rounded-2xl bg-[#0c1829] border border-white/10 overflow-hidden shadow-xl">
        {/* Toolbar */}
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search tracking #, recipient, city…"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => handleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-indigo-400"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Body */}
        {ordersError ? (
          <div className="p-10 text-center space-y-2">
            <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto" />
            <p className="text-sm font-bold text-white">Could not load orders</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {(ordersErrorObj as Error)?.message || 'Order Service is temporarily unavailable.'}
            </p>
            <button onClick={() => refetch()} className="text-xs text-indigo-400 hover:underline cursor-pointer">
              Try again
            </button>
          </div>
        ) : ordersLoading ? (
          <div className="p-10 text-center">
            <RefreshCw className="h-6 w-6 text-slate-500 mx-auto animate-spin" />
            <p className="text-xs text-slate-400 mt-3">Loading orders…</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="h-10 w-10 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-white">
              {orders.length === 0 ? 'No orders yet' : 'No orders match your filters'}
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {orders.length === 0
                ? 'Create your first delivery order to get started.'
                : 'Try adjusting your search or status filter.'}
            </p>
            {orders.length === 0 && isApproved && (
              <Link
                href="/merchant/orders/create"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Create First Order
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Tracking #</th>
                    <th className="py-3.5 px-4">Recipient</th>
                    <th className="py-3.5 px-4">Destination</th>
                    <th className="py-3.5 px-4">Parcel</th>
                    <th className="py-3.5 px-4">Fee</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">
                        {order.trackingNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{order.dropoffContactName || '—'}</div>
                        <div className="text-[11px] text-slate-500">{order.dropoffContactPhone || ''}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <div>{order.dropoffCity || '—'}</div>
                        <div className="text-[11px] text-slate-500">{order.dropoffPostalCode || ''}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <div>{order.parcelSize || '—'}</div>
                        <div className="text-[11px] text-slate-500">{order.weightKg ?? 0} kg</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {order.currency || 'LKR'} {Number(order.deliveryFee ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{formatDate(order.createdAt)}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusStyle(order.status)}`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <Link
                          href={`/merchant/tracking?trackingNumber=${encodeURIComponent(order.trackingNumber)}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 font-semibold text-[11px]"
                        >
                          Track <ArrowUpRight className="h-3 w-3" />
                        </Link>
                        <Link
                          href={`/merchant/orders/${order.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 font-semibold text-[11px]"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filteredOrders.length)} of {filteredOrders.length} orders
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-slate-300 font-semibold">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
