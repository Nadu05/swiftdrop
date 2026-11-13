import CustomerShell from '@/components/CustomerShell';

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerShell>{children}</CustomerShell>;
}

