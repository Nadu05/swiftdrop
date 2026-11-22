import type { AuthResponse, AuthUser, UserRole } from '@/types/auth.types';

/**
 * Canonical role priority order (highest operational scope to lowest).
 * When a user holds multiple roles (e.g., MERCHANT + CUSTOMER, or ADMIN + HEAD_OFFICE_ADMIN),
 * the highest-priority role is selected by default unless the user explicitly switches
 * to another role they legitimately hold in their backend JWT/AuthResponse.
 */
export const ROLE_PRIORITY: readonly UserRole[] = [
  'MAIN_ADMIN',
  'HEAD_OFFICE_ADMIN',
  'SYSTEM_ADMIN',
  'ADMIN',
  'BRANCH_MANAGER',
  'BRANCH_ADMIN',
  'BRANCH_STAFF',
  'DISPATCHER',
  'COURIER',
  'MERCHANT',
  'CUSTOMER',
] as const;

/**
 * Authoritative mapping from backend canonical roles to their primary dashboard routes.
 */
export const ROLE_DASHBOARD_MAP: Record<string, string> = {
  MAIN_ADMIN: '/admin/dashboard',
  HEAD_OFFICE_ADMIN: '/admin/dashboard',
  SYSTEM_ADMIN: '/admin/dashboard',
  ADMIN: '/admin/dashboard',
  BRANCH_MANAGER: '/organization',
  BRANCH_ADMIN: '/organization',
  BRANCH_STAFF: '/organization',
  DISPATCHER: '/dispatcher/dashboard',
  COURIER: '/courier/dashboard',
  MERCHANT: '/merchant/dashboard',
  CUSTOMER: '/customer/dashboard',
};

/**
 * Human-readable role labels for badges, switchers, and profile menus.
 */
export const ROLE_LABELS: Record<string, string> = {
  MAIN_ADMIN: 'Main Admin',
  HEAD_OFFICE_ADMIN: 'Head Office Admin',
  SYSTEM_ADMIN: 'System Admin',
  ADMIN: 'System Admin',
  BRANCH_MANAGER: 'Branch Manager',
  BRANCH_ADMIN: 'Branch Admin',
  BRANCH_STAFF: 'Branch Staff',
  DISPATCHER: 'Dispatcher',
  COURIER: 'Courier Partner',
  MERCHANT: 'Merchant Partner',
  CUSTOMER: 'Customer',
};

/**
 * Normalize raw role strings from backend (e.g. "ROLE_ADMIN" or "ROLE-ADMIN" -> "ADMIN").
 */
export function normalizeRoleName(role: string): string {
  return role.trim().toUpperCase().replace(/^ROLE[_-]/, '');
}

/**
 * Convert an AuthResponse from the Identity Service into an AuthUser object.
 * Does NOT silently fabricate a CUSTOMER role when backend roles are empty or missing.
 */
export function toAuthUser(data: AuthResponse): AuthUser {
  const normalizedRoles = Array.isArray(data.roles)
    ? data.roles
        .filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
        .map(normalizeRoleName)
    : [];

  return {
    userId: data.userId,
    fullName: data.fullName,
    email: data.email,
    phone: data.phone ?? null,
    roles: normalizedRoles,
    accountStatus: data.accountStatus || 'ACTIVE',
    branchId: data.branchId ?? null,
    organizationId: data.organizationId ?? null,
    emailVerified: data.emailVerified,
    emailVerifiedAt: data.emailVerifiedAt ?? null,
    mustChangePassword: Boolean(data.mustChangePassword),
    createdAt: data.createdAt,
  };
}

/**
 * Check whether an account status allows normal platform access.
 */
export function isAccountActive(accountStatus?: string | null): boolean {
  if (!accountStatus) return true;
  const upper = accountStatus.toUpperCase();
  return upper !== 'SUSPENDED' && upper !== 'DEACTIVATED';
}

/**
 * Check whether a normalized role string is a known canonical platform role.
 */
export function isKnownRole(role: string | null | undefined): role is UserRole {
  if (!role) return false;
  return Object.prototype.hasOwnProperty.call(ROLE_DASHBOARD_MAP, normalizeRoleName(role));
}

/**
 * Resolve the primary role for a user based on ROLE_PRIORITY,
 * optionally honoring a preferredRole ONLY if the user actually holds that role in `user.roles`.
 *
 * Returns `null` when no valid/known role can be resolved — NEVER defaults to CUSTOMER.
 */
export function resolvePrimaryRole(
  user: Pick<AuthUser, 'roles'> | null | undefined,
  preferredRole?: string | null
): UserRole | null {
  if (!user || !Array.isArray(user.roles) || user.roles.length === 0) {
    return null;
  }

  const normalizedUserRoles = user.roles.map(normalizeRoleName);

  // Only honor preferredRole if it is genuinely assigned to the user by the backend
  if (preferredRole) {
    const normPreferred = normalizeRoleName(preferredRole);
    if (normalizedUserRoles.includes(normPreferred) && isKnownRole(normPreferred)) {
      return normPreferred;
    }
  }

  for (const priorityRole of ROLE_PRIORITY) {
    if (normalizedUserRoles.includes(priorityRole)) {
      return priorityRole;
    }
  }

  return null;
}

/**
 * Resolve the canonical dashboard URL for a given role name.
 * Unknown or missing roles are routed to `/access-denied` rather than `/customer/dashboard`.
 */
export function getDashboardRouteForRole(role: string | null | undefined): string {
  if (!role) {
    return '/access-denied?reason=unresolved_role';
  }
  const norm = normalizeRoleName(role);
  return ROLE_DASHBOARD_MAP[norm] || '/access-denied?reason=unknown_role';
}

