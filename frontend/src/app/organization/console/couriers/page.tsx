import { Suspense } from 'react';
import CourierRosterView from '@/components/organization/console/CourierRosterView';

export default function BranchCourierRosterPage() {
  return (
    <Suspense
      fallback={
        <div className="org-page org-console-page" aria-busy="true">
          <div className="org-skeleton org-skeleton--lg" />
        </div>
      }
    >
      <CourierRosterView />
    </Suspense>
  );
}

