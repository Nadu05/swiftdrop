'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShieldAlert, LogOut, Home, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/api/use-auth';
import { resolvePrimaryRole, getDashboardRouteForRole } from '@/lib/auth/role-resolver';

function AccessDeniedContent() {
  const searchParams = useSearchParams();
  const reason = searchParams?.get('reason');
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const logoutMutation = useLogout();

  const resolvedRole = resolvePrimaryRole(user, activeRole);
  const hasValidRole = Boolean(resolvedRole);

  const title =
    reason === 'unresolved_role' || reason === 'unknown_role'
      ? 'Role Not Assigned or Unrecognized'
      : 'Access Denied (403)';

  const message =
    reason === 'unresolved_role' || reason === 'unknown_role'
      ? 'Your account does not currently have a recognized platform role assigned. Please contact a SwiftDrop System Administrator to verify your account permissions.'
      : 'You do not have permission to view this portal or resource.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070d18] text-slate-100 p-6">
      <div className="max-w-md w-full rounded-2xl bg-[#0c1829] border border-rose-500/30 p-7 shadow-2xl space-y-5">
        <div className="flex items-center gap-3 text-rose-400">
          <div className="p-2.5 rounded-xl bg-rose-500/15">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white">{title}</h1>
            <p className="text-xs text-slate-400">SwiftDrop Authorization Guard</p>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">{message}</p>

        {user && (
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/10 text-xs space-y-1">
            <div>
              <span className="text-slate-500">Account:</span>{' '}
              <span className="text-white font-semibold">{user.email}</span>
            </div>
            <div>
              <span className="text-slate-500">Assigned Roles:</span>{' '}
              <span className="font-mono text-amber-300">
                {user.roles && user.roles.length > 0 ? user.roles.join(', ') : 'NONE'}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2.5 pt-1">
          {hasValidRole && (
            <Link
              href={getDashboardRouteForRole(resolvedRole)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Go to My Dashboard
            </Link>
          )}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/15 text-slate-300 hover:bg-white/5 text-xs font-semibold"
          >
            <Home className="h-3.5 w-3.5" />
            Public Home
          </Link>
          {user && (
            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-semibold cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AccessDeniedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#070d18] text-slate-400 text-sm">
          Loading…
        </div>
      }
    >
      <AccessDeniedContent />
    </Suspense>
  );
}
