import type { Metadata } from 'next';
import CourierDashboard from '@/components/courier/dashboard/CourierDashboard';

export const metadata: Metadata = { title: 'Dashboard' };

/** Member 08: Courier Dashboard — /courier */
export default function CourierDashboardPage() {
  return <CourierDashboard />;
}
