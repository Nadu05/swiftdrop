'use client';

import CustomerShell from '@/components/CustomerShell';
import { CustomerGuard } from '@/components/auth/RoleGuard';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CustomerGuard>
      <CustomerShell>{children}</CustomerShell>
    </CustomerGuard>
  );
}
