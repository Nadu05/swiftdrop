import { Suspense } from 'react';
import DeliveryRequestQueue from '@/components/organization/console/DeliveryRequestQueue';

export default function BranchDeliveryRequestQueuePage() {
  return (
    <Suspense
      fallback={
        <div className="org-page org-console-page" aria-busy="true">
          <div className="org-skeleton org-skeleton--lg" />
        </div>
      }
    >
      <DeliveryRequestQueue />
    </Suspense>
  );
}

