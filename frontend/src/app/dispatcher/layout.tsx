import type { Metadata } from 'next';
import DispatcherShell from '@/components/dispatcher/DispatcherShell';

export const metadata: Metadata = {
  title: 'Dispatch Management — SwiftDrop',
};

export default function DispatcherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DispatcherShell>{children}</DispatcherShell>;
}

