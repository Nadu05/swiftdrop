import type { Metadata } from 'next';
import OrganizationDashboard from '@/components/organization/dashboard/OrganizationDashboard';

export const metadata: Metadata = {
  title: 'Organization Admin Dashboard — SwiftDrop Head Office',
  description:
    'Head Office operations dashboard for organization branches, operational status, and service-area coverage.',
};

/**
 * Phase 4: Organization Admin Dashboard (/organization).
 */
export default function OrganizationIndexPage() {
  return <OrganizationDashboard />;
}
