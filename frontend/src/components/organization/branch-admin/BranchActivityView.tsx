'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Info,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { getCustomerOrders } from '@/api/services/orders.api';
import {
  dispatchApi,
  type ParcelCustodyRecordDto,
  type PickupTaskDto,
  type TransferManifestDto,
} from '@/api/services/dispatch.api';
import { getAdminUsers } from '@/api/services/admin.api';
import type { OrderResponse } from '@/types/order.types';
import type { AdminUser } from '@/types/admin.types';
import { isOrderAuthorizedForBranch } from '@/lib/auth/branch-admin-permissions';
import { useBranchAdminContext } from './useBranchAdminContext';
import BranchScopeBanner from './BranchScopeBanner';

type ActivityCategory =
  | 'ALL'
  | 'PARCEL_RECEIVED'
  | 'PARCEL_DISPATCHED'
  | 'STAFF_AND_PERMISSIONS'
  | 'BRANCH_OPERATIONS';

interface BranchActivityEvent {
  id: string;
  category: Exclude<ActivityCategory, 'ALL'>;
  title: string;
  description: string;
  actor: string;
  reference: string;
  timestamp: string;
}

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
    second: '2-digit',
  }).format(d);
}

export default function BranchActivityView() {
  const {
    permissions,
    effectiveBranchId,
    branch,
    allBranches,
    isLoadingBranch,
    selectBranchForInspection,
  } = useBranchAdminContext();

  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [manifests, setManifests] = useState<TransferManifestDto[]>([]);
  const [pickupTasks, setPickupTasks] = useState<PickupTaskDto[]>([]);
  const [custodyRecords, setCustodyRecords] = useState<ParcelCustodyRecordDto[]>(
    []
  );
  const [branchUsers, setBranchUsers] = useState<AdminUser[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<ActivityCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadActivityData = useCallback(
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
        const [ordersRes, manifestsRes, pickupsRes, custodyRes, usersRes] =
          await Promise.allSettled([
            getCustomerOrders(),
            dispatchApi.listTransferManifests({ branchId: effectiveBranchId }),
            dispatchApi.getPickupTasks({ branchId: effectiveBranchId }),
            dispatchApi.getCustodyRecords(),
            getAdminUsers({ page: 0, size: 100 }),
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

        if (custodyRes.status === 'fulfilled') {
          setCustodyRecords(
            custodyRes.value.filter(
              (c) =>
                !c.branchId || Number(c.branchId) === Number(effectiveBranchId)
            )
          );
        } else {
          setCustodyRecords([]);
        }

        if (usersRes.status === 'fulfilled') {
          setBranchUsers(
            (usersRes.value.content || []).filter(
              (u) => Number(u.branchId) === Number(effectiveBranchId)
            )
          );
        } else {
          setBranchUsers([]);
        }

        if (ordersRes.status === 'rejected' && manifestsRes.status === 'rejected') {
          setError(
            ordersRes.reason instanceof Error
              ? ordersRes.reason.message
              : 'Unable to load branch activity events from backend services.'
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
    loadActivityData(false);
  }, [loadActivityData]);

  // ── Aggregate Real Branch-Scoped Events ──────────────────────────────────
  const events = useMemo<BranchActivityEvent[]>(() => {
    if (!effectiveBranchId) return [];
    const list: BranchActivityEvent[] = [];

    // 1. Transfer Manifest Events (Dispatched & Received)
    for (const m of manifests) {
      const isOrigin = Number(m.originBranchId) === Number(effectiveBranchId);
      const isDest = Number(m.destinationBranchId) === Number(effectiveBranchId);

      if (isOrigin && (m.departureAt || m.originHandoverAt)) {
        list.push({
          id: `manifest-depart-${m.id}`,
          category: 'PARCEL_DISPATCHED',
          title: `Transfer Manifest Dispatched (${m.manifestCode})`,
          description: `Handed over ${m.expectedParcelCount} parcel(s) bound for ${
            m.destinationBranchName || `Hub #${m.destinationBranchId}`
          }.`,
          actor: m.originHandoverByName || m.assignedCourierName || 'Branch Dispatcher',
          reference: m.manifestCode,
          timestamp: m.departureAt || m.originHandoverAt || m.createdAt || '',
        });
      }

      if (isDest && m.destinationReceivedAt) {
        list.push({
          id: `manifest-recv-${m.id}`,
          category: 'PARCEL_RECEIVED',
          title: `Inbound Transfer Manifest Received (${m.manifestCode})`,
          description: `Verified ${m.receivedParcelCount} of ${m.expectedParcelCount} parcel(s) from ${
            m.originBranchName || `Hub #${m.originBranchId}`
          }.`,
          actor: m.destinationReceivedByName || 'Branch Staff',
          reference: m.manifestCode,
          timestamp: m.destinationReceivedAt,
        });
      }
    }

    // 2. Pickup Task Branch Drop-off & Pickup Confirmations
    for (const p of pickupTasks) {
      if (p.branchConfirmedAt) {
        list.push({
          id: `pickup-dropoff-${p.id}`,
          category: 'PARCEL_RECEIVED',
          title: `Parcel Received at Origin Branch (${p.trackingNumber})`,
          description: `Merchant/courier drop-off confirmed at Branch #${effectiveBranchId}.`,
          actor: p.assignedCourierName || p.merchantName || 'Branch Hub Staff',
          reference: p.trackingNumber,
          timestamp: p.branchConfirmedAt,
        });
      }
      if (p.pickedUpAt) {
        list.push({
          id: `pickup-collected-${p.id}`,
          category: 'PARCEL_DISPATCHED',
          title: `Parcel Collected by Courier (${p.trackingNumber})`,
          description: `Pickup task ${p.taskCode || p.id} collected from ${
            p.pickupAddress || p.pickupCity || 'sender'
          }.`,
          actor: p.assignedCourierName || 'Assigned Courier',
          reference: p.trackingNumber,
          timestamp: p.pickedUpAt,
        });
      }
    }

    // 3. Parcel Custody Records scoped to this branch
    for (const c of custodyRecords) {
      if (c.branchId && Number(c.branchId) !== Number(effectiveBranchId)) continue;
      const ts = c.recordedAt || c.createdAt || '';
      if (!ts) continue;
      const isRecv = (c.actionType || '').toUpperCase().includes('RECEIVE');
      list.push({
        id: `custody-${c.id}`,
        category: isRecv ? 'PARCEL_RECEIVED' : 'PARCEL_DISPATCHED',
        title: `Custody ${c.actionType || 'Transfer'}: ${
          c.trackingNumber || c.parcelReference || `#${c.orderId}`
        }`,
        description:
          c.notes ||
          `Custody moved from ${c.fromHolderName || c.fromHolderType || 'Origin'} to ${
            c.toHolderName || c.toHolderType || 'Receiver'
          }.`,
        actor: c.toHolderName || c.fromHolderName || 'Branch Personnel',
        reference: c.trackingNumber || c.manifestCode || String(c.id),
        timestamp: ts,
      });
    }

    // 4. Order Tracking Events for orders belonging to this branch
    for (const o of orders) {
      for (const ev of o.trackingEvents || []) {
        const s = (ev.status || '').toUpperCase();
        const cat: BranchActivityEvent['category'] = [
          'AT_ORIGIN_BRANCH',
          'AT_DESTINATION_BRANCH',
          'DELIVERED',
        ].includes(s)
          ? 'PARCEL_RECEIVED'
          : ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(s)
            ? 'PARCEL_DISPATCHED'
            : 'BRANCH_OPERATIONS';

        list.push({
          id: `track-${o.id}-${ev.id}`,
          category: cat,
          title: `${o.trackingNumber} → ${ev.status}`,
          description: ev.description || `Parcel status transitioned to ${ev.status}`,
          actor: ev.location || `Branch #${effectiveBranchId}`,
          reference: o.trackingNumber,
          timestamp: ev.timestamp || o.updatedAt || o.createdAt || '',
        });
      }
    }

    // 5. Branch Staff Account Registrations & Role State (when Identity Service is accessible)
    for (const u of branchUsers) {
      if (u.createdAt) {
        list.push({
          id: `staff-user-${u.userId}`,
          category: 'STAFF_AND_PERMISSIONS',
          title: `Branch Staff Account Active: ${u.fullName}`,
          description: `Roles: ${(u.roles || []).join(', ')} · Status: ${u.accountStatus}`,
          actor: u.email,
          reference: u.userId.slice(0, 8).toUpperCase(),
          timestamp: u.createdAt,
        });
      }
    }

    // 6. Branch Record Update Event from Organization Service
    if (branch?.updatedAt) {
      list.push({
        id: `branch-record-${branch.id}`,
        category: 'BRANCH_OPERATIONS',
        title: `Branch Configuration Synced (${branch.code})`,
        description: `${branch.name} operational status verified as ${branch.status}.`,
        actor: 'Organization Service',
        reference: branch.code,
        timestamp: branch.updatedAt,
      });
    }

    return list.sort((a, b) => {
      const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tB - tA;
    });
  }, [
    effectiveBranchId,
    manifests,
    pickupTasks,
    custodyRecords,
    orders,
    branchUsers,
    branch,
  ]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((ev) => {
      if (categoryFilter !== 'ALL' && ev.category !== categoryFilter) {
        return false;
      }
      if (q.length > 0) {
        return (
          ev.title.toLowerCase().includes(q) ||
          ev.description.toLowerCase().includes(q) ||
          ev.reference.toLowerCase().includes(q) ||
          ev.actor.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [events, categoryFilter, searchQuery]);

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
            Branch Administration / Scoped Audit &amp; Operational Trail
          </p>
          <h1 className="org-page-header__title">Branch Activity Log</h1>
          <p className="org-page-header__subtitle">
            Chronological log of branch-specific parcel receipts, dispatches,
            custody handovers, and staff account events for{' '}
            {branch ? `${branch.name} (${branch.code})` : `Branch #${effectiveBranchId}`}.
            Global system audit logs are excluded.
          </p>
        </div>

        <div className="org-page-header__actions">
          <button
            type="button"
            className="org-btn org-btn--secondary"
            onClick={() => loadActivityData(true)}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? 'org-icon--spinning' : ''}
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Activity'}</span>
          </button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5EAF0] bg-white p-4 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search branch events by tracking ID, manifest code, staff actor, or description..."
            className="w-full rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] py-2 pl-9 pr-3 text-xs text-[#111827] placeholder-[#64748B] focus:border-[#1677E8] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'ALL', label: 'All Branch Events' },
              { id: 'PARCEL_RECEIVED', label: 'Parcel Received' },
              { id: 'PARCEL_DISPATCHED', label: 'Parcel Dispatched' },
              { id: 'STAFF_AND_PERMISSIONS', label: 'Staff & Permissions' },
              { id: 'BRANCH_OPERATIONS', label: 'Branch Operations' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                categoryFilter === tab.id
                  ? 'bg-[#102B50] text-white'
                  : 'border border-[#E5EAF0] bg-[#F5F7FA] text-[#64748B] hover:text-[#111827]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <section className="org-directory-card" aria-label="Branch activity timeline">
        {isLoading ? (
          <div className="org-state-box" role="status">
            <span className="org-spinner" aria-hidden="true" />
            <p className="org-state-box__title">Loading branch activity log...</p>
          </div>
        ) : error ? (
          <div className="org-state-box org-state-box--error" role="alert">
            <div className="org-state-box__icon org-state-box__icon--error">
              <AlertCircle size={22} />
            </div>
            <h3 className="org-state-box__title">Unable to load branch activity</h3>
            <p className="org-state-box__desc">{error}</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="org-state-box">
            <div className="org-state-box__icon">
              <Activity size={22} />
            </div>
            <h3 className="org-state-box__title">No branch activity events found</h3>
            <p className="org-state-box__desc">
              No branch-scoped events matched your current filter for Branch #
              {effectiveBranchId}.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5EAF0]">
            {filteredEvents.slice(0, 60).map((ev) => (
              <div
                key={ev.id}
                className="flex flex-col justify-between gap-3 px-6 py-4 transition hover:bg-[#F5F7FA] sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      ev.category === 'PARCEL_RECEIVED'
                        ? 'bg-[#ECFDF5] text-[#059669]'
                        : ev.category === 'PARCEL_DISPATCHED'
                          ? 'bg-[#EAF3FF] text-[#1677E8]'
                          : ev.category === 'STAFF_AND_PERMISSIONS'
                            ? 'bg-[#EAF3FF] text-[#102B50]'
                            : 'bg-[#F8FAFC] text-[#475569]'
                    }`}
                  >
                    {ev.category === 'PARCEL_RECEIVED' ? (
                      <ArrowDownToLine className="h-4 w-4" />
                    ) : ev.category === 'PARCEL_DISPATCHED' ? (
                      <ArrowUpFromLine className="h-4 w-4" />
                    ) : ev.category === 'STAFF_AND_PERMISSIONS' ? (
                      <UserCheck className="h-4 w-4" />
                    ) : (
                      <Package className="h-4 w-4" />
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-[#111827]">
                        {ev.title}
                      </span>
                      <span className="org-branch-code">{ev.reference}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#64748B]">
                      {ev.description}
                    </p>
                    <p className="mt-1 text-[11px] text-[#94A3B8]">
                      Actor / Location: <strong className="text-[#475569]">{ev.actor}</strong>
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right text-xs text-[#64748B]">
                  {formatDateTime(ev.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Documented Audit Integration Point */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#DCE5F2] bg-white p-4 text-xs text-[#475569] shadow-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1677E8]" />
        <div>
          <span className="font-semibold text-[#102B50]">
            Branch Activity &amp; Audit Isolation Note:
          </span>{' '}
          Events above are aggregated strictly from branch-scoped custody records (
          <code>GET /api/v1/dispatch/custody</code>), transfer manifests (
          <code>GET /api/v1/dispatch/transfers/manifests?branchId={effectiveBranchId}</code>
          ), and branch order tracking histories. Global system audit logs are never
          fetched or displayed here. When a dedicated branch audit stream endpoint (
          <code>
            GET /api/v1/organization/branches/{effectiveBranchId ?? '{branchId}'}/audit-logs
          </code>
          ) is added to the backend, staff permission change events will also stream
          directly into this timeline.
        </div>
      </div>
    </div>
  );
}
