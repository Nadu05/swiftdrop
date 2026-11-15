'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Info,
  KeyRound,
  Mail,
  Phone,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  activateUser,
  assignUserRole,
  createAdminUser,
  getAdminUsers,
  suspendUser,
  updateAdminUser,
} from '@/api/services/admin.api';
import {
  dispatchApi,
  type CourierProfileDto,
  type TransferManifestDto,
} from '@/api/services/dispatch.api';
import type { AdminUser } from '@/types/admin.types';
import { useAuthStore } from '@/store/auth.store';
import { useBranchAdminContext } from './useBranchAdminContext';
import BranchScopeBanner from './BranchScopeBanner';

export type BranchAssignableRole = 'DISPATCHER' | 'COURIER' | 'BRANCH_MANAGER';

export interface UnifiedBranchStaffMember {
  key: string;
  userId?: string;
  employeeCode: string;
  fullName: string;
  category: 'DISPATCHER' | 'COURIER' | 'BRANCH_PERSONNEL';
  roles: string[];
  email?: string | null;
  phone?: string | null;
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' | string;
  availability?: 'AVAILABLE' | 'BUSY' | 'ON_BREAK' | 'OFFLINE' | null;
  branchId: number;
  vehicleType?: string;
  vehiclePlate?: string;
  activeDeliveries?: number;
  maxCapacity?: number;
  completedToday?: number;
  source: 'IDENTITY_AND_DISPATCH' | 'IDENTITY_SERVICE' | 'DISPATCH_SERVICE' | 'SESSION_CONTEXT';
}

const BRANCH_ASSIGNABLE_ROLES: { value: BranchAssignableRole; label: string; desc: string }[] = [
  {
    value: 'DISPATCHER',
    label: 'Dispatcher',
    desc: 'Reviews delivery requests, selects eligible couriers, and manages dispatch assignments.',
  },
  {
    value: 'COURIER',
    label: 'Courier',
    desc: 'Executes assigned pickup tasks, inter-branch linehaul, and last-mile deliveries.',
  },
  {
    value: 'BRANCH_MANAGER',
    label: 'Branch Administrator',
    desc: 'Monitors branch operations, incoming/outgoing parcels, and branch staff.',
  },
];

function getAvailabilityBadge(status?: string | null) {
  if (!status) {
    return (
      <span className="inline-flex rounded-full border border-[#E5EAF0] bg-[#F8FAFC] px-2.5 py-0.5 text-[11px] font-medium text-[#64748B]">
        Not Reported
      </span>
    );
  }
  const s = status.toUpperCase();
  if (s === 'AVAILABLE') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-semibold text-[#047857]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
        AVAILABLE
      </span>
    );
  }
  if (s === 'BUSY') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BFDBFE] bg-[#EAF3FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#1677E8]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#1677E8]" />
        BUSY
      </span>
    );
  }
  if (s === 'ON_BREAK') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-0.5 text-[11px] font-semibold text-[#B45309]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
        ON BREAK
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-[#F1F5F9] px-2.5 py-0.5 text-[11px] font-semibold text-[#475569]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#94A3B8]" />
      {s}
    </span>
  );
}

