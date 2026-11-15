import CustomerShell from '@/components/CustomerShell';
import '@/app/customer/customer.css';

export default function TrackingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerShell>{children}</CustomerShell>;
}

