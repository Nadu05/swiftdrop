import type { Metadata } from 'next';
import MerchantShell from '@/components/merchant/MerchantShell';

export const metadata: Metadata = {
  title: 'Merchant Portal — SwiftDrop',
  description: 'Merchant partner dashboard, order dispatch, pickup locations, and OAuth API access.',
};

/** Unified frame for Merchant pages matching the Dispatcher, Courier, Organization & Customer portals. */
export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MerchantShell>{children}</MerchantShell>;
}
