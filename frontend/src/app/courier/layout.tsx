import type { Metadata } from 'next';
import { CourierGuard } from '@/components/auth/RoleGuard';
import CourierSidebar from '@/components/courier/CourierSidebar';

export const metadata: Metadata = {
  title: 'Courier Portal — SwiftDrop',
};

/** Same frame as the platform pages: dark sidebar + main content area. */
export default function CourierLayout({ children }: { children: React.ReactNode }) {
  return (
    <CourierGuard>
      <div className="app-container">
        <CourierSidebar />
        <main className="main-content">{children}</main>
      </div>
    </CourierGuard>
  );
}