export default function BranchStaffManagement() {
  const currentUser = useAuthStore((s) => s.user);
  const {
    permissions,
    effectiveBranchId,
    branch,
    allBranches,
    isLoadingBranch,
    selectBranchForInspection,
  } = useBranchAdminContext();

  const [identityUsers, setIdentityUsers] = useState<AdminUser[]>([]);
  const [couriers, setCouriers] = useState<CourierProfileDto[]>([]);
  const [manifests, setManifests] = useState<TransferManifestDto[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [identityRbacNotice, setIdentityRbacNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<
    'ALL' | 'DISPATCHER' | 'COURIER' | 'BRANCH_PERSONNEL'
  >('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Action feedback banners
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Modals
  const [selectedStaff, setSelectedStaff] = useState<UnifiedBranchStaffMember | null>(
    null
  );
  const [permissionsModalStaff, setPermissionsModalStaff] =
    useState<UnifiedBranchStaffMember | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);

  // Create Staff Account Form State
  const [createForm, setCreateForm] = useState<{
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: BranchAssignableRole;
  }>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'DISPATCHER',
  });

  const loadStaffData = useCallback(
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
      setLoadError(null);
      setIdentityRbacNotice(null);

      try {
        const [couriersRes, usersRes, manifestsRes] = await Promise.allSettled([
          dispatchApi.getCouriers(effectiveBranchId),
          getAdminUsers({ page: 0, size: 100 }),
          dispatchApi.listTransferManifests({ branchId: effectiveBranchId }),
        ]);

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
          setManifests(manifestsRes.value);
        } else {
          setManifests([]);
        }

        if (usersRes.status === 'fulfilled') {
          // Strictly filter Identity Service users to the assigned branch
          const branchUsers = (usersRes.value.content || []).filter(
            (u) => Number(u.branchId) === Number(effectiveBranchId)
          );
          setIdentityUsers(branchUsers);
        } else {
          setIdentityUsers([]);
          setIdentityRbacNotice(
            'Identity Service (/api/v1/admin/users) restricts full user directory & role mutations to HEAD_OFFICE_ADMIN / ADMIN. Showing live branch courier roster from Dispatch Service (/api/v1/dispatch/couriers) and authenticated branch personnel.'
          );
        }

        if (couriersRes.status === 'rejected' && usersRes.status === 'rejected') {
          setLoadError(
            couriersRes.reason instanceof Error
              ? couriersRes.reason.message
              : 'Failed to load branch staff records from backend services.'
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
    loadStaffData(false);
  }, [loadStaffData]);

  // Merge Identity Service branch users + Dispatch Service couriers + authenticated branch session
  const staffList = useMemo<UnifiedBranchStaffMember[]>(() => {
    if (!effectiveBranchId) return [];

    const map = new Map<string, UnifiedBranchStaffMember>();

    // 1. Add Identity Service users scoped to effectiveBranchId
    for (const u of identityUsers) {
      if (Number(u.branchId) !== Number(effectiveBranchId)) continue;
      const roles = (u.roles || []).map((r) => r.replace(/^ROLE_/, '').toUpperCase());
      const category: UnifiedBranchStaffMember['category'] = roles.includes('COURIER')
        ? 'COURIER'
        : roles.includes('DISPATCHER')
          ? 'DISPATCHER'
          : 'BRANCH_PERSONNEL';

      map.set(u.userId, {
        key: `user-${u.userId}`,
        userId: u.userId,
        employeeCode: u.userId.slice(0, 8).toUpperCase(),
        fullName: u.fullName,
        category,
        roles,
        email: u.email,
        phone: u.phone,
        accountStatus: u.accountStatus || 'ACTIVE',
        availability: null,
        branchId: Number(effectiveBranchId),
        source: 'IDENTITY_SERVICE',
      });
    }

    // 2. Merge Couriers from Dispatch Service (`GET /api/v1/dispatch/couriers?branchId=...`)
    for (const c of couriers) {
      if (c.branchId && Number(c.branchId) !== Number(effectiveBranchId)) continue;
      const existingByUserId = c.userId ? map.get(c.userId) : undefined;
      const existingByEmail = c.email
        ? Array.from(map.values()).find(
            (item) => item.email?.toLowerCase() === c.email?.toLowerCase()
          )
        : undefined;
      const existing = existingByUserId || existingByEmail;

      if (existing) {
        existing.employeeCode = c.courierCode || existing.employeeCode;
        existing.category = 'COURIER';
        if (!existing.roles.includes('COURIER')) {
          existing.roles.push('COURIER');
        }
        existing.phone = existing.phone || c.phone;
        existing.email = existing.email || c.email;
        existing.availability = c.status;
        existing.vehicleType = c.vehicleType;
        existing.vehiclePlate = c.vehiclePlate;
        existing.activeDeliveries = c.activeDeliveries;
        existing.maxCapacity = c.maxCapacity;
        existing.completedToday = c.completedToday;
        existing.source = 'IDENTITY_AND_DISPATCH';
      } else {
        const key = c.userId || `courier-${c.id || c.courierCode}`;
        map.set(key, {
          key,
          userId: c.userId,
          employeeCode: c.courierCode || String(c.id),
          fullName: c.name,
          category: 'COURIER',
          roles: ['COURIER'],
          email: c.email || null,
          phone: c.phone || null,
          accountStatus: 'ACTIVE',
          availability: c.status,
          branchId: Number(c.branchId || effectiveBranchId),
          vehicleType: c.vehicleType,
          vehiclePlate: c.vehiclePlate,
          activeDeliveries: c.activeDeliveries,
          maxCapacity: c.maxCapacity,
          completedToday: c.completedToday,
          source: 'DISPATCH_SERVICE',
        });
      }
    }

    // 3. Include dispatcher personnel recorded on branch transfer manifests if not already listed
    for (const m of manifests) {
      if (
        Number(m.originBranchId) === Number(effectiveBranchId) &&
        m.originHandoverById &&
        m.originHandoverByName &&
        !map.has(m.originHandoverById)
      ) {
        map.set(m.originHandoverById, {
          key: `manifest-actor-${m.originHandoverById}`,
          userId: m.originHandoverById,
          employeeCode: m.originHandoverById.slice(0, 8).toUpperCase(),
          fullName: m.originHandoverByName,
          category: 'DISPATCHER',
          roles: ['DISPATCHER'],
          email: null,
          phone: null,
          accountStatus: 'ACTIVE',
          availability: null,
          branchId: Number(effectiveBranchId),
          source: 'DISPATCH_SERVICE',
        });
      }
    }

    // 4. Ensure the currently authenticated branch user is represented if assigned to this branch
    if (
      currentUser &&
      Number(currentUser.branchId) === Number(effectiveBranchId) &&
      !map.has(currentUser.userId)
    ) {
      const roles = (currentUser.roles || []).map((r) =>
        r.replace(/^ROLE_/, '').toUpperCase()
      );
      map.set(currentUser.userId, {
        key: `session-${currentUser.userId}`,
        userId: currentUser.userId,
        employeeCode: currentUser.userId.slice(0, 8).toUpperCase(),
        fullName: currentUser.fullName,
        category: roles.includes('DISPATCHER') ? 'DISPATCHER' : 'BRANCH_PERSONNEL',
        roles,
        email: currentUser.email,
        phone: currentUser.phone,
        accountStatus: currentUser.accountStatus || 'ACTIVE',
        availability: null,
        branchId: Number(effectiveBranchId),
        source: 'SESSION_CONTEXT',
      });
    }

    return Array.from(map.values());
  }, [effectiveBranchId, identityUsers, couriers, manifests, currentUser]);

  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return staffList.filter((item) => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }
      if (
        statusFilter !== 'ALL' &&
        item.accountStatus.toUpperCase() !== statusFilter
      ) {
        return false;
      }
      if (q.length > 0) {
        const matchesName = item.fullName.toLowerCase().includes(q);
        const matchesCode = item.employeeCode.toLowerCase().includes(q);
        const matchesEmail = (item.email || '').toLowerCase().includes(q);
        const matchesPhone = (item.phone || '').toLowerCase().includes(q);
        return matchesName || matchesCode || matchesEmail || matchesPhone;
      }
      return true;
    });
  }, [staffList, categoryFilter, statusFilter, searchQuery]);

  const summaryCounts = useMemo(() => {
    return {
      total: staffList.length,
      dispatchers: staffList.filter((s) => s.category === 'DISPATCHER').length,
      couriers: staffList.filter((s) => s.category === 'COURIER').length,
      branchPersonnel: staffList.filter((s) => s.category === 'BRANCH_PERSONNEL')
        .length,
      availableNow: staffList.filter((s) => s.availability === 'AVAILABLE').length,
    };
  }, [staffList]);

  // ── Authorized Actions (Subject to Backend RBAC) ─────────────────────────
  const handleToggleAccountStatus = async (member: UnifiedBranchStaffMember) => {
    if (!member.userId) {
      setFeedbackBanner({
        type: 'error',
        message:
          'Account status toggle requires an Identity Service userId. This courier record is managed via Dispatch Service.',
      });
      return;
    }

    setIsSubmittingAction(true);
    setFeedbackBanner(null);
    try {
      const isCurrentlyActive = member.accountStatus.toUpperCase() === 'ACTIVE';
      if (isCurrentlyActive) {
        await suspendUser(member.userId);
        setFeedbackBanner({
          type: 'success',
          message: `Account for ${member.fullName} has been suspended.`,
        });
      } else {
        await activateUser(member.userId);
        setFeedbackBanner({
          type: 'success',
          message: `Account for ${member.fullName} has been activated.`,
        });
      }
      await loadStaffData(true);
    } catch (err: unknown) {
      setFeedbackBanner({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Backend rejected account status update (403 Forbidden: requires HEAD_OFFICE_ADMIN / ADMIN role in Identity Service).',
      });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleToggleBranchRole = async (
    member: UnifiedBranchStaffMember,
    roleName: BranchAssignableRole
  ) => {
    if (!member.userId) {
      setFeedbackBanner({
        type: 'error',
        message: 'Role assignment requires an Identity Service userId.',
      });
      return;
    }

    setIsSubmittingAction(true);
    setFeedbackBanner(null);
    try {
      const hasRole = member.roles.includes(roleName);
      if (hasRole) {
        const nextRoles = member.roles.filter((r) => r !== roleName);
        await updateAdminUser(member.userId, {
          roles: nextRoles.length > 0 ? nextRoles : ['BRANCH_MANAGER'],
        });
        setFeedbackBanner({
          type: 'success',
          message: `Removed ${roleName} permission from ${member.fullName}.`,
        });
      } else {
        await assignUserRole(member.userId, roleName);
        setFeedbackBanner({
          type: 'success',
          message: `Granted ${roleName} permission to ${member.fullName}.`,
        });
      }
      setPermissionsModalStaff(null);
      await loadStaffData(true);
    } catch (err: unknown) {
      setFeedbackBanner({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Backend rejected role update (requires Identity Service authorization).',
      });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleCreateBranchStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveBranchId) return;

    setIsSubmittingAction(true);
    setFeedbackBanner(null);
    try {
      const created = await createAdminUser({
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim() || undefined,
        password: createForm.password,
        roles: [createForm.role],
        branchId: effectiveBranchId,
      });
      setIsCreateModalOpen(false);
      setCreateForm({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        role: 'DISPATCHER',
      });
      setFeedbackBanner({
        type: 'success',
        message: `Created branch account for "${created.fullName}" assigned to Branch #${effectiveBranchId}.`,
      });
      await loadStaffData(true);
    } catch (err: unknown) {
      setFeedbackBanner({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to create staff account (Identity Service /api/v1/admin/users requires HEAD_OFFICE_ADMIN / ADMIN authorization).',
      });
    } finally {
      setIsSubmittingAction(false);
    }
  };

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

      {/* Page Header */}
      <header className="org-page-header">
        <div className="org-page-header__titles">
          <p className="org-page-header__eyebrow">
            Branch Administration / Personnel &amp; Access Control
          </p>
          <h1 className="org-page-header__title">Branch Staff Management</h1>
          <p className="org-page-header__subtitle">
            View and manage dispatchers, couriers, and branch-authorized personnel
            registered under{' '}
            {branch ? `${branch.name} (${branch.code})` : `Branch #${effectiveBranchId}`}.
          </p>
        </div>

        <div className="org-page-header__actions">
          <button
            type="button"
            className="org-btn org-btn--secondary"
            onClick={() => loadStaffData(true)}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? 'org-icon--spinning' : ''}
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            className="org-btn org-btn--primary"
            onClick={() => setIsCreateModalOpen(true)}
            disabled={!effectiveBranchId}
          >
            <UserPlus size={15} />
            <span>Register Branch Staff</span>
          </button>
        </div>
      </header>

      {/* Action Feedback Banner */}
      {feedbackBanner && (
        <div
          className={`mb-6 flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-medium ${
            feedbackBanner.type === 'success'
              ? 'border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]'
              : 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
          }`}
          role="alert"
        >
          <div className="flex items-center gap-2.5">
            {feedbackBanner.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedbackBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="rounded p-1 hover:bg-black/5"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Backend RBAC Integration Notice when Identity Service /api/v1/admin/users returns 403 */}
      {identityRbacNotice && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#BFDBFE] bg-[#EAF3FF]/70 px-4 py-3 text-xs text-[#1E3A8A]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1677E8]" />
          <div>
            <span className="font-semibold text-[#102B50]">
              Backend Authorization Scope Note:
            </span>{' '}
            {identityRbacNotice}
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#E5EAF0] bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase text-[#64748B]">
            Total Branch Personnel
          </span>
          <p className="mt-2 text-2xl font-bold text-[#111827]">
            {isLoading ? '—' : summaryCounts.total}
          </p>
          <p className="mt-0.5 text-xs text-[#64748B]">
            Assigned to Branch #{effectiveBranchId}
          </p>
        </div>

        <div className="rounded-xl border border-[#E5EAF0] bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase text-[#64748B]">
            Branch Dispatchers
          </span>
          <p className="mt-2 text-2xl font-bold text-[#102B50]">
            {isLoading ? '—' : summaryCounts.dispatchers}
          </p>
          <p className="mt-0.5 text-xs text-[#64748B]">
            Dispatch queue &amp; manifest coordinators
          </p>
        </div>

        <div className="rounded-xl border border-[#E5EAF0] bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase text-[#64748B]">
            Branch Couriers
          </span>
          <p className="mt-2 text-2xl font-bold text-[#1677E8]">
            {isLoading ? '—' : summaryCounts.couriers}
          </p>
          <p className="mt-0.5 text-xs text-[#64748B]">
            {summaryCounts.availableNow} currently AVAILABLE
          </p>
        </div>

        <div className="rounded-xl border border-[#E5EAF0] bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase text-[#64748B]">
            Branch Admin &amp; Staff
          </span>
          <p className="mt-2 text-2xl font-bold text-[#059669]">
            {isLoading ? '—' : summaryCounts.branchPersonnel}
          </p>
          <p className="mt-0.5 text-xs text-[#64748B]">
            Administrative &amp; hub operations staff
          </p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5EAF0] bg-white p-4 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by staff name, employee/courier code, email, or phone..."
            className="w-full rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] py-2 pl-9 pr-3 text-xs text-[#111827] placeholder-[#64748B] focus:border-[#1677E8] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'ALL', label: 'All Personnel' },
              { id: 'DISPATCHER', label: 'Dispatchers' },
              { id: 'COURIER', label: 'Couriers' },
              { id: 'BRANCH_PERSONNEL', label: 'Branch Admin / Staff' },
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

          <select
            aria-label="Filter by account status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] px-3 py-1.5 text-xs font-medium text-[#111827] focus:border-[#1677E8] focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>
        </div>
      </div>

      {/* Staff Directory Table */}
      <section className="org-directory-card" aria-label="Branch staff directory">
        {isLoading ? (
          <div className="org-state-box" role="status">
            <span className="org-spinner" aria-hidden="true" />
            <p className="org-state-box__title">Loading branch staff roster...</p>
            <p className="org-state-box__desc">
              Fetching personnel assigned to Branch #{effectiveBranchId}.
            </p>
          </div>
        ) : loadError ? (
          <div className="org-state-box org-state-box--error" role="alert">
            <div className="org-state-box__icon org-state-box__icon--error">
              <AlertCircle size={22} />
            </div>
            <h3 className="org-state-box__title">Unable to load branch personnel</h3>
            <p className="org-state-box__desc">{loadError}</p>
            <div className="org-state-box__actions">
              <button
                type="button"
                className="org-btn org-btn--primary"
                onClick={() => loadStaffData(true)}
              >
                <RefreshCw size={14} />
                <span>Retry</span>
              </button>
            </div>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="org-state-box">
            <div className="org-state-box__icon">
              <Users size={22} />
            </div>
            <h3 className="org-state-box__title">No matching branch personnel</h3>
            <p className="org-state-box__desc">
              No staff members matched your current filter criteria for Branch #
              {effectiveBranchId}.
            </p>
          </div>
        ) : (
          <div className="org-table-wrapper">
            <table className="org-table" aria-label="Branch personnel table">
              <thead>
                <tr>
                  <th scope="col">Employee / User ID</th>
                  <th scope="col">Staff Name</th>
                  <th scope="col">Role</th>
                  <th scope="col">Contact Info</th>
                  <th scope="col">Account Status</th>
                  <th scope="col">Availability</th>
                  <th scope="col" className="org-table__th--actions">
                    Authorized Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((member) => {
                  const isActive =
                    member.accountStatus.toUpperCase() === 'ACTIVE';
                  return (
                    <tr key={member.key} className="org-table__row">
                      <td data-label="Employee / User ID">
                        <span className="org-branch-code">
                          {member.employeeCode}
                        </span>
                      </td>

                      <td data-label="Staff Name">
                        <div className="font-semibold text-[#111827]">
                          {member.fullName}
                        </div>
                        {member.vehicleType && (
                          <div className="text-[11px] text-[#64748B]">
                            Vehicle: {member.vehicleType}
                            {member.vehiclePlate ? ` · ${member.vehiclePlate}` : ''}
                          </div>
                        )}
                      </td>

                      <td data-label="Role">
                        <div className="flex flex-wrap gap-1">
                          {member.roles.map((r) => (
                            <span
                              key={r}
                              className="inline-flex rounded-md border border-[#DCE5F2] bg-[#EAF3FF] px-2 py-0.5 text-[11px] font-semibold text-[#102B50]"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td data-label="Contact Info">
                        <div className="org-branch-contact">
                          {member.phone && (
                            <span className="org-branch-contact__item">
                              <Phone size={12} aria-hidden="true" />
                              <span>{member.phone}</span>
                            </span>
                          )}
                          {member.email && (
                            <span className="org-branch-contact__item org-branch-contact__email">
                              <Mail size={12} aria-hidden="true" />
                              <span>{member.email}</span>
                            </span>
                          )}
                          {!member.phone && !member.email && (
                            <span className="org-branch-contact__muted">
                              Not provided
                            </span>
                          )}
                        </div>
                      </td>

                      <td data-label="Account Status">
                        <span
                          className={`org-status-badge ${
                            isActive
                              ? 'org-status-badge--active'
                              : 'org-status-badge--inactive'
                          }`}
                        >
                          <span className="org-status-badge__dot" />
                          <span>{member.accountStatus}</span>
                        </span>
                      </td>

                      <td data-label="Availability">
                        {getAvailabilityBadge(member.availability)}
                      </td>

                      <td data-label="Authorized Actions" className="org-table__td--actions">
                        <div className="org-row-actions">
                          <button
                            type="button"
                            className="org-action-btn"
                            onClick={() => setSelectedStaff(member)}
                            title="View staff details"
                          >
                            <Eye size={14} />
                            <span>Details</span>
                          </button>

                          {member.userId && (
                            <>
                              <button
                                type="button"
                                className="org-action-btn"
                                onClick={() => setPermissionsModalStaff(member)}
                                title="Manage branch-level access permissions"
                              >
                                <KeyRound size={14} />
                                <span>Permissions</span>
                              </button>

                              <button
                                type="button"
                                disabled={
                                  isSubmittingAction ||
                                  member.userId === currentUser?.userId
                                }
                                className={`org-action-btn ${
                                  isActive
                                    ? 'org-action-btn--deactivate'
                                    : 'org-action-btn--activate'
                                }`}
                                onClick={() => handleToggleAccountStatus(member)}
                                title={
                                  member.userId === currentUser?.userId
                                    ? 'Cannot suspend your own active session'
                                    : isActive
                                      ? 'Suspend account'
                                      : 'Activate account'
                                }
                              >
                                <Power size={14} />
                                <span>{isActive ? 'Deactivate' : 'Activate'}</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 1. View Staff Details Modal */}
      {selectedStaff && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="staff-detail-modal-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-[#E5EAF0] pb-4">
              <div>
                <span className="org-branch-code">{selectedStaff.employeeCode}</span>
                <h2
                  id="staff-detail-modal-title"
                  className="mt-1 text-lg font-bold text-[#111827]"
                >
                  {selectedStaff.fullName}
                </h2>
                <p className="text-xs text-[#64748B]">
                  Branch #{selectedStaff.branchId} Personnel Profile
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStaff(null)}
                className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F5F7FA]"
                aria-label="Close staff details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-4 text-xs">
              <div className="rounded-lg bg-[#F5F7FA] p-3">
                <dt className="font-semibold text-[#64748B]">Assigned Roles</dt>
                <dd className="mt-1 font-bold text-[#102B50]">
                  {selectedStaff.roles.join(', ')}
                </dd>
              </div>
              <div className="rounded-lg bg-[#F5F7FA] p-3">
                <dt className="font-semibold text-[#64748B]">Account Status</dt>
                <dd className="mt-1 font-bold text-[#111827]">
                  {selectedStaff.accountStatus}
                </dd>
              </div>
              <div className="rounded-lg bg-[#F5F7FA] p-3">
                <dt className="font-semibold text-[#64748B]">Email Address</dt>
                <dd className="mt-1 text-[#111827]">
                  {selectedStaff.email || 'Not provided'}
                </dd>
              </div>
              <div className="rounded-lg bg-[#F5F7FA] p-3">
                <dt className="font-semibold text-[#64748B]">Phone Number</dt>
                <dd className="mt-1 text-[#111827]">
                  {selectedStaff.phone || 'Not provided'}
                </dd>
              </div>
              {selectedStaff.category === 'COURIER' && (
                <>
                  <div className="rounded-lg bg-[#F5F7FA] p-3">
                    <dt className="font-semibold text-[#64748B]">
                      Live Availability
                    </dt>
                    <dd className="mt-1">
                      {getAvailabilityBadge(selectedStaff.availability)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-[#F5F7FA] p-3">
                    <dt className="font-semibold text-[#64748B]">
                      Active Load / Completed Today
                    </dt>
                    <dd className="mt-1 font-bold text-[#111827]">
                      {selectedStaff.activeDeliveries ?? 0} /{' '}
                      {selectedStaff.maxCapacity ?? 0} active ·{' '}
                      {selectedStaff.completedToday ?? 0} completed today
                    </dd>
                  </div>
                </>
              )}
            </dl>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="org-btn org-btn--secondary"
                onClick={() => setSelectedStaff(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Manage Branch-Level Access Permissions Modal */}
      {permissionsModalStaff && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="staff-permissions-modal-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-[#E5EAF0] pb-4">
              <div>
                <h2
                  id="staff-permissions-modal-title"
                  className="text-lg font-bold text-[#111827]"
                >
                  Branch Access Permissions — {permissionsModalStaff.fullName}
                </h2>
                <p className="text-xs text-[#64748B]">
                  Manage branch-level roles for Branch #{effectiveBranchId}. System-wide
                  roles are restricted to Head Office.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPermissionsModalStaff(null)}
                className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F5F7FA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {BRANCH_ASSIGNABLE_ROLES.map((roleOption) => {
                const isAssigned = permissionsModalStaff.roles.includes(
                  roleOption.value
                );
                return (
                  <div
                    key={roleOption.value}
                    className="flex items-center justify-between gap-4 rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] p-3.5"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#102B50]">
                          {roleOption.label}
                        </span>
                        <code className="rounded bg-white px-1.5 py-0.5 text-[10px] text-[#64748B]">
                          {roleOption.value}
                        </code>
                      </div>
                      <p className="mt-1 text-xs text-[#64748B]">
                        {roleOption.desc}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isSubmittingAction}
                      onClick={() =>
                        handleToggleBranchRole(
                          permissionsModalStaff,
                          roleOption.value
                        )
                      }
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        isAssigned
                          ? 'border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#FEE2E2]'
                          : 'bg-[#1677E8] text-white hover:bg-[#1265C5]'
                      }`}
                    >
                      {isAssigned ? 'Revoke' : 'Grant'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="org-btn org-btn--secondary"
                onClick={() => setPermissionsModalStaff(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Register / Invite Branch Staff Modal */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-branch-staff-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-[#E5EAF0] pb-4">
              <div>
                <h2
                  id="create-branch-staff-title"
                  className="text-lg font-bold text-[#111827]"
                >
                  Register Branch Staff Account
                </h2>
                <p className="text-xs text-[#64748B]">
                  Account will be bound strictly to{' '}
                  {branch
                    ? `${branch.name} (${branch.code})`
                    : `Branch #${effectiveBranchId}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F5F7FA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBranchStaff} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827]">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.fullName}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, fullName: e.target.value })
                  }
                  placeholder="e.g. Kasun Perera"
                  className="mt-1 w-full rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] px-3 py-2 text-xs text-[#111827] focus:border-[#1677E8] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827]">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  placeholder="staff@swiftdrop.lk"
                  className="mt-1 w-full rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] px-3 py-2 text-xs text-[#111827] focus:border-[#1677E8] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827]">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, phone: e.target.value })
                  }
                  placeholder="+94 77 123 4567"
                  className="mt-1 w-full rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] px-3 py-2 text-xs text-[#111827] focus:border-[#1677E8] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827]">
                  Branch Role *
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      role: e.target.value as BranchAssignableRole,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] px-3 py-2 text-xs text-[#111827] focus:border-[#1677E8] focus:bg-white focus:outline-none"
                >
                  {BRANCH_ASSIGNABLE_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} ({r.value})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827]">
                  Temporary Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, password: e.target.value })
                  }
                  placeholder="Minimum 8 characters"
                  className="mt-1 w-full rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] px-3 py-2 text-xs text-[#111827] focus:border-[#1677E8] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="org-btn org-btn--secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmittingAction}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="org-btn org-btn--primary"
                  disabled={isSubmittingAction}
                >
                  <Plus size={14} />
                  <span>
                    {isSubmittingAction ? 'Creating...' : 'Create Branch Staff'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
