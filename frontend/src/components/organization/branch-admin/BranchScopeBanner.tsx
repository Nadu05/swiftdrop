'use client';

import {
  AlertTriangle,
  Building2,
  MapPin,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import type { BranchResponse } from '@/types/organization.types';
import type { OrganizationPermissions } from '@/lib/auth/branch-admin-permissions';

export interface BranchScopeBannerProps {
  branch: BranchResponse | null;
  effectiveBranchId: number | null;
  permissions: OrganizationPermissions;
  allBranches?: BranchResponse[];
  onSelectBranch?: (branchId: number) => void;
  isLoading?: boolean;
}

export default function BranchScopeBanner({
  branch,
  effectiveBranchId,
  permissions,
  allBranches = [],
  onSelectBranch,
  isLoading = false,
}: BranchScopeBannerProps) {
  if (!isLoading && !effectiveBranchId) {
    return (
      <div
        className="mb-6 rounded-xl border border-[#F59E0B]/40 bg-[#FFFBEB] p-4 text-[#92400E]"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#D97706]" />
          <div>
            <h3 className="text-sm font-semibold text-[#92400E]">
              Branch Association Required
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#B45309]">
              Your authenticated session does not currently include an assigned{' '}
              <code className="rounded bg-[#FEF3C7] px-1.5 py-0.5 font-mono">
                branchId
              </code>{' '}
              from the Identity Service (<code>GET /api/v1/auth/me</code>). Branch
              Administrators can only access operational data for their assigned branch.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E5EAF0] bg-white px-5 py-3.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#1677E8]">
          <Building2 className="h-4 w-4" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[#111827]">
              {branch ? branch.name : `Assigned Hub #${effectiveBranchId}`}
            </span>
            {branch?.code && (
              <span className="org-branch-code">{branch.code}</span>
            )}
            {branch && (
              <span
                className={`org-status-badge ${
                  branch.status === 'ACTIVE'
                    ? 'org-status-badge--active'
                    : 'org-status-badge--inactive'
                }`}
              >
                <span className="org-status-badge__dot" aria-hidden="true" />
                <span>{branch.status}</span>
              </span>
            )}
          </div>
          {branch && (
            <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-[#64748B]">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3 text-[#64748B]" />
                {branch.addressLine1}, {branch.city}
              </span>
              {branch.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3 text-[#64748B]" />
                  {branch.phone}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE5F2] bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-[#102B50]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#1677E8]" />
          {permissions.canManageAllBranches
            ? 'Head Office Inspection Scope'
            : `Scoped to Branch #${effectiveBranchId}`}
        </span>

        {/* Only Head Office / System Admins with `canManageAllBranches` can switch inspected branch */}
        {permissions.canManageAllBranches &&
          allBranches.length > 1 &&
          onSelectBranch && (
            <select
              aria-label="Inspect branch"
              value={effectiveBranchId ?? ''}
              onChange={(e) => onSelectBranch(Number(e.target.value))}
              className="rounded-lg border border-[#E5EAF0] bg-[#F5F7FA] px-3 py-1.5 text-xs font-semibold text-[#111827] focus:border-[#1677E8] focus:outline-none"
            >
              {allBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.name} ({b.city})
                </option>
              ))}
            </select>
          )}
      </div>
    </div>
  );
}
