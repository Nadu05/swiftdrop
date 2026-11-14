'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  Truck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowLeftRight,
  Package,
  MapPin,
  Phone,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getBranches } from '@/api/services/organization.api';
import {
  dispatchApi,
  type PickupTaskDto,
  type DeliveryJobDto,
  type CourierProfileDto,
} from '@/api/services/dispatch.api';
import type { BranchResponse } from '@/types/organization.types';

export default function BranchDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const assignedBranchId = user?.branchId ?? null;
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(
    assignedBranchId ?? undefined
  );

  const effectiveBranchId = assignedBranchId ?? selectedBranchId;

  // 1. Load branch directory from Organization Service
  const {
    data: branches = [],
    isLoading: branchesLoading,
    isError: branchesError,
  } = useQuery<BranchResponse[]>({
    queryKey: ['branch-dashboard', 'branches'],
    queryFn: () => getBranches(),
    retry: false,
  });

  const activeBranch = useMemo(() => {
    if (effectiveBranchId) {
      return branches.find((b) => b.id === effectiveBranchId) || null;
    }
    return branches[0] || null;
  }, [branches, effectiveBranchId]);

  const queryBranchId = effectiveBranchId ?? activeBranch?.id;

  // 2. Outgoing parcels (origin pickup tasks at this branch)
  const {
    data: outgoingPickups = [],
    isLoading: pickupsLoading,
    isError: pickupsError,
    refetch: refetchPickups,
  } = useQuery<PickupTaskDto[]>({
    queryKey: ['branch-dashboard', 'pickups', queryBranchId],
    queryFn: () =>
      dispatchApi.getPickupTasks(queryBranchId ? { branchId: queryBranchId } : undefined),
    retry: false,
  });

  // 3. Incoming parcels (destination delivery jobs at this branch)
  const {
    data: incomingDeliveries = [],
    isLoading: deliveriesLoading,
    isError: deliveriesError,
    refetch: refetchDeliveries,
  } = useQuery<DeliveryJobDto[]>({
    queryKey: ['branch-dashboard', 'deliveries', queryBranchId],
    queryFn: () =>
      dispatchApi.getDeliveryJobs(queryBranchId ? { branchId: queryBranchId } : undefined),
    retry: false,
  });

  // 4. Branch courier workload
  const {
    data: branchCouriers = [],
    isLoading: couriersLoading,
    isError: couriersError,
    refetch: refetchCouriers,
  } = useQuery<CourierProfileDto[]>({
    queryKey: ['branch-dashboard', 'couriers', queryBranchId],
    queryFn: () => dispatchApi.getCouriers(queryBranchId),
    retry: false,
  });

  const stats = useMemo(() => {
    const incomingCount = incomingDeliveries.length;
    const outgoingCount = outgoingPickups.length;
    const deliveredCount = incomingDeliveries.filter(
      (d) => d.status === 'DELIVERED'
    ).length;
    const inProgressCount = incomingDeliveries.filter((d) =>
      ['ASSIGNED', 'ACCEPTED', 'IN_TRANSIT'].includes(String(d.status))
    ).length;
    const activeCouriers = branchCouriers.filter(
      (c) => c.status === 'AVAILABLE' || c.status === 'BUSY'
    ).length;

    return {
      incomingCount,
      outgoingCount,
      deliveredCount,
      inProgressCount,
      activeCouriers,
      totalCouriers: branchCouriers.length,
    };
  }, [incomingDeliveries, outgoingPickups, branchCouriers]);

  const handleRefreshAll = () => {
    refetchPickups();
    refetchDeliveries();
    refetchCouriers();
  };

  const dispatchUnavailable = pickupsError && deliveriesError && couriersError;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0c2238] via-[#0b1b30] to-[#081324] border border-cyan-500/25 p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
            <Building2 className="h-4 w-4" />
            <span>
              {activeBranch
                ? `${activeBranch.name} (${activeBranch.code})`
                : assignedBranchId
                ? `Branch Hub #${assignedBranchId}`
                : 'Regional Branch Operations'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Branch Administration Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Monitor branch delivery statistics, incoming and outgoing parcels, courier fleet workload, and inter-branch hub operations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!assignedBranchId && branches.length > 0 && (
            <select
              aria-label="Filter by branch"
              value={queryBranchId || ''}
              onChange={(e) =>
                setSelectedBranchId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-xs font-semibold text-cyan-300"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleRefreshAll}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-slate-900/70 hover:bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Telemetry</span>
          </button>

          <Link
            href="/dispatcher/transfers"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-cyan-600/30"
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span>Inter-Branch Manifests</span>
          </Link>
        </div>
      </div>

      {/* Service Availability Notice */}
      {(branchesError || dispatchUnavailable) && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 flex items-center gap-3 text-xs text-amber-300">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <strong>Backend Service Notice:</strong>{' '}
            {branchesError && 'Organization Service is currently unreachable. '}
            {dispatchUnavailable &&
              'Dispatch Service is currently unreachable. Metrics affected by offline services are marked as Unavailable rather than 0.'}
          </div>
        </div>
      )}

      {/* Branch Operational Overview Card */}
      {activeBranch && !branchesLoading && (
        <div className="rounded-2xl bg-[#0c1829] border border-cyan-500/20 p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center font-mono font-bold text-xs">
              {activeBranch.code}
            </div>
            <div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span>{activeBranch.name}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    activeBranch.status === 'ACTIVE'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-rose-500/15 text-rose-400'
                  }`}
                >
                  {activeBranch.status}
                </span>
              </div>
              <div className="text-xs text-slate-400 flex flex-wrap items-center gap-4 mt-1">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                  {activeBranch.addressLine1}, {activeBranch.city}
                </span>
                {activeBranch.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-cyan-400" />
                    {activeBranch.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dispatcher/requests"
              className="px-3.5 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-semibold text-slate-200"
            >
              Confirm Branch Drop-Off
            </Link>
            <Link
              href={`/organization/branches/${activeBranch.id}`}
              className="px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-xs font-semibold text-cyan-300"
            >
              Branch Details
            </Link>
          </div>
        </div>
      )}

      {/* KPI Cards required by Phase 5.5 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-[#0c1829] border border-white/10 p-5 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Incoming Parcels</span>
            <div className="text-3xl font-extrabold text-sky-400 mt-2">
              {deliveriesLoading
                ? '…'
                : deliveriesError
                ? 'Unavailable'
                : stats.incomingCount}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Destination delivery jobs at hub
            </span>
          </div>
          <div className="p-3 rounded-xl bg-sky-500/15 text-sky-400">
            <ArrowDownLeft className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl bg-[#0c1829] border border-white/10 p-5 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Outgoing Parcels</span>
            <div className="text-3xl font-extrabold text-indigo-400 mt-2">
              {pickupsLoading
                ? '…'
                : pickupsError
                ? 'Unavailable'
                : stats.outgoingCount}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Origin pickup &amp; drop-off tasks
            </span>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/15 text-indigo-400">
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl bg-[#0c1829] border border-white/10 p-5 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">
              Branch Deliveries Completed
            </span>
            <div className="text-3xl font-extrabold text-emerald-400 mt-2">
              {deliveriesLoading
                ? '…'
                : deliveriesError
                ? 'Unavailable'
                : stats.deliveredCount}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {deliveriesError ? 'Service offline' : `${stats.inProgressCount} currently in transit`}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl bg-[#0c1829] border border-white/10 p-5 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">
              Branch Courier Workload
            </span>
            <div className="text-3xl font-extrabold text-cyan-400 mt-2">
              {couriersLoading
                ? '…'
                : couriersError
                ? 'Unavailable'
                : `${stats.activeCouriers} / ${stats.totalCouriers}`}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Active couriers on shift
            </span>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/15 text-cyan-400">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Two-Column Operational Breakdown: Incoming/Outgoing Parcels & Branch Courier Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Incoming & Outgoing Parcels */}
        <div className="lg:col-span-7 space-y-6">
          {/* Outgoing Parcels Table */}
          <div className="rounded-2xl bg-[#0c1829] border border-white/10 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">
                  Outgoing Parcels (Origin Pickups &amp; Drop-offs)
                </h2>
                <p className="text-xs text-slate-400">
                  Parcels originating in this branch awaiting collection or hub receipt
                </p>
              </div>
              <Link
                href="/dispatcher/requests"
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
              >
                Manage All &rarr;
              </Link>
            </div>

            {pickupsError ? (
              <div className="p-6 text-xs text-amber-300">
                Pickup task data is currently unavailable from Dispatch Service.
              </div>
            ) : pickupsLoading ? (
              <div className="p-6 text-xs text-slate-400">Loading outgoing parcels…</div>
            ) : outgoingPickups.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No outgoing pickup tasks currently queued for this branch.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {outgoingPickups.slice(0, 6).map((task) => (
                  <div
                    key={task.id}
                    className="p-4 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-mono font-bold text-cyan-300">
                        {task.trackingNumber}
                      </div>
                      <div className="text-slate-300 mt-0.5">
                        {task.senderName || task.merchantName || 'Sender'} &rarr;{' '}
                        {task.dropoffCity || task.destinationBranchName || 'Destination'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-semibold text-[11px]">
                        {task.status}
                      </span>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {task.assignedCourierName || 'Unassigned'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Incoming Parcels Table */}
          <div className="rounded-2xl bg-[#0c1829] border border-white/10 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">
                  Incoming Parcels (Destination Delivery Jobs)
                </h2>
                <p className="text-xs text-slate-400">
                  Parcels routed to this branch for final-mile delivery
                </p>
              </div>
              <Link
                href="/dispatcher/dashboard"
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
              >
                Dispatch Board &rarr;
              </Link>
            </div>

            {deliveriesError ? (
              <div className="p-6 text-xs text-amber-300">
                Incoming delivery job data is currently unavailable from Dispatch Service.
              </div>
            ) : deliveriesLoading ? (
              <div className="p-6 text-xs text-slate-400">Loading incoming parcels…</div>
            ) : incomingDeliveries.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No incoming delivery jobs currently queued for this branch.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {incomingDeliveries.slice(0, 6).map((job) => (
                  <div
                    key={job.id}
                    className="p-4 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-mono font-bold text-sky-300">
                        {job.trackingNumber}
                      </div>
                      <div className="text-slate-300 mt-0.5">
                        {job.recipientName || job.recipient?.name || 'Recipient'} &bull;{' '}
                        {job.dropoffCity || job.recipient?.city || 'Local Zone'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                          job.status === 'DELIVERED'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-sky-500/15 text-sky-300'
                        }`}
                      >
                        {job.status}
                      </span>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {job.courierName || 'Awaiting Courier'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Branch Courier Workload Panel */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl bg-[#0c1829] border border-white/10 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Branch Courier Workload</h2>
                <p className="text-xs text-slate-400">
                  Real-time capacity and active tasks across branch couriers
                </p>
              </div>
              <Link
                href="/dispatcher/couriers"
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
              >
                Full Fleet &rarr;
              </Link>
            </div>

            {couriersError ? (
              <div className="p-6 text-xs text-amber-300">
                Courier fleet telemetry is currently unavailable from Dispatch Service.
              </div>
            ) : couriersLoading ? (
              <div className="p-6 text-xs text-slate-400">Loading branch couriers…</div>
            ) : branchCouriers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No couriers registered for this branch.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {branchCouriers.map((courier) => {
                  const utilization =
                    courier.maxCapacity > 0
                      ? Math.min(
                          100,
                          Math.round((courier.activeDeliveries / courier.maxCapacity) * 100)
                        )
                      : 0;
                  return (
                    <div key={courier.id} className="p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white">{courier.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {courier.courierCode} &bull; {courier.vehicleType}
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            courier.status === 'AVAILABLE'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : courier.status === 'BUSY'
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {courier.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>
                          Active Load: {courier.activeDeliveries} / {courier.maxCapacity}
                        </span>
                        <span>Completed Today: {courier.completedToday}</span>
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                          style={{ width: `${utilization}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
