import type { AuthResponse, AuthUser, UserRole } from '@/types/auth.types';

/**
 * Canonical role priority order (highest operational scope to lowest).
 * When a user holds multiple roles (e.g., MERCHANT + CUSTOMER, or ADMIN + CUSTOMER),
 * the highest-priority role is selected by default unless the user explicitly switches
 * to another role they legitimately hold in their backend JWT/AuthResponse.
 */
export const ROLE_PRIORITY: readonly UserRole[] = [
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
  HEAD_OFFICE_ADMIN: '/organization',
  SYSTEM_ADMIN: '/organization',
  ADMIN: '/organization',
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
 * Normalize raw role strings from backend (e.g. "ROLE_ADMIN" -> "ADMIN").
 */
export function normalizeRoleName(role: string): string {
  return role.trim().toUpperCase().replace(/^ROLE_/, '');
}

/**
 * Convert an AuthResponse from the Identity Service into an AuthUser object.
 */
export function toAuthUser(data: AuthResponse): AuthUser {
  const normalizedRoles = Array.isArray(data.roles)
    ? data.roles.map(normalizeRoleName)
    : [];

  return {
    userId: data.userId,
    fullName: data.fullName,
    email: data.email,
    phone: data.phone ?? null,
    roles: normalizedRoles.length > 0 ? normalizedRoles : ['CUSTOMER'],
    accountStatus: data.accountStatus || 'ACTIVE',
    branchId: data.branchId ?? null,
    organizationId: data.organizationId ?? null,
    emailVerified: data.emailVerified,
    emailVerifiedAt: data.emailVerifiedAt ?? null,
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
 * Resolve the primary role for a user based on ROLE_PRIORITY,
 * optionally honoring a preferredRole ONLY if the user actually holds that role in `user.roles`.
 */
export function resolvePrimaryRole(
  user: Pick<AuthUser, 'roles'> | null | undefined,
  preferredRole?: string | null
): UserRole {
  if (!user || !Array.isArray(user.roles) || user.roles.length === 0) {
    return 'CUSTOMER';
  }

  const normalizedUserRoles = user.roles.map(normalizeRoleName);

  // Only honor preferredRole if it is genuinely assigned to the user by the backend
  if (preferredRole) {
    const normPreferred = normalizeRoleName(preferredRole);
    if (normalizedUserRoles.includes(normPreferred)) {
      return normPreferred as UserRole;
    }
  }

  for (const priorityRole of ROLE_PRIORITY) {
    if (normalizedUserRoles.includes(priorityRole)) {
      return priorityRole;
    }
  }

  return (normalizedUserRoles[0] as UserRole) || 'CUSTOMER';
}

/**
 * Resolve the canonical dashboard URL for a given role name.
 */
export function getDashboardRouteForRole(role: string): string {
  const norm = normalizeRoleName(role);
  return ROLE_DASHBOARD_MAP[norm] || '/customer/dashboard';
}

/**
 * Resolve the target dashboard route for an authenticated user.
 * Handles suspended/deactivated accounts and multi-role users.
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
  return getDashboardRouteForRole(primaryRole);
}

/**
 * Route-prefix to allowed backend roles matrix.
 * Used both by RoleGuard and post-login callbackUrl validation to prevent cross-role access.
 */
const ROUTE_ROLE_MATRIX: Array<{ prefix: string; allowedRoles: string[] }> = [
  {
    prefix: '/admin',
    allowedRoles: ['ADMIN', 'HEAD_OFFICE_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    prefix: '/health',
    allowedRoles: ['ADMIN', 'HEAD_OFFICE_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    prefix: '/api-tester',
    allowedRoles: ['ADMIN', 'HEAD_OFFICE_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    prefix: '/customers',
    allowedRoles: ['ADMIN', 'HEAD_OFFICE_ADMIN', 'SYSTEM_ADMIN', 'BRANCH_MANAGER', 'DISPATCHER'],
  },
  {
    prefix: '/organization',
    allowedRoles: [
      'ADMIN',
      'HEAD_OFFICE_ADMIN',
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
      'SYSTEM_ADMIN',
    ],
  },
  {
    prefix: '/courier',
    allowedRoles: ['COURIER', 'ADMIN', 'HEAD_OFFICE_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    prefix: '/merchant',
    allowedRoles: ['MERCHANT', 'ADMIN', 'HEAD_OFFICE_ADMIN', 'SYSTEM_ADMIN'],
  },
  {
    prefix: '/customer',
    allowedRoles: ['CUSTOMER', 'MERCHANT', 'ADMIN', 'HEAD_OFFICE_ADMIN', 'SYSTEM_ADMIN'],
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

  for (const rule of ROUTE_ROLE_MATRIX) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      return rule.allowedRoles.some((r) => normalizedUserRoles.includes(r));
    }
  }

  // Shared authenticated routes like /book, /bookings, /profile, /settings, /tracking
  return normalizedUserRoles.length > 0;
}

/**
 * Resolve the post-login destination URL:
 * - If a `callbackUrl` is provided, is a safe internal path (not `/`, `/login`, `/register`),
 *   AND the user's roles allow accessing that path, return `callbackUrl`.
 * - Otherwise, return the user's canonical role dashboard route.
 */
export function resolvePostAuthRedirect(
  user: Pick<AuthUser, 'roles' | 'accountStatus'>,
  callbackUrl?: string | null,
  preferredRole?: string | null
): string {
  if (!isAccountActive(user.accountStatus)) {
    return `/login?error=account_${user.accountStatus.toLowerCase()}`;
  }

  if (
    callbackUrl &&
    callbackUrl.startsWith('/') &&
    !callbackUrl.startsWith('//') &&
    callbackUrl !== '/' &&
    !callbackUrl.startsWith('/login') &&
    !callbackUrl.startsWith('/register') &&
    canUserAccessPath(callbackUrl, user)
  ) {
    return callbackUrl;
  }

  return resolveDashboardRoute(user, preferredRole);
}
