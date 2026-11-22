'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import {
  getBranchById,
  getBranches,
} from '@/api/services/organization.api';
import {
  resolveOrganizationPermissions,
  type OrganizationPermissions,
} from '@/lib/auth/branch-admin-permissions';
import type { BranchResponse } from '@/types/organization.types';
import { resolveInitialInspectedBranchId } from './branch-staff-form';

export interface BranchAdminContextState {
  permissions: OrganizationPermissions;
  /** The resolved branch ID for API queries (strictly `user.branchId` for Branch Admins) */
  effectiveBranchId: number | null;
  /** Loaded BranchResponse from Organization Service */
  branch: BranchResponse | null;
  /** All branches (loaded only if `permissions.canManageAllBranches` is true) */
  allBranches: BranchResponse[];
  isLoadingBranch: boolean;
  branchError: string | null;
  /** Only permitted when `permissions.canManageAllBranches` is true (Head Office Admin) */
  selectBranchForInspection: (branchId: number) => void;
  refreshBranchContext: () => Promise<void>;
}

/**
 * Resolves the authenticated Branch Administrator's assigned branch from `useAuthStore`
 * and fetches the authoritative `BranchResponse` from Organization Service.
 *
 * Strictly enforces branch data isolation:
 * - Branch Administrators (`BRANCH_MANAGER`, `BRANCH_ADMIN`, `BRANCH_STAFF`) are locked
 *   to their session `user.branchId` and cannot switch to or query any other branch.
 * - Head Office Administrators (`ADMIN`, `HEAD_OFFICE_ADMIN`) who hold global permissions
 *   may inspect branch modules for an authorized branch.
 */
export function useBranchAdminContext(): BranchAdminContextState {
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);

  const permissions = useMemo(
    () => resolveOrganizationPermissions(user, activeRole),
    [user, activeRole]
  );

  const [inspectedBranchId, setInspectedBranchId] = useState<number | null>(null);
  const [branch, setBranch] = useState<BranchResponse | null>(null);
  const [allBranches, setAllBranches] = useState<BranchResponse[]>([]);
  const [isLoadingBranch, setIsLoadingBranch] = useState<boolean>(true);
  const [branchError, setBranchError] = useState<string | null>(null);

  // Branch Admins are strictly locked to `permissions.authorizedBranchId`.
  const effectiveBranchId = useMemo(() => {
    if (!permissions.canManageAllBranches) {
      return permissions.authorizedBranchId;
    }
    if (allBranches.length > 0) {
      return resolveInitialInspectedBranchId({
        inspectedBranchId,
        authorizedBranchId: permissions.authorizedBranchId,
        allBranches,
      });
    }
    return inspectedBranchId;
  }, [
    permissions.canManageAllBranches,
    permissions.authorizedBranchId,
    inspectedBranchId,
    allBranches,
  ]);

  const loadBranchData = useCallback(async () => {
    setIsLoadingBranch(true);
    setBranchError(null);

    try {
      // 1. Branch Administrator: strictly fetch only their assigned branch
      if (!permissions.canManageAllBranches) {
        const targetId = permissions.authorizedBranchId;
        if (!targetId) {
          setBranch(null);
          setIsLoadingBranch(false);
          return;
        }

        const list = await getBranches();
        const matched = list.find((b) => Number(b.id) === Number(targetId)) || null;
        if (matched) {
          setBranch(matched);
        } else {
          try {
            const branchDetail = await getBranchById(targetId);
            setBranch(branchDetail);
          } catch {
            setBranch(null);
            setBranchError(
              `Assigned branch #${targetId} could not be found in Organization Service.`
            );
          }
        }
        setIsLoadingBranch(false);
        return;
      }

      // 2. Global System Admin: load branches and resolve active inspected branch
      const list = await getBranches();
      setAllBranches(list);

      const resolvedId = resolveInitialInspectedBranchId({
        inspectedBranchId,
        authorizedBranchId: permissions.authorizedBranchId,
        allBranches: list,
      });

      if (resolvedId) {
        if (inspectedBranchId !== resolvedId) {
          setInspectedBranchId(resolvedId);
        }
        const matched =
          list.find((b) => Number(b.id) === Number(resolvedId)) || null;
        setBranch(matched);
      } else {
        setBranch(null);
      }
    } catch (err: unknown) {
      setBranch(null);
      setBranchError(
        err instanceof Error
          ? err.message
          : 'Unable to load branch profile from Organization Service.'
      );
    } finally {
      setIsLoadingBranch(false);
    }
  }, [
    permissions.canManageAllBranches,
    permissions.authorizedBranchId,
    inspectedBranchId,
  ]);

  useEffect(() => {
    loadBranchData();
  }, [loadBranchData]);

  const selectBranchForInspection = useCallback(
    (branchId: number) => {
      // Strictly forbid arbitrary branch selection unless explicitly permitted (Global Admin)
      if (!permissions.canManageAllBranches) {
        return;
      }
      setInspectedBranchId(branchId);
    },
    [permissions.canManageAllBranches]
  );

  return {
    permissions,
    effectiveBranchId,
    branch,
    allBranches,
    isLoadingBranch,
    branchError,
    selectBranchForInspection,
    refreshBranchContext: loadBranchData,
  };
}
