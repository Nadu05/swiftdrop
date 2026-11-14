import type { Metadata } from 'next';
import CourierProviders from '@/components/courier/CourierProviders';
import CourierSidebar from '@/components/courier/CourierSidebar';
import './courier.css';

export const metadata: Metadata = {
  title: {
    default: 'Courier Portal — SwiftDrop',
    template: '%s — SwiftDrop Courier',
  },
};

/** Server layout: platform frame (app-container + sidebar) and the Query provider. */
export default function CourierLayout({ children }: { children: React.ReactNode }) {
  return (
    <CourierProviders>
      <div className="app-container">
        <CourierSidebar />
        <main className="main-content">{children}</main>
      </div>
    </CourierProviders>
  );
}
