import { Suspense } from 'react';
import CourierAssignmentView from '@/components/organization/console/CourierAssignmentView';

export default function BranchCourierAssignmentPage() {
  return (
    <Suspense
      fallback={
        <div className="org-page org-console-page" aria-busy="true">
          <div className="org-skeleton org-skeleton--lg" />
        </div>
      }
    >
      <CourierAssignmentView />
    </Suspense>
  );
}

