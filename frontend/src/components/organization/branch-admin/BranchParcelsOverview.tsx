'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Clock,
  ExternalLink,
  Package,
  RefreshCw,
  Search,
  Truck,
} from 'lucide-react';
import { getCustomerOrders } from '@/api/services/orders.api';
import {
  dispatchApi,
  type DeliveryJobDto,
  type PickupTaskDto,
  type ReadyForTransferParcelDto,
  type TransferManifestDto,
} from '@/api/services/dispatch.api';
import type { OrderResponse } from '@/types/order.types';
import { isOrderAuthorizedForBranch } from '@/lib/auth/branch-admin-permissions';
import { useBranchAdminContext } from './useBranchAdminContext';
import BranchScopeBanner from './BranchScopeBanner';

export interface BranchParcelsOverviewProps {
  defaultFlow?: 'INCOMING' | 'OUTGOING';
}

type IncomingStage =
  | 'ALL'
  | 'ARRIVING_FROM_OTHER_BRANCHES'
  | 'AWAITING_BRANCH_RECEIPT'
  | 'RECEIVED_BY_BRANCH';

type OutgoingStage =
  | 'ALL'
  | 'READY_FOR_DISPATCH'
  | 'HANDED_OVER_TO_TRANSPORT'
  | 'TRANSFERRED_TO_ANOTHER_BRANCH';

interface ParcelFlowRecord {
  key: string;
  orderId: string | number;
  trackingNumber: string;
  originBranchLabel: string;
  destinationBranchLabel: string;
  backendStatus: string;
  stageLabel: string;
  stageCode: IncomingStage | OutgoingStage;
  manifestCode?: string;
  courierName?: string;
  weightKg?: number;
  updatedAt?: string;
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

export default function BranchParcelsOverview({
  defaultFlow = 'INCOMING',
}: BranchParcelsOverviewProps) {
  const {
    permissions,
    effectiveBranchId,
    branch,
    allBranches,
    isLoadingBranch,
    selectBranchForInspection,
  } = useBranchAdminContext();

  const [activeFlow, setActiveFlow] = useState<'INCOMING' | 'OUTGOING'>(
    defaultFlow
  );
  const [incomingStage, setIncomingStage] = useState<IncomingStage>('ALL');
  const [outgoingStage, setOutgoingStage] = useState<OutgoingStage>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [manifests, setManifests] = useState<TransferManifestDto[]>([]);
  const [readyParcels, setReadyParcels] = useState<ReadyForTransferParcelDto[]>([]);
  const [pickupTasks, setPickupTasks] = useState<PickupTaskDto[]>([]);
  const [deliveryJobs, setDeliveryJobs] = useState<DeliveryJobDto[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveFlow(defaultFlow);
  }, [defaultFlow]);

