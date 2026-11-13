import type { Metadata } from 'next';
import MyDeliveries from '@/components/courier/deliveries/MyDeliveries';

export const metadata: Metadata = { title: 'My Deliveries' };

/** Member 08: My Deliveries — /courier/deliveries */
export default function Page() {
  return <MyDeliveries />;
}
