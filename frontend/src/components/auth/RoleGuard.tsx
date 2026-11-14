'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, Loader2, ArrowLeft, LogIn } from 'lucide-react';
import { useCurrentUser } from '@/hooks/api/use-auth';
import { useAuthStore } from '@/store/auth.store';
import type { UserRole } from '@/types/auth.types';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  portalName: string;
  children: React.ReactNode;
}

/**
 * Client-side role guard that rehydrates the authenticated session from the
 * Identity Service (`/users/me` via HttpOnly cookie) and verifies that the user
 * holds at least one allowed canonical role.
 *
 * Backend Spring Security + service-layer RBAC remain the authoritative boundary.
 */
export function RoleGuard({ allowedRoles, portalName, children }: RoleGuardProps) {
  const router = useRouter();
  const { data: currentUser, isLoading, isError } = useCurrentUser();
  const storedUser = useAuthStore((state) => state.user);
  const activeUser = currentUser || storedUser;

  const userRoles = (activeUser?.roles || []).map((r) => String(r).toUpperCase());
  const isAuthorized = allowedRoles.some((role) => userRoles.includes(role));

  useEffect(() => {
    if (!isLoading && (isError || !activeUser)) {
      router.replace('/login');
    }
  }, [isLoading, isError, activeUser, router]);

  if (isLoading && !activeUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Verifying {portalName} access...</p>
        </div>
      </div>
    );
  }

  if (!activeUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 text-center shadow-sm">
          <LogIn className="h-10 w-10 text-blue-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Authentication Required</h2>
          <p className="text-sm text-slate-500 mt-1.5">
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

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 text-rose-600 mb-3">
            <ShieldAlert className="h-7 w-7 shrink-0" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">Access Denied (403)</h2>
              <p className="text-xs text-slate-500">{portalName}</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Your account (<span className="font-semibold text-slate-800">{activeUser.email}</span>) does not
            hold the required role permissions ({allowedRoles.join(' or ')}) for this portal.
          </p>
          <div className="mt-3 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            Current roles:{' '}
            <span className="font-mono font-semibold text-slate-700">
              {userRoles.length > 0 ? userRoles.join(', ') : 'NONE'}
            </span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Workspace Home
            </Link>
            {userRoles.includes('COURIER') && (
              <Link
                href="/courier"
                className="inline-flex items-center px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Open Courier Portal
              </Link>
            )}
            {userRoles.includes('DISPATCHER') && (
              <Link
                href="/dispatcher/dashboard"
                className="inline-flex items-center px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Open Dispatcher Portal
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function DispatcherGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['DISPATCHER', 'ADMIN']} portalName="Dispatcher Command Center">
      {children}
    </RoleGuard>
  );
}

export function CourierGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['COURIER', 'ADMIN']} portalName="Courier Field Portal">
      {children}
    </RoleGuard>
  );
}