  const loadParcelFlowData = useCallback(
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
        const [
          ordersRes,
          manifestsRes,
          readyRes,
          pickupsRes,
          jobsRes,
        ] = await Promise.allSettled([
          getCustomerOrders(),
          dispatchApi.listTransferManifests({ branchId: effectiveBranchId }),
          dispatchApi.listReadyForTransferParcels({
            originBranchId: effectiveBranchId,
          }),
          dispatchApi.getPickupTasks({ branchId: effectiveBranchId }),
          dispatchApi.getDeliveryJobs({ branchId: effectiveBranchId }),
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

        if (
          ordersRes.status === 'rejected' &&
          manifestsRes.status === 'rejected' &&
          readyRes.status === 'rejected'
        ) {
          setError(
            ordersRes.reason instanceof Error
              ? ordersRes.reason.message
              : 'Unable to load branch parcel flow data from backend services.'
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
    loadParcelFlowData(false);
  }, [loadParcelFlowData]);

  // ── Build Incoming Parcel Records (strictly existing backend statuses) ────
  const incomingRecords = useMemo<ParcelFlowRecord[]>(() => {
    if (!effectiveBranchId) return [];
    const map = new Map<string, ParcelFlowRecord>();

    // 1. From Inbound Transfer Manifests (destinationBranchId === effectiveBranchId)
    for (const m of manifests) {
      if (Number(m.destinationBranchId) !== Number(effectiveBranchId)) continue;
      for (const item of m.parcels || []) {
        const isReceived =
          item.status === 'RECEIVED' ||
          ['RECEIVED', 'RECEIVED_WITH_DISCREPANCY', 'COMPLETED'].includes(m.status);
        const stageCode: IncomingStage = isReceived
          ? 'RECEIVED_BY_BRANCH'
          : m.status === 'IN_TRANSIT'
            ? 'AWAITING_BRANCH_RECEIPT'
            : 'ARRIVING_FROM_OTHER_BRANCHES';

        const stageLabel =
          stageCode === 'RECEIVED_BY_BRANCH'
            ? 'Received by Branch'
            : stageCode === 'AWAITING_BRANCH_RECEIPT'
              ? 'Awaiting Branch Receipt'
              : 'Arriving from Other Branch';

        map.set(item.trackingNumber, {
          key: `in-manifest-${m.manifestCode}-${item.trackingNumber}`,
          orderId: item.orderId,
          trackingNumber: item.trackingNumber,
          originBranchLabel:
            m.originBranchName || m.originBranchCode || `Hub #${m.originBranchId}`,
          destinationBranchLabel:
            m.destinationBranchName ||
            m.destinationBranchCode ||
            `Hub #${m.destinationBranchId}`,
          backendStatus: `${item.status} (Manifest ${m.status})`,
          stageLabel,
          stageCode,
          manifestCode: m.manifestCode,
          courierName: m.assignedCourierName,
          weightKg: item.weightKg,
          updatedAt:
            item.receivedAt ||
            m.destinationReceivedAt ||
            item.dispatchedAt ||
            m.departureAt ||
            m.createdAt,
        });
      }
    }

    // 2. From Orders where destinationBranchId === effectiveBranchId
    for (const o of orders) {
      if (Number(o.destinationBranchId) !== Number(effectiveBranchId)) continue;
      if (map.has(o.trackingNumber)) continue;

      const s = (o.status || '').toUpperCase();
      let stageCode: IncomingStage = 'ARRIVING_FROM_OTHER_BRANCHES';
      if (
        ['AT_DESTINATION_BRANCH', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(s)
      ) {
        stageCode = 'RECEIVED_BY_BRANCH';
      } else if (['IN_TRANSIT', 'PICKED_UP', 'AT_ORIGIN_BRANCH'].includes(s)) {
        stageCode = o.sameBranch
          ? 'AWAITING_BRANCH_RECEIPT'
          : 'ARRIVING_FROM_OTHER_BRANCHES';
      } else {
        stageCode = 'AWAITING_BRANCH_RECEIPT';
      }

      const stageLabel =
        stageCode === 'RECEIVED_BY_BRANCH'
          ? 'Received by Branch'
          : stageCode === 'AWAITING_BRANCH_RECEIPT'
            ? 'Awaiting Branch Receipt'
            : 'Arriving from Other Branch';

      map.set(o.trackingNumber, {
        key: `in-order-${o.id}`,
        orderId: o.id,
        trackingNumber: o.trackingNumber,
        originBranchLabel: `Hub #${o.originBranchId}`,
        destinationBranchLabel: `Hub #${o.destinationBranchId}`,
        backendStatus: o.status,
        stageLabel,
        stageCode,
        weightKg: o.weightKg,
        updatedAt: o.updatedAt || o.createdAt,
      });
    }

    // 3. From Destination Delivery Jobs
    for (const job of deliveryJobs) {
      if (!job.trackingNumber || map.has(job.trackingNumber)) continue;
      map.set(job.trackingNumber, {
        key: `in-job-${job.id}`,
        orderId: job.orderId,
        trackingNumber: job.trackingNumber,
        originBranchLabel: job.pickupCity || `Hub #${effectiveBranchId}`,
        destinationBranchLabel:
          job.branchName || job.branchCode || `Hub #${effectiveBranchId}`,
        backendStatus: job.status,
        stageLabel: 'Received by Branch',
        stageCode: 'RECEIVED_BY_BRANCH',
        courierName: job.courierName,
        weightKg: job.parcel?.weightKg,
        updatedAt: job.updatedAt || job.createdAt,
      });
    }

    return Array.from(map.values());
  }, [effectiveBranchId, manifests, orders, deliveryJobs]);

  // ── Build Outgoing Parcel Records (strictly existing backend statuses) ────
  const outgoingRecords = useMemo<ParcelFlowRecord[]>(() => {
    if (!effectiveBranchId) return [];
    const map = new Map<string, ParcelFlowRecord>();

    // 1. Parcels Ready for Inter-Branch Transfer (`GET /api/v1/dispatch/transfers/ready-parcels`)
    for (const r of readyParcels) {
      if (Number(r.originBranchId) !== Number(effectiveBranchId)) continue;
      map.set(r.trackingNumber, {
        key: `out-ready-${r.trackingNumber}`,
        orderId: r.orderId,
        trackingNumber: r.trackingNumber,
        originBranchLabel:
          r.originBranchName || r.originBranchCode || `Hub #${r.originBranchId}`,
        destinationBranchLabel:
          r.destinationBranchName ||
          r.destinationBranchCode ||
          `Hub #${r.destinationBranchId}`,
        backendStatus: 'AT_ORIGIN_BRANCH (READY_FOR_TRANSFER)',
        stageLabel: 'Ready for Dispatch',
        stageCode: 'READY_FOR_DISPATCH',
        weightKg: r.weightKg,
        updatedAt: r.readySince,
      });
    }

    // 2. Outbound Transfer Manifests (originBranchId === effectiveBranchId)
    for (const m of manifests) {
      if (Number(m.originBranchId) !== Number(effectiveBranchId)) continue;
      for (const item of m.parcels || []) {
        const isTransferred =
          item.status === 'RECEIVED' ||
          ['RECEIVED', 'RECEIVED_WITH_DISCREPANCY', 'COMPLETED'].includes(m.status);
        const isHandedOver =
          item.status === 'DISPATCHED' ||
          ['ASSIGNED', 'IN_TRANSIT'].includes(m.status);

        const stageCode: OutgoingStage = isTransferred
          ? 'TRANSFERRED_TO_ANOTHER_BRANCH'
          : isHandedOver
            ? 'HANDED_OVER_TO_TRANSPORT'
            : 'READY_FOR_DISPATCH';

        const stageLabel =
          stageCode === 'TRANSFERRED_TO_ANOTHER_BRANCH'
            ? 'Transferred to Another Branch'
            : stageCode === 'HANDED_OVER_TO_TRANSPORT'
              ? 'Handed Over to Transportation'
              : 'Ready for Dispatch';

        map.set(item.trackingNumber, {
          key: `out-manifest-${m.manifestCode}-${item.trackingNumber}`,
          orderId: item.orderId,
          trackingNumber: item.trackingNumber,
          originBranchLabel:
            m.originBranchName || m.originBranchCode || `Hub #${m.originBranchId}`,
          destinationBranchLabel:
            m.destinationBranchName ||
            m.destinationBranchCode ||
            `Hub #${m.destinationBranchId}`,
          backendStatus: `${item.status} (Manifest ${m.status})`,
          stageLabel,
          stageCode,
          manifestCode: m.manifestCode,
          courierName: m.assignedCourierName,
          weightKg: item.weightKg,
          updatedAt:
            item.dispatchedAt ||
            m.departureAt ||
            m.originHandoverAt ||
            m.createdAt,
        });
      }
    }

    // 3. Origin Pickup Tasks
    for (const p of pickupTasks) {
      if (!p.trackingNumber || map.has(p.trackingNumber)) continue;
      const s = (p.status || '').toUpperCase();
      const stageCode: OutgoingStage =
        s === 'PICKED_UP' ? 'HANDED_OVER_TO_TRANSPORT' : 'READY_FOR_DISPATCH';
      const stageLabel =
        stageCode === 'HANDED_OVER_TO_TRANSPORT'
          ? 'Handed Over to Transportation'
          : 'Ready for Dispatch';

      map.set(p.trackingNumber, {
        key: `out-pickup-${p.id}`,
        orderId: p.orderId,
        trackingNumber: p.trackingNumber,
        originBranchLabel:
          p.originBranchName ||
          p.originBranchCode ||
          `Hub #${p.originBranchId || effectiveBranchId}`,
        destinationBranchLabel:
          p.destinationBranchName ||
          p.destinationBranchCode ||
          `Hub #${p.destinationBranchId || effectiveBranchId}`,
        backendStatus: p.status,
        stageLabel,
        stageCode,
        courierName: p.assignedCourierName,
        weightKg: p.weightKg,
        updatedAt: p.pickedUpAt || p.branchConfirmedAt || p.createdAt,
      });
    }

    // 4. Orders where originBranchId === effectiveBranchId
    for (const o of orders) {
      if (Number(o.originBranchId) !== Number(effectiveBranchId)) continue;
      if (map.has(o.trackingNumber)) continue;

      const s = (o.status || '').toUpperCase();
      let stageCode: OutgoingStage = 'READY_FOR_DISPATCH';
      if (
        !o.sameBranch &&
        ['AT_DESTINATION_BRANCH', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(s)
      ) {
        stageCode = 'TRANSFERRED_TO_ANOTHER_BRANCH';
      } else if (['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(s)) {
        stageCode = 'HANDED_OVER_TO_TRANSPORT';
      } else {
        stageCode = 'READY_FOR_DISPATCH';
      }

      const stageLabel =
        stageCode === 'TRANSFERRED_TO_ANOTHER_BRANCH'
          ? 'Transferred to Another Branch'
          : stageCode === 'HANDED_OVER_TO_TRANSPORT'
            ? 'Handed Over to Transportation'
            : 'Ready for Dispatch';

      map.set(o.trackingNumber, {
        key: `out-order-${o.id}`,
        orderId: o.id,
        trackingNumber: o.trackingNumber,
        originBranchLabel: `Hub #${o.originBranchId}`,
        destinationBranchLabel: `Hub #${o.destinationBranchId}`,
        backendStatus: o.status,
        stageLabel,
        stageCode,
        weightKg: o.weightKg,
        updatedAt: o.updatedAt || o.createdAt,
      });
    }

    return Array.from(map.values());
  }, [effectiveBranchId, readyParcels, manifests, pickupTasks, orders]);

  const incomingCounts = useMemo(() => {
    return {
      total: incomingRecords.length,
      arriving: incomingRecords.filter(
        (r) => r.stageCode === 'ARRIVING_FROM_OTHER_BRANCHES'
      ).length,
      awaitingReceipt: incomingRecords.filter(
        (r) => r.stageCode === 'AWAITING_BRANCH_RECEIPT'
      ).length,
      received: incomingRecords.filter(
        (r) => r.stageCode === 'RECEIVED_BY_BRANCH'
      ).length,
    };
  }, [incomingRecords]);

  const outgoingCounts = useMemo(() => {
    return {
      total: outgoingRecords.length,
      readyForDispatch: outgoingRecords.filter(
        (r) => r.stageCode === 'READY_FOR_DISPATCH'
      ).length,
      handedOver: outgoingRecords.filter(
        (r) => r.stageCode === 'HANDED_OVER_TO_TRANSPORT'
      ).length,
      transferred: outgoingRecords.filter(
        (r) => r.stageCode === 'TRANSFERRED_TO_ANOTHER_BRANCH'
      ).length,
    };
  }, [outgoingRecords]);

  const displayedRecords = useMemo(() => {
    const base = activeFlow === 'INCOMING' ? incomingRecords : outgoingRecords;
    const stageFilter = activeFlow === 'INCOMING' ? incomingStage : outgoingStage;
    const q = searchQuery.trim().toLowerCase();

    return base.filter((r) => {
      if (stageFilter !== 'ALL' && r.stageCode !== stageFilter) {
        return false;
      }
      if (q.length > 0) {
        return (
          r.trackingNumber.toLowerCase().includes(q) ||
          String(r.orderId).toLowerCase().includes(q) ||
          (r.manifestCode || '').toLowerCase().includes(q) ||
          r.originBranchLabel.toLowerCase().includes(q) ||
          r.destinationBranchLabel.toLowerCase().includes(q) ||
          (r.courierName || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [
    activeFlow,
    incomingRecords,
    outgoingRecords,
    incomingStage,
    outgoingStage,
    searchQuery,
  ]);

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
            Branch Administration / Hub Parcel Flow
          </p>
          <h1 className="org-page-header__title">
            {activeFlow === 'INCOMING'
              ? 'Incoming Parcels Overview'
              : 'Outgoing Parcels Overview'}
          </h1>
          <p className="org-page-header__subtitle">
            {activeFlow === 'INCOMING'
              ? 'Monitor parcels arriving from other branches, awaiting branch receipt, and received at your hub.'
              : 'Monitor parcels ready for dispatch, handed over to transportation, and transferred to destination branches.'}
          </p>
        </div>

        <div className="org-page-header__actions">
          <div className="inline-flex rounded-lg border border-[#E5EAF0] bg-white p-1">
            <Link
              href="/organization/incoming-parcels"
              onClick={() => setActiveFlow('INCOMING')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                activeFlow === 'INCOMING'
                  ? 'bg-[#102B50] text-white'
                  : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              <ArrowDownToLine className="h-3.5 w-3.5" />
              Incoming ({incomingCounts.total})
            </Link>
            <Link
              href="/organization/outgoing-parcels"
              onClick={() => setActiveFlow('OUTGOING')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                activeFlow === 'OUTGOING'
                  ? 'bg-[#102B50] text-white'
                  : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              <ArrowUpFromLine className="h-3.5 w-3.5" />
              Outgoing ({outgoingCounts.total})
            </Link>
          </div>

          <button
            type="button"
            className="org-btn org-btn--secondary"
            onClick={() => loadParcelFlowData(true)}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? 'org-icon--spinning' : ''}
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* Stage Summary Cards */}
      {activeFlow === 'INCOMING' ? (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <button
            type="button"
            onClick={() =>
              setIncomingStage(
                incomingStage === 'ARRIVING_FROM_OTHER_BRANCHES'
                  ? 'ALL'
                  : 'ARRIVING_FROM_OTHER_BRANCHES'
              )
            }
            className={`rounded-xl border p-5 text-left transition ${
              incomingStage === 'ARRIVING_FROM_OTHER_BRANCHES'
                ? 'border-[#1677E8] bg-[#EAF3FF]/60 shadow-sm'
                : 'border-[#E5EAF0] bg-white hover:border-[#CBD5E1]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                1. Arriving from Other Branches
              </span>
              <Truck className="h-4 w-4 text-[#1677E8]" />
            </div>
            <p className="mt-2 text-2xl font-bold text-[#102B50]">
              {isLoading ? '—' : incomingCounts.arriving}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Inter-branch linehaul manifests &amp; orders en route
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setIncomingStage(
                incomingStage === 'AWAITING_BRANCH_RECEIPT'
                  ? 'ALL'
                  : 'AWAITING_BRANCH_RECEIPT'
              )
            }
            className={`rounded-xl border p-5 text-left transition ${
              incomingStage === 'AWAITING_BRANCH_RECEIPT'
                ? 'border-[#1677E8] bg-[#EAF3FF]/60 shadow-sm'
                : 'border-[#E5EAF0] bg-white hover:border-[#CBD5E1]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                2. Awaiting Branch Receipt
              </span>
              <Clock className="h-4 w-4 text-[#D97706]" />
            </div>
            <p className="mt-2 text-2xl font-bold text-[#D97706]">
              {isLoading ? '—' : incomingCounts.awaitingReceipt}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Inbound parcels pending destination hub scan
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setIncomingStage(
                incomingStage === 'RECEIVED_BY_BRANCH'
                  ? 'ALL'
                  : 'RECEIVED_BY_BRANCH'
              )
            }
            className={`rounded-xl border p-5 text-left transition ${
              incomingStage === 'RECEIVED_BY_BRANCH'
                ? 'border-[#1677E8] bg-[#EAF3FF]/60 shadow-sm'
                : 'border-[#E5EAF0] bg-white hover:border-[#CBD5E1]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                3. Received by the Branch
              </span>
              <CheckCircle2 className="h-4 w-4 text-[#059669]" />
            </div>
            <p className="mt-2 text-2xl font-bold text-[#059669]">
              {isLoading ? '—' : incomingCounts.received}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Confirmed at destination hub or out for delivery
            </p>
          </button>
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <button
            type="button"
            onClick={() =>
              setOutgoingStage(
                outgoingStage === 'READY_FOR_DISPATCH'
                  ? 'ALL'
                  : 'READY_FOR_DISPATCH'
              )
            }
            className={`rounded-xl border p-5 text-left transition ${
              outgoingStage === 'READY_FOR_DISPATCH'
                ? 'border-[#1677E8] bg-[#EAF3FF]/60 shadow-sm'
                : 'border-[#E5EAF0] bg-white hover:border-[#CBD5E1]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                1. Parcels Ready for Dispatch
              </span>
              <Package className="h-4 w-4 text-[#1677E8]" />
            </div>
            <p className="mt-2 text-2xl font-bold text-[#1677E8]">
              {isLoading ? '—' : outgoingCounts.readyForDispatch}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              At origin branch awaiting manifest or courier pickup
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setOutgoingStage(
                outgoingStage === 'HANDED_OVER_TO_TRANSPORT'
                  ? 'ALL'
                  : 'HANDED_OVER_TO_TRANSPORT'
              )
            }
            className={`rounded-xl border p-5 text-left transition ${
              outgoingStage === 'HANDED_OVER_TO_TRANSPORT'
                ? 'border-[#1677E8] bg-[#EAF3FF]/60 shadow-sm'
                : 'border-[#E5EAF0] bg-white hover:border-[#CBD5E1]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                2. Handed Over to Transportation
              </span>
              <Truck className="h-4 w-4 text-[#102B50]" />
            </div>
            <p className="mt-2 text-2xl font-bold text-[#102B50]">
              {isLoading ? '—' : outgoingCounts.handedOver}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Dispatched on active transport manifests or courier routes
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setOutgoingStage(
                outgoingStage === 'TRANSFERRED_TO_ANOTHER_BRANCH'
                  ? 'ALL'
                  : 'TRANSFERRED_TO_ANOTHER_BRANCH'
              )
            }
            className={`rounded-xl border p-5 text-left transition ${
              outgoingStage === 'TRANSFERRED_TO_ANOTHER_BRANCH'
                ? 'border-[#1677E8] bg-[#EAF3FF]/60 shadow-sm'
                : 'border-[#E5EAF0] bg-white hover:border-[#CBD5E1]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                3. Transferred to Another Branch
              </span>
              <CheckCircle2 className="h-4 w-4 text-[#059669]" />
            </div>
            <p className="mt-2 text-2xl font-bold text-[#059669]">
              {isLoading ? '—' : outgoingCounts.transferred}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Received and verified by destination branch hub
            </p>
          </button>
        </div>
      )}

      {/* Search & Stage Filter Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5EAF0] bg-white p-4 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by tracking number, order ID, manifest code, or courier..."
            className="w-full rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] py-2 pl-9 pr-3 text-xs text-[#111827] placeholder-[#64748B] focus:border-[#1677E8] focus:bg-white focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setIncomingStage('ALL');
            setOutgoingStage('ALL');
            setSearchQuery('');
          }}
          className="rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] px-3 py-2 text-xs font-semibold text-[#111827] hover:bg-[#E5EAF0]"
        >
          Show All Stages
        </button>
      </div>

      {/* Parcels Table */}
      <section className="org-directory-card" aria-label="Branch parcel flow table">
        {isLoading ? (
          <div className="org-state-box" role="status">
            <span className="org-spinner" aria-hidden="true" />
            <p className="org-state-box__title">Loading branch parcel flow...</p>
          </div>
        ) : error ? (
          <div className="org-state-box org-state-box--error" role="alert">
            <div className="org-state-box__icon org-state-box__icon--error">
              <AlertCircle size={22} />
            </div>
            <h3 className="org-state-box__title">Unable to load parcel flow</h3>
            <p className="org-state-box__desc">{error}</p>
          </div>
        ) : displayedRecords.length === 0 ? (
          <div className="org-state-box">
            <div className="org-state-box__icon">
              <Package size={22} />
            </div>
            <h3 className="org-state-box__title">
              No {activeFlow.toLowerCase()} parcels in this stage
            </h3>
            <p className="org-state-box__desc">
              No parcels matched the selected {activeFlow.toLowerCase()} operational
              stage for Branch #{effectiveBranchId}.
            </p>
          </div>
        ) : (
          <div className="org-table-wrapper">
            <table className="org-table" aria-label="Parcel flow records">
              <thead>
                <tr>
                  <th scope="col">Tracking / Order ID</th>
                  <th scope="col">Operational Stage</th>
                  <th scope="col">Origin → Destination</th>
                  <th scope="col">Backend Status</th>
                  <th scope="col">Manifest / Courier</th>
                  <th scope="col">Last Updated</th>
                  <th scope="col" className="org-table__th--actions">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedRecords.map((rec) => (
                  <tr key={rec.key} className="org-table__row">
                    <td data-label="Tracking / Order ID">
                      <span className="org-branch-code">{rec.trackingNumber}</span>
                      <div className="mt-0.5 text-[11px] text-[#64748B]">
                        Order #{rec.orderId}
                        {rec.weightKg ? ` · ${rec.weightKg} kg` : ''}
                      </div>
                    </td>

                    <td data-label="Operational Stage">
                      <span className="inline-flex rounded-full border border-[#BFDBFE] bg-[#EAF3FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#102B50]">
                        {rec.stageLabel}
                      </span>
                    </td>

                    <td data-label="Origin → Destination">
                      <span className="text-xs font-medium text-[#111827]">
                        {rec.originBranchLabel} → {rec.destinationBranchLabel}
                      </span>
                    </td>

                    <td data-label="Backend Status">
                      <code className="rounded bg-[#F5F7FA] px-2 py-0.5 text-[11px] font-semibold text-[#475569]">
                        {rec.backendStatus}
                      </code>
                    </td>

                    <td data-label="Manifest / Courier">
                      <div className="text-xs text-[#111827]">
                        {rec.manifestCode ? (
                          <span className="font-mono font-semibold text-[#1677E8]">
                            {rec.manifestCode}
                          </span>
                        ) : (
                          'Direct / Local'
                        )}
                      </div>
                      {rec.courierName && (
                        <div className="text-[11px] text-[#64748B]">
                          Courier: {rec.courierName}
                        </div>
                      )}
                    </td>

                    <td data-label="Last Updated">
                      <span className="text-xs text-[#64748B]">
                        {formatDateTime(rec.updatedAt)}
                      </span>
                    </td>

                    <td data-label="Action" className="org-table__td--actions">
                      <Link
                        href={`/bookings/${rec.orderId}`}
                        className="org-action-btn"
                      >
                        <ExternalLink size={14} />
                        <span>Order</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
