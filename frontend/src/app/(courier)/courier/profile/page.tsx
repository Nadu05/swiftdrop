import type { Metadata } from 'next';
import CourierProfileView from '@/components/courier/profile/CourierProfileView';

export const metadata: Metadata = { title: 'My Profile' };

/** Member 08: My Profile — /courier/profile */
export default function Page() {
  return <CourierProfileView />;
}
