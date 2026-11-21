'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar';

/**
 * Layout for `(platform)` route group.
 * - For `/` (Public Landing Page), renders `{children}` full-bleed without the internal sidebar.
 * - For internal platform/admin/account routes (`/admin/**`, `/health`, `/api-tester`, `/customers`, `/profile`, `/settings/**`),
 *   renders the responsive Sidebar + DashboardTopBar + main workspace.
 */
export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (pathname === '/') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-[#070d18] text-slate-100">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardTopBar
          portalLabel="System Administration"
          theme="dark"
          onMobileMenuToggle={() => setMobileMenuOpen((v) => !v)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
