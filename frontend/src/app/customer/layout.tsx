import CustomerShell from '@/components/CustomerShell';
import './customer.css';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerShell>{children}</CustomerShell>;
}

