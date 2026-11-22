'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  Truck,
  Store,
  Users,
  Building2,
  UserCheck,
  ChartColumn,
  Activity,
  Settings,
  LogOut,
  ShieldCheck,
  X,
  Terminal,
} from 'lucide-react';
import { AdminGuard } from '@/components/auth/RoleGuard';
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/api/use-auth';
import { normalizeRoleName, resolvePrimaryRole, ROLE_LABELS } from '@/lib/auth/role-resolver';

type AdminNavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
};

type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

const adminNavSections: AdminNavSection[] = [
  {
    label: 'OVERVIEW',
    items: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { name: 'Orders Management', href: '/organization/orders', icon: ClipboardList },
      { name: 'Dispatch Management', href: '/dispatcher/dashboard', icon: Truck },
      { name: 'Merchant Management', href: '/organization/merchants', icon: Store },
      { name: 'Branch Management', href: '/organization/branches', icon: Building2 },
      { name: 'Courier Management', href: '/organization/couriers', icon: UserCheck },
      { name: 'Customer Management', href: '/customers', icon: Users },
    ],
  },
  {
    label: 'GOVERNANCE & SYSTEM',
    items: [
      { name: 'Staff Management', href: '/organization/staff', icon: ShieldCheck },
      { name: 'Reports & Analytics', href: '/organization/reports', icon: ChartColumn },
      { name: 'Service Health', href: '/health', icon: Activity },
      { name: 'API Diagnostics', href: '/api-tester', icon: Terminal },
      { name: 'Settings', href: '/settings/account', icon: Settings },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '';
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const logoutMutation = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);

  const primaryRole = resolvePrimaryRole(user, activeRole);
  const userRoles = (user?.roles || []).map(normalizeRoleName);

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') return pathname === '/admin/dashboard' || pathname === '/admin';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const sidebarContent = (
    <aside className="w-64 min-w-[256px] bg-[#0b1329] border-r border-blue-500/20 flex flex-col justify-between p-5 min-h-screen">
      <div>
        {/* Brand */}
        <div className="flex items-center justify-between px-2 pb-6 border-b border-white/10">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-extrabold text-white tracking-tight">
                Swift<span className="text-sky-400">Drop</span>
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-sky-400">
                Admin Portal
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

        {/* Navigation Sections */}
        <nav className="mt-5 flex flex-col gap-5" aria-label="Admin navigation">
          {adminNavSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1.5 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                {section.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? 'bg-blue-600/20 text-white font-semibold border-l-[3px] border-sky-400 pl-[11px]'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${
                          active ? 'text-sky-400' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom: Admin identity + Sign out */}
      <div className="pt-4 border-t border-white/10 space-y-3">
        {user && (
          <div className="p-3 rounded-xl bg-slate-900/80 border border-blue-500/20">
            <div className="text-xs font-bold text-white truncate">{user.fullName}</div>
            <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {userRoles.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/15 text-sky-300 text-[10px] font-semibold"
                >
                  <ShieldCheck className="h-3 w-3" />
                  {ROLE_LABELS[r] || r}
                </span>
              ))}
            </div>
            {primaryRole && (
              <div className="mt-1.5 text-[10px] text-slate-500 font-mono">
                Active: {primaryRole}
              </div>
            )}
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
    <AdminGuard>
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
            portalLabel="Admin Portal"
            theme="dark"
            onMobileMenuToggle={() => setMobileOpen((v) => !v)}
          />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
