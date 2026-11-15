import type { AuthUser } from '@/types/auth.types';
import { normalizeRoleName, resolvePrimaryRole } from '@/lib/auth/role-resolver';
import type { OrderResponse } from '@/types/order.types';

/**
 * Global System / Head Office Administrator roles.
 */
export const GLOBAL_ADMIN_ROLES = [
  'HEAD_OFFICE_ADMIN',
  'SYSTEM_ADMIN',
  'ADMIN',
] as const;

/**
 * Branch-scoped Administrator and Staff roles.
 */
export const BRANCH_SCOPED_ROLES = [
  'BRANCH_MANAGER',
  'BRANCH_ADMIN',
  'BRANCH_STAFF',
] as const;

export interface OrganizationPermissions {
  /** Whether the user is acting as a Main System / Head Office Administrator */
  isGlobalAdmin: boolean;
  /** Whether the user is acting as a Branch-scoped Administrator */
  isBranchAdmin: boolean;
  /** The resolved primary role currently active in the session */
  effectiveRole: string;
  /** The authenticated user's assigned branch ID from Identity Service (`null` for global-only admins) */
  authorizedBranchId: number | null;
  /** Can create or deactivate branches in Organization Service */
  canCreateOrDeactivateBranches: boolean;
  /** Can edit branch details across all branches */
  canManageAllBranches: boolean;
  /** Can approve or reject merchant onboarding applications globally */
  canApproveMerchants: boolean;
  /** Can manage company-wide users and global roles */
  canManageGlobalUsers: boolean;
  /** Can view branch staff and manage branch-authorized accounts (subject to backend RBAC) */
  canManageBranchStaff: boolean;
  /** Can view branch orders, incoming/outgoing parcels, fleet overview, analytics, and activity */
  canViewBranchOperations: boolean;
  /** Can assign couriers to delivery requests (False for Branch Admin; Dispatcher module owns this) */
  canAssignCouriersInBranchAdmin: boolean;
}

/**
 * Centralized authorization resolver for Organization & Branch Administration.
 * Keeps role & permission logic separate from UI components.
 */
export function resolveOrganizationPermissions(
  user: Pick<AuthUser, 'roles' | 'branchId' | 'accountStatus'> | null | undefined,
  activeRole?: string | null
): OrganizationPermissions {
  if (!user) {
    return {
      isGlobalAdmin: false,
      isBranchAdmin: false,
      effectiveRole: 'CUSTOMER',
      authorizedBranchId: null,
      canCreateOrDeactivateBranches: false,
      canManageAllBranches: false,
      canApproveMerchants: false,
      canManageGlobalUsers: false,
      canManageBranchStaff: false,
      canViewBranchOperations: false,
      canAssignCouriersInBranchAdmin: false,
    };
  }

  const normalizedRoles = (user.roles || []).map(normalizeRoleName);
  const effectiveRole = resolvePrimaryRole(user, activeRole);

  const hasGlobalAdminRole = normalizedRoles.some((r) =>
    (GLOBAL_ADMIN_ROLES as readonly string[]).includes(r)
  );
  const hasBranchRole = normalizedRoles.some((r) =>
    (BRANCH_SCOPED_ROLES as readonly string[]).includes(r)
  );

  // If the user explicitly switched to a branch role (or only holds branch roles),
  // scope them as a Branch Administrator.
  const isActingAsBranchRole = (BRANCH_SCOPED_ROLES as readonly string[]).includes(
    effectiveRole
  );
  const isGlobalAdmin = hasGlobalAdminRole && !isActingAsBranchRole;
  const isBranchAdmin = isActingAsBranchRole || (!hasGlobalAdminRole && hasBranchRole);

  const authorizedBranchId =
    typeof user.branchId === 'number' && Number.isFinite(user.branchId) && user.branchId > 0
      ? user.branchId
      : null;

  return {
    isGlobalAdmin,
    isBranchAdmin,
    effectiveRole,
    authorizedBranchId,
    canCreateOrDeactivateBranches: isGlobalAdmin,
    canManageAllBranches: isGlobalAdmin,
    canApproveMerchants: isGlobalAdmin,
    canManageGlobalUsers: isGlobalAdmin,
    canManageBranchStaff: isBranchAdmin || isGlobalAdmin,
    canViewBranchOperations: isBranchAdmin || isGlobalAdmin,
    // Courier assignment belongs strictly to the Dispatcher module
    canAssignCouriersInBranchAdmin: false,
  };
}

/**
 * Verify whether the authenticated user is allowed to access data for a specific branch ID.
 */
export function canAccessBranchData(
  user: Pick<AuthUser, 'roles' | 'branchId' | 'accountStatus'> | null | undefined,
  targetBranchId: number | null | undefined,
  activeRole?: string | null
): boolean {
  const perms = resolveOrganizationPermissions(user, activeRole);
  if (perms.isGlobalAdmin) return true;
  if (!perms.isBranchAdmin || !perms.authorizedBranchId || !targetBranchId) {
    return false;
  }
  return Number(perms.authorizedBranchId) === Number(targetBranchId);
}

/**
 * Filter predicate to ensure an order belongs to the authorized branch
 * (either as origin branch or destination branch).
 */
export function isOrderAuthorizedForBranch(
  order: Pick<OrderResponse, 'originBranchId' | 'destinationBranchId'>,
  branchId: number | null
): boolean {
  if (!branchId) return false;
  return (
    Number(order.originBranchId) === Number(branchId) ||
    Number(order.destinationBranchId) === Number(branchId)
  );
}
