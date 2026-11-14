import type { Metadata } from 'next';
import OrganizationShell from '@/components/organization/OrganizationShell';
import './organization.css';

export const metadata: Metadata = {
  title: 'Organization Admin — SwiftDrop',
  description: 'Head Office branch directory and organization management for SwiftDrop.',
};

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OrganizationShell>{children}</OrganizationShell>;
}

