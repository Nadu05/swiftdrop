import type { Metadata } from 'next';
import { Suspense } from 'react';
import BranchAnalyticsView from '@/components/organization/analytics/BranchAnalyticsView';

export const metadata: Metadata = {
  title: 'Branch Reports & Analytics — SwiftDrop Head Office',
  description:
    'Comparative operational throughput, delivery completion rates, and regional turnaround metrics across SwiftDrop Sri Lanka hubs.',
};

export default function OrganizationReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="org-page" aria-busy="true">
          <div className="org-skeleton org-skeleton--lg" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div className="org-skeleton-card" />
            <div className="org-skeleton-card" />
            <div className="org-skeleton-card" />
            <div className="org-skeleton-card" />
          </div>
        </div>
      }
    >
      <BranchAnalyticsView />
    </Suspense>
  );
}

