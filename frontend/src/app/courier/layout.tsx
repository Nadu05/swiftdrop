import type { Metadata } from 'next';
import CourierShell from '@/components/courier/CourierShell';

export const metadata: Metadata = {
  title: 'Courier Operations Portal — SwiftDrop',
};

/** Unified frame for Courier pages matching the platform & dispatcher portals. */
export default function CourierLayout({ children }: { children: React.ReactNode }) {
  return <CourierShell>{children}</CourierShell>;
}
