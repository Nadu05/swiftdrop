'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Info,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  Users,
} from 'lucide-react';
import {
  dispatchApi,
  type AssignmentRecordDto,
  type CourierProfileDto,
  type TransferManifestDto,
} from '@/api/services/dispatch.api';
import { getAdminUsers } from '@/api/services/admin.api';
import { useBranchAdminContext } from './useBranchAdminContext';
import BranchScopeBanner from './BranchScopeBanner';

interface ReadOnlyDispatcherRow {
  id: string;
  name: string;
  emailOrRole: string;
  recentActivityLabel: string;
}

export default function BranchFleetOverview() {
  const {
    permissions,
    effectiveBranchId,
    branch,
    allBranches,
    isLoadingBranch,
    selectBranchForInspection,
  } = useBranchAdminContext();

  const [couriers, setCouriers] = useState<CourierProfileDto[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecordDto[]>([]);
  const [manifests, setManifests] = useState<TransferManifestDto[]>([]);
  const [identityDispatchers, setIdentityDispatchers] = useState<
    ReadOnlyDispatcherRow[]
  >([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadFleetData = useCallback(
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
        const [couriersRes, assignmentsRes, manifestsRes, usersRes] =
          await Promise.allSettled([
            dispatchApi.getCouriers(effectiveBranchId),
            dispatchApi.getAssignments({ branchId: effectiveBranchId }),
            dispatchApi.listTransferManifests({ branchId: effectiveBranchId }),
            getAdminUsers({ page: 0, size: 100 }),
          ]);

        if (couriersRes.status === 'fulfilled') {
          setCouriers(
            couriersRes.value.filter(
              (c) => !c.branchId || Number(c.branchId) === Number(effectiveBranchId)
            )
          );
        } else {
          setCouriers([]);
          setError(
            couriersRes.reason instanceof Error
              ? couriersRes.reason.message
              : 'Unable to load branch courier fleet from Dispatch Service.'
          );
        }

        if (assignmentsRes.status === 'fulfilled') {
          setAssignments(
            assignmentsRes.value.filter(
              (a) => !a.branchId || Number(a.branchId) === Number(effectiveBranchId)
            )
          );
        } else {
          setAssignments([]);
        }

        if (manifestsRes.status === 'fulfilled') {
          setManifests(manifestsRes.value);
        } else {
          setManifests([]);
        }

        if (usersRes.status === 'fulfilled') {
          const branchDispatchers = (usersRes.value.content || [])
            .filter(
              (u) =>
                Number(u.branchId) === Number(effectiveBranchId) &&
                (u.roles || []).some((r) =>
                  r.toUpperCase().includes('DISPATCHER')
                )
            )
            .map((u) => ({
              id: u.userId,
              name: u.fullName,
              emailOrRole: u.email,
              recentActivityLabel: `Account status: ${u.accountStatus}`,
            }));
          setIdentityDispatchers(branchDispatchers);
        } else {
          setIdentityDispatchers([]);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [effectiveBranchId]
  );

  useEffect(() => {
    loadFleetData(false);
  }, [loadFleetData]);

  // Combine registered dispatchers from Identity Service (when authorized) + manifest/assignment audit metadata
  const registeredDispatchers = useMemo<ReadOnlyDispatcherRow[]>(() => {
    const map = new Map<string, ReadOnlyDispatcherRow>();
    for (const d of identityDispatchers) {
      map.set(d.name.toLowerCase(), d);
    }

    for (const m of manifests) {
      if (
        Number(m.originBranchId) === Number(effectiveBranchId) &&
        m.originHandoverByName
      ) {
        const key = m.originHandoverByName.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: m.originHandoverById || m.originHandoverByName,
            name: m.originHandoverByName,
            emailOrRole: 'Branch Dispatcher (Manifest Handover)',
            recentActivityLabel: `Manifest ${m.manifestCode}`,
          });
        }
      }
      if (
        Number(m.destinationBranchId) === Number(effectiveBranchId) &&
        m.destinationReceivedByName
      ) {
        const key = m.destinationReceivedByName.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: m.destinationReceivedById || m.destinationReceivedByName,
            name: m.destinationReceivedByName,
            emailOrRole: 'Branch Dispatcher (Manifest Receipt)',
            recentActivityLabel: `Received ${m.manifestCode}`,
          });
        }
      }
    }

    for (const a of assignments) {
      for (const h of a.history || []) {
        if (h.assignedBy) {
          const key = h.assignedBy.toLowerCase();
          if (!map.has(key)) {
            map.set(key, {
              id: h.assignedBy,
              name: h.assignedBy,
              emailOrRole: 'Branch Dispatcher',
              recentActivityLabel: `Assignment ${a.assignmentCode || a.assignmentId}`,
            });
          }
        }
      }
    }

    return Array.from(map.values());
  }, [identityDispatchers, manifests, assignments, effectiveBranchId]);

  const summary = useMemo(() => {
    const total = couriers.length;
    const available = couriers.filter((c) => c.status === 'AVAILABLE').length;
    const busy = couriers.filter((c) => c.status === 'BUSY').length;
    const offline = couriers.filter(
      (c) => c.status === 'OFFLINE' || c.status === 'ON_BREAK'
    ).length;

    return {
      totalCouriers: total,
      availableCouriers: available,
      busyCouriers: busy,
      offlineCouriers: offline,
      registeredDispatchers: registeredDispatchers.length,
    };
  }, [couriers, registeredDispatchers]);

  const filteredCouriers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return couriers.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) {
        return false;
      }
      if (q.length > 0) {
        return (
          c.name.toLowerCase().includes(q) ||
          c.courierCode.toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q) ||
          (c.vehicleType || '').toLowerCase().includes(q) ||
          (c.vehiclePlate || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [couriers, statusFilter, searchQuery]);

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
            Branch Administration / Read-Only Operational Workforce
          </p>
          <h1 className="org-page-header__title">
            Courier &amp; Dispatcher Overview
          </h1>
          <p className="org-page-header__subtitle">
            Read-only operational summary of couriers and dispatchers associated
            with{' '}
            {branch ? `${branch.name} (${branch.code})` : `Branch #${effectiveBranchId}`}.
          </p>
        </div>

        <div className="org-page-header__actions">
          <button
            type="button"
            className="org-btn org-btn--secondary"
            onClick={() => loadFleetData(true)}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? 'org-icon--spinning' : ''}
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Telemetry'}</span>
          </button>
        </div>
      </header>

      {/* Strict Separation of Responsibilities Notice */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#BFDBFE] bg-[#EAF3FF]/80 px-4 py-3.5 text-xs text-[#1E3A8A]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1677E8]" />
        <div>
          <span className="font-semibold text-[#102B50]">
            Read-Only Operational Summary:
          </span>{' '}
          Reviewing delivery requests, selecting eligible couriers, assigning
          couriers, confirming assignments, and managing dispatch workflows are
          handled exclusively by the <strong>Dispatcher Module</strong>.
        </div>
      </div>

      {/* 5 Required Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-[#E5EAF0] bg-white p-4 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Total Registered Couriers
          </span>
          <p className="mt-2 text-2xl font-bold text-[#111827]">
            {isLoading ? '—' : summary.totalCouriers}
          </p>
          <p className="mt-0.5 text-xs text-[#64748B]">Assigned to this hub</p>
        </div>

        <div className="rounded-xl border border-[#E5EAF0] bg-white p-4 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#047857]">
            Available Couriers
          </span>
          <p className="mt-2 text-2xl font-bold text-[#059669]">
            {isLoading ? '—' : summary.availableCouriers}
          </p>
          <p className="mt-0.5 text-xs text-[#64748B]">Ready for dispatch</p>
        </div>

        <div className="rounded-xl border border-[#E5EAF0] bg-white p-4 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#1677E8]">
            Busy Couriers
          </span>
          <p className="mt-2 text-2xl font-bold text-[#1677E8]">
            {isLoading ? '—' : summary.busyCouriers}
          </p>
          <p className="mt-0.5 text-xs text-[#64748B]">Executing active routes</p>
        </div>

        <div className="rounded-xl border border-[#E5EAF0] bg-white p-4 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Offline / Break
          </span>
          <p className="mt-2 text-2xl font-bold text-[#475569]">
            {isLoading ? '—' : summary.offlineCouriers}
          </p>
          <p className="mt-0.5 text-xs text-[#64748B]">Off-shift or on break</p>
        </div>

        <div className="rounded-xl border border-[#E5EAF0] bg-white p-4 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#102B50]">
            Registered Dispatchers
          </span>
          <p className="mt-2 text-2xl font-bold text-[#102B50]">
            {isLoading ? '—' : summary.registeredDispatchers}
          </p>
          <p className="mt-0.5 text-xs text-[#64748B]">Branch dispatch staff</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5EAF0] bg-white p-4 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter couriers by name, courier code, vehicle, or phone..."
            className="w-full rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] py-2 pl-9 pr-3 text-xs text-[#111827] placeholder-[#64748B] focus:border-[#1677E8] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['ALL', 'AVAILABLE', 'BUSY', 'ON_BREAK', 'OFFLINE'] as const).map(
            (st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === st
                    ? 'bg-[#102B50] text-white'
                    : 'border border-[#E5EAF0] bg-[#F5F7FA] text-[#64748B] hover:text-[#111827]'
                }`}
              >
                {st}
              </button>
            )
          )}
        </div>
      </div>

      {/* Read-Only Courier Fleet Table */}
      <section className="org-directory-card mb-6" aria-label="Branch courier fleet">
        <div className="org-directory-card__header">
          <div className="org-directory-card__title-group">
            <h2 className="org-directory-card__title">
              Branch Courier Fleet (Read-Only)
            </h2>
            <p className="org-directory-card__subtitle">
              Live status and workload capacity from{' '}
              <code>GET /api/v1/dispatch/couriers?branchId={effectiveBranchId}</code>
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="org-state-box" role="status">
            <span className="org-spinner" aria-hidden="true" />
            <p className="org-state-box__title">Loading branch courier fleet...</p>
          </div>
        ) : error ? (
          <div className="org-state-box org-state-box--error" role="alert">
            <div className="org-state-box__icon org-state-box__icon--error">
              <AlertCircle size={22} />
            </div>
            <h3 className="org-state-box__title">Unable to load courier fleet</h3>
            <p className="org-state-box__desc">{error}</p>
          </div>
        ) : filteredCouriers.length === 0 ? (
          <div className="org-state-box">
            <div className="org-state-box__icon">
              <Truck size={22} />
            </div>
            <h3 className="org-state-box__title">No couriers found</h3>
            <p className="org-state-box__desc">
              No branch couriers matched the selected status filter.
            </p>
          </div>
        ) : (
          <div className="org-table-wrapper">
            <table className="org-table" aria-label="Read-only courier fleet">
              <thead>
                <tr>
                  <th scope="col">Courier Code</th>
                  <th scope="col">Courier Name</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Vehicle</th>
                  <th scope="col">Operational Status</th>
                  <th scope="col">Active Load / Capacity</th>
                  <th scope="col">Completed Today</th>
                </tr>
              </thead>
              <tbody>
                {filteredCouriers.map((courier) => {
                  const utilPct =
                    courier.maxCapacity > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (courier.activeDeliveries / courier.maxCapacity) * 100
                          )
                        )
                      : 0;

                  return (
                    <tr key={courier.id} className="org-table__row">
                      <td data-label="Courier Code">
                        <span className="org-branch-code">
                          {courier.courierCode}
                        </span>
                      </td>

                      <td data-label="Courier Name">
                        <div className="font-semibold text-[#111827]">
                          {courier.name}
                        </div>
                        {courier.zone && (
                          <div className="text-[11px] text-[#64748B]">
                            Zone: {courier.zone}
                          </div>
                        )}
                      </td>

                      <td data-label="Contact">
                        <span className="inline-flex items-center gap-1.5 text-xs text-[#475569]">
                          <Phone className="h-3 w-3 text-[#64748B]" />
                          {courier.phone || '—'}
                        </span>
                      </td>

                      <td data-label="Vehicle">
                        <div className="text-xs font-medium text-[#111827]">
                          {courier.vehicleType}
                        </div>
                        {courier.vehiclePlate && (
                          <div className="font-mono text-[11px] text-[#64748B]">
                            {courier.vehiclePlate}
                          </div>
                        )}
                      </td>

                      <td data-label="Operational Status">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                            courier.status === 'AVAILABLE'
                              ? 'border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]'
                              : courier.status === 'BUSY'
                                ? 'border-[#BFDBFE] bg-[#EAF3FF] text-[#1677E8]'
                                : 'border-[#E2E8F0] bg-[#F1F5F9] text-[#475569]'
                          }`}
                        >
                          {courier.status}
                        </span>
                      </td>

                      <td data-label="Active Load / Capacity">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-[#E5EAF0]">
                            <div
                              className="h-full rounded-full bg-[#1677E8]"
                              style={{ width: `${utilPct}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-[#111827]">
                            {courier.activeDeliveries} / {courier.maxCapacity}
                          </span>
                        </div>
                      </td>

                      <td data-label="Completed Today">
                        <span className="text-xs font-bold text-[#059669]">
                          {courier.completedToday}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Registered Dispatchers Summary */}
      <section className="org-directory-card" aria-label="Branch dispatchers summary">
        <div className="org-directory-card__header">
          <div className="org-directory-card__title-group">
            <h2 className="org-directory-card__title">
              Branch Dispatchers (Read-Only)
            </h2>
            <p className="org-directory-card__subtitle">
              Dispatchers associated with Branch #{effectiveBranchId}
            </p>
          </div>
        </div>

        {registeredDispatchers.length === 0 ? (
          <div className="p-6 text-xs text-[#64748B]">
            No dispatcher records currently surfaced for Branch #{effectiveBranchId}.
            Dispatchers who execute assignments or manifest handovers at this hub
            will be listed here automatically.
          </div>
        ) : (
          <div className="org-table-wrapper">
            <table className="org-table" aria-label="Branch dispatchers">
              <thead>
                <tr>
                  <th scope="col">Dispatcher ID</th>
                  <th scope="col">Name</th>
                  <th scope="col">Contact / Role Context</th>
                  <th scope="col">Recent Branch Activity</th>
                </tr>
              </thead>
              <tbody>
                {registeredDispatchers.map((d) => (
                  <tr key={d.id} className="org-table__row">
                    <td data-label="Dispatcher ID">
                      <span className="org-branch-code">
                        {String(d.id).slice(0, 10)}
                      </span>
                    </td>
                    <td data-label="Name">
                      <span className="font-semibold text-[#111827]">
                        {d.name}
                      </span>
                    </td>
                    <td data-label="Contact / Role Context">{d.emailOrRole}</td>
                    <td data-label="Recent Branch Activity">
                      <span className="text-xs text-[#64748B]">
                        {d.recentActivityLabel}
                      </span>
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
