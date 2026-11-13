import CustomerShell from '@/components/CustomerShell';

export default function TrackingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerShell>{children}</CustomerShell>;
}

