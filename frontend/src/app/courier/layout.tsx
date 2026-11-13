import type { Metadata } from 'next';
import CourierSidebar from '@/components/courier/CourierSidebar';

export const metadata: Metadata = {
  title: 'Courier Portal — SwiftDrop',
};

/** Same frame as the platform pages: dark sidebar + main content area. */
export default function CourierLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-container">
      <CourierSidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}
