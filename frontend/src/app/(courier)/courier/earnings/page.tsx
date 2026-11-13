import type { Metadata } from 'next';
import Earnings from '@/components/courier/earnings/Earnings';

export const metadata: Metadata = { title: 'Earnings' };

/** Member 08: Earnings — /courier/earnings */
export default function Page() {
  return <Earnings />;
}
