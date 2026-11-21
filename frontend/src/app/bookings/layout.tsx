import CustomerShell from '@/components/CustomerShell';

export default function BookingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerShell>{children}</CustomerShell>;
}

