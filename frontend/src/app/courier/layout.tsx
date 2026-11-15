import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { CourierGuard } from '@/components/auth/RoleGuard';
import CourierSidebar, { CourierBottomNav } from '@/components/courier/CourierSidebar';
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar';
import './courier-portal.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'Courier Portal — SwiftDrop',
};

/**
 * Courier portal frame (SwiftDrop light theme): navy sidebar on desktop, bottom tab bar on mobile,
 * light top bar with breadcrumbs, and the page content.
 */
export default function CourierLayout({ children }: { children: React.ReactNode }) {
  return (
    <CourierGuard>
      <div className={`cp sd-theme-light ${inter.variable}`}>
        <CourierSidebar />
        <div className="cp-main">
          <DashboardTopBar portalLabel="Courier Portal" theme="light" />
          <main className="cp-content">{children}</main>
        </div>
        <CourierBottomNav />
      </div>
    </CourierGuard>
  );
}
