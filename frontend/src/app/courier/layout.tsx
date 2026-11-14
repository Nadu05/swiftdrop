import type { Metadata } from 'next';
import { CourierGuard } from '@/components/auth/RoleGuard';
import CourierSidebar from '@/components/courier/CourierSidebar';
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar';

export const metadata: Metadata = {
  title: 'Courier Portal — SwiftDrop',
};

/** Same frame as the platform pages: dark sidebar + top navigation bar + main content area. */
export default function CourierLayout({ children }: { children: React.ReactNode }) {
  return (
    <CourierGuard>
      <div className="app-container">
        <CourierSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardTopBar portalLabel="Courier Field Portal" theme="dark" />
          <main className="main-content flex-1">{children}</main>
        </div>
      </div>
    </CourierGuard>
  );
}