/**
 * Resolve the target dashboard route for an authenticated user.
 * Handles suspended/deactivated accounts, unknown/missing roles, and multi-role users.
 */
export function resolveDashboardRoute(
  user: Pick<AuthUser, 'roles' | 'accountStatus'> | null | undefined,
  preferredRole?: string | null
): string {
  if (!user) {
    return '/login';
  }

  if (!isAccountActive(user.accountStatus)) {
    return `/login?error=account_${user.accountStatus.toLowerCase()}`;
  }

  const primaryRole = resolvePrimaryRole(user, preferredRole);
  if (!primaryRole) {
    return '/access-denied?reason=unresolved_role';
  }

  return getDashboardRouteForRole(primaryRole);
}

/**
 * Route-prefix to allowed backend roles matrix.
 * Strictly separates Customer, Merchant, and Admin portals to prevent cross-portal leakage.
 */
const ROUTE_ROLE_MATRIX: Array<{ prefix: string; allowedRoles: string[] }> = [
  {
    prefix: '/admin',
    allowedRoles: ['ADMIN', 'HEAD_OFFICE_ADMIN', 'MAIN_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    prefix: '/health',
    allowedRoles: ['ADMIN', 'HEAD_OFFICE_ADMIN', 'MAIN_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    prefix: '/api-tester',
    allowedRoles: ['ADMIN', 'HEAD_OFFICE_ADMIN', 'MAIN_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    prefix: '/customers',
    allowedRoles: ['ADMIN', 'HEAD_OFFICE_ADMIN', 'MAIN_ADMIN', 'SYSTEM_ADMIN', 'BRANCH_MANAGER', 'DISPATCHER'],
  },
  {
    prefix: '/organization',
    allowedRoles: [
      'ADMIN',
      'HEAD_OFFICE_ADMIN',
      'MAIN_ADMIN',
      'SYSTEM_ADMIN',
      'BRANCH_MANAGER',
      'BRANCH_ADMIN',
      'BRANCH_STAFF',
    ],
  },
  {
    prefix: '/branch-admin',
    allowedRoles: [
      'BRANCH_MANAGER',
      'BRANCH_ADMIN',
      'BRANCH_STAFF',
      'ADMIN',
      'HEAD_OFFICE_ADMIN',
      'MAIN_ADMIN',
      'SYSTEM_ADMIN',
    ],
  },
  {
    prefix: '/branch',
    allowedRoles: [
      'BRANCH_MANAGER',
      'BRANCH_ADMIN',
      'BRANCH_STAFF',
      'ADMIN',
      'HEAD_OFFICE_ADMIN',
      'MAIN_ADMIN',
      'SYSTEM_ADMIN',
    ],
  },
  {
    prefix: '/dispatcher',
    allowedRoles: [
      'DISPATCHER',
      'BRANCH_MANAGER',
      'BRANCH_ADMIN',
      'ADMIN',
      'HEAD_OFFICE_ADMIN',
      'MAIN_ADMIN',
      'SYSTEM_ADMIN',
    ],
  },
  {
    prefix: '/courier',
    allowedRoles: ['COURIER', 'ADMIN', 'HEAD_OFFICE_ADMIN', 'MAIN_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    prefix: '/merchant',
    allowedRoles: ['MERCHANT'],
  },
  {
    prefix: '/customer',
    allowedRoles: ['CUSTOMER'],
  },
];

/**
 * Determine if the authenticated user's roles permit accessing a given pathname.
 */
export function canUserAccessPath(
  pathname: string,
  user: Pick<AuthUser, 'roles' | 'accountStatus'> | null | undefined
): boolean {
  if (!user || !isAccountActive(user.accountStatus)) {
    return false;
  }

  const normalizedUserRoles = (user.roles || []).map(normalizeRoleName);
  if (normalizedUserRoles.length === 0) {
    return false;
  }

  for (const rule of ROUTE_ROLE_MATRIX) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      return rule.allowedRoles.some((r) => normalizedUserRoles.includes(r));
    }
  }

  // Shared authenticated routes like /book, /bookings, /profile, /settings, /tracking
  return normalizedUserRoles.some((r) => isKnownRole(r));
}

/**
 * Resolve the post-login destination URL:
 * - If a `callbackUrl` is provided, is a safe internal path (not `/`, `/login`, `/register`, `/access-denied`),
 *   AND the user's roles allow accessing that path, return `callbackUrl`.
 * - Otherwise, return the user's canonical role dashboard route.
 */
export function resolvePostAuthRedirect(
  user: Pick<AuthUser, 'roles' | 'accountStatus' | 'mustChangePassword'>,
  callbackUrl?: string | null,
  preferredRole?: string | null
): string {
  if (!isAccountActive(user.accountStatus)) {
    return `/login?error=account_${user.accountStatus.toLowerCase()}`;
  }

  const hasSafeCallback =
    Boolean(callbackUrl) &&
    callbackUrl!.startsWith('/') &&
    !callbackUrl!.startsWith('//') &&
    callbackUrl !== '/' &&
    !callbackUrl!.startsWith('/login') &&
    !callbackUrl!.startsWith('/register') &&
    !callbackUrl!.startsWith('/access-denied') &&
    !callbackUrl!.startsWith('/change-password');

  if (user.mustChangePassword) {
    return hasSafeCallback
      ? `/change-password?callbackUrl=${encodeURIComponent(callbackUrl!)}`
      : '/change-password';
  }

  if (hasSafeCallback && canUserAccessPath(callbackUrl!, user)) {
    return callbackUrl!;
  }

  return resolveDashboardRoute(user, preferredRole);
}
