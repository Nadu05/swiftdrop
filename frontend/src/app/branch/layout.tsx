'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Truck,
  ArrowLeftRight,
  Package,
  Compass,
  User,
  Users,
  LogOut,
  ShieldCheck,
  X,
} from 'lucide-react';
import { BranchGuard } from '@/components/auth/RoleGuard';
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/api/use-auth';

const branchNavItems = [
  { name: 'Branch Dashboard', href: '/branch/dashboard', icon: LayoutDashboard },
  { name: 'Workforce Management', href: '/branch/workforce', icon: Users },
  { name: 'Inter-Branch Transfers', href: '/dispatcher/transfers', icon: ArrowLeftRight },
  { name: 'Parcel Requests & Drop-off', href: '/dispatcher/requests', icon: Package },
  { name: 'Branch Courier Fleet', href: '/dispatcher/couriers', icon: Truck },
  { name: 'Branch Directory', href: '/organization/branches', icon: Building2 },
  { name: 'Track Parcel', href: '/tracking', icon: Compass },
  { name: 'My Profile', href: '/profile', icon: User },
];

export default function BranchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '';
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <aside className="w-64 min-w-[256px] bg-[#0b1528] border-r border-cyan-500/20 flex flex-col justify-between p-5 min-h-screen">
      <div>
        <div className="flex items-center justify-between px-2 pb-6 border-b border-white/10">
          <Link href="/branch/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-600/30">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-extrabold text-white tracking-tight">
                Swift<span className="text-cyan-400">Drop</span>
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                Branch Admin
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-6 flex flex-col gap-1.5">
          {branchNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/branch/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-600/20 text-white font-semibold border-l-3 border-cyan-400'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? 'text-cyan-400' : 'text-slate-400'
                  }`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-white/10 space-y-3">
        {user && (
          <div className="p-3 rounded-xl bg-slate-900/80 border border-cyan-500/20">
            <div className="text-xs font-bold text-white truncate">{user.fullName}</div>
            <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
            <div className="mt-2 flex items-center justify-between gap-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 text-[10px] font-semibold">
                <ShieldCheck className="h-3 w-3" />
                {user.roles?.[0] || 'BRANCH_ADMIN'}
              </span>
              {user.branchId && (
                <span className="text-[10px] font-mono text-slate-400">
                  Hub #{user.branchId}
                </span>
              )}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-semibold cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>{logoutMutation.isPending ? 'Signing out…' : 'Sign Out'}</span>
        </button>
      </div>
    </aside>
  );

  return (
    <BranchGuard>
      <div className="min-h-screen flex bg-[#070d18] text-slate-100">
        <div className="hidden lg:block">{sidebarContent}</div>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative z-10">{sidebarContent}</div>
          </div>
        )}
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardTopBar
            portalLabel="Branch Administration"
            theme="dark"
            onMobileMenuToggle={() => setMobileOpen((v) => !v)}
          />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </BranchGuard>
  );
}
