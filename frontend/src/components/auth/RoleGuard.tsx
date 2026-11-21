'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, Loader2, ArrowLeft, LogIn } from 'lucide-react';
import { useCurrentUser } from '@/hooks/api/use-auth';
import { useAuthStore } from '@/store/auth.store';
import type { UserRole } from '@/types/auth.types';
import {
  isAccountActive,
  normalizeRoleName,
  resolveDashboardRoute,
  ROLE_LABELS,
} from '@/lib/auth/role-resolver';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  portalName: string;
  children: React.ReactNode;
}

function expandAllowedRoles(allowedRoles: UserRole[]): string[] {
  const set = new Set<string>();
  for (const r of allowedRoles) {
    const norm = normalizeRoleName(r);
    set.add(norm);
    if (norm === 'ADMIN' || norm === 'SYSTEM_ADMIN' || norm === 'HEAD_OFFICE_ADMIN') {
      set.add('ADMIN');
      set.add('HEAD_OFFICE_ADMIN');
      set.add('SYSTEM_ADMIN');
    }
    if (norm === 'BRANCH_ADMIN' || norm === 'BRANCH_MANAGER') {
      set.add('BRANCH_ADMIN');
      set.add('BRANCH_MANAGER');
    }
  }
  return Array.from(set);
}

/**
 * Client-side role guard that rehydrates the authenticated session from the
 * Identity Service (`/api/v1/auth/me` via HttpOnly cookie) and verifies that the user
 * holds at least one allowed canonical role and an ACTIVE account status.
 *
 * Backend Spring Security + service-layer RBAC remain the authoritative boundary.
 */
export function RoleGuard({ allowedRoles, portalName, children }: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: currentUser, isLoading, isError } = useCurrentUser();
  const storedUser = useAuthStore((state) => state.user);
  const activeRole = useAuthStore((state) => state.activeRole);
  const activeUser = currentUser || storedUser;

  const userRoles = (activeUser?.roles || []).map(normalizeRoleName);
  const expandedAllowed = expandAllowedRoles(allowedRoles);
  const accountActive = isAccountActive(activeUser?.accountStatus);
  const mustChangePassword = Boolean(activeUser?.mustChangePassword);
  const isAuthorized =
    accountActive && !mustChangePassword && expandedAllowed.some((role) => userRoles.includes(role));

  useEffect(() => {
    if (!isLoading && (isError || !activeUser)) {
      const callback = pathname ? `?callbackUrl=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${callback}`);
    } else if (!isLoading && activeUser && !accountActive) {
      router.replace(
        `/login?error=account_${activeUser.accountStatus.toLowerCase()}`
      );
    } else if (!isLoading && activeUser && mustChangePassword) {
      const callback = pathname ? `?callbackUrl=${encodeURIComponent(pathname)}` : '';
      router.replace(`/change-password${callback}`);
    }
  }, [isLoading, isError, activeUser, accountActive, mustChangePassword, pathname, router]);

  if (isLoading && !activeUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="flex flex-col items-center gap-3 text-slate-300">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium">Verifying {portalName} access...</p>
        </div>
      </div>
    );
  }

  if (!activeUser || !accountActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 text-center shadow-lg">
          <LogIn className="h-10 w-10 text-blue-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">Authentication Required</h2>
          <p className="text-sm text-slate-400 mt-1.5">
            Redirecting you to sign in before accessing {portalName}.
          </p>
          <div className="mt-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (mustChangePassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 text-center shadow-lg">
          <Loader2 className="h-10 w-10 text-blue-500 mx-auto mb-3 animate-spin" />
          <h2 className="text-lg font-bold text-white">Password Change Required</h2>
          <p className="text-sm text-slate-400 mt-1.5">
            Redirecting you to set a new personal password before accessing {portalName}.
          </p>
          <div className="mt-4">
            <Link
              href="/change-password"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
            >
              Change Password
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    const userHomeRoute = resolveDashboardRoute(activeUser, activeRole);
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-3 text-rose-400 mb-3">
            <ShieldAlert className="h-7 w-7 shrink-0" />
            <div>
              <h2 className="text-lg font-bold text-white">Access Denied (403)</h2>
              <p className="text-xs text-slate-400">{portalName}</p>
            </div>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Your account (<span className="font-semibold text-white">{activeUser.email}</span>) does not
            hold the required permissions ({allowedRoles.map((r) => ROLE_LABELS[r] || r).join(' or ')}) for this portal.
          </p>
          <div className="mt-3 text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
            Assigned roles:{' '}
            <span className="font-mono font-semibold text-blue-400">
              {userRoles.length > 0 ? userRoles.join(', ') : 'NONE'}
            </span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={userHomeRoute}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Go to My Dashboard
            </Link>
            <Link
              href="/"
              className="inline-flex items-center px-3.5 py-2 rounded-lg border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800"
            >
              Public Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function CustomerGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard
      allowedRoles={['CUSTOMER', 'MERCHANT', 'ADMIN', 'HEAD_OFFICE_ADMIN']}
      portalName="Customer Delivery Portal"
    >
      {children}
    </RoleGuard>
  );
}

export function MerchantGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard
      allowedRoles={['MERCHANT', 'ADMIN', 'HEAD_OFFICE_ADMIN']}
      portalName="Merchant Partner Portal"
    >
      {children}
    </RoleGuard>
  );
}

export function DispatcherGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard
      allowedRoles={['DISPATCHER', 'BRANCH_MANAGER', 'ADMIN', 'HEAD_OFFICE_ADMIN']}
      portalName="Dispatcher Command Center"
    >
      {children}
    </RoleGuard>
  );
}

export function CourierGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard
      allowedRoles={['COURIER', 'ADMIN', 'HEAD_OFFICE_ADMIN']}
      portalName="Courier Field Portal"
    >
      {children}
    </RoleGuard>
  );
}

export function BranchGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard
      allowedRoles={[
        'BRANCH_MANAGER',
        'BRANCH_STAFF',
        'BRANCH_ADMIN',
        'ADMIN',
        'HEAD_OFFICE_ADMIN',
      ]}
      portalName="Branch Administration Portal"
    >
      {children}
    </RoleGuard>
  );
}

export function SystemAdminGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard
      allowedRoles={['ADMIN', 'HEAD_OFFICE_ADMIN', 'SYSTEM_ADMIN']}
      portalName="System Administration Portal"
    >
      {children}
    </RoleGuard>
  );
}

export const AdminGuard = SystemAdminGuard;
