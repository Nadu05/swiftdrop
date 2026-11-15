import CustomerShell from '@/components/CustomerShell';
import '@/app/customer/customer.css';

export default function BookingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerShell>{children}</CustomerShell>;
}

